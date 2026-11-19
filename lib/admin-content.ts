// =============================================================================
// Admin content uploads (11-19-26) — the queries behind /admin/content, where
// an admin loads a newsletter or a podcast episode without a loader script.
// SERVER-SIDE ONLY. Callers check users.role = 'admin' first.
//
// What the loaders did by hand, this does per save: the row, its `fgi`
// allow-list row (visibility is an allow-list — a row with none is invisible),
// a course_code, the guest in `presenters`, and the companion pins in
// `related_resources` (both directions).
//
// Every statement is scoped to type IN ('newsletter','podcast'): this page
// must never be a way to edit a course or a webinar.
// =============================================================================
import { sql } from '@/lib/db';
import { getPresignedUrl } from '@/lib/s3';
import {
  type ContentItem, type ContentListRow, type ContentSaveInput, type ContentType,
  type GuestInput, type PinOption,
} from '@/lib/admin-content-shared';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

const day = (v: unknown): string => (v ? new Date(v as string).toISOString().slice(0, 10) : '');

export async function listContent(): Promise<ContentListRow[]> {
  const rows = await sql`
    SELECT id, type::text AS type, slug, title, published, internal, published_at,
           course_code, s3_key IS NOT NULL AS has_file
    FROM resources
    WHERE type IN ('newsletter', 'podcast')
    ORDER BY published ASC, published_at DESC NULLS LAST, id DESC
  `;
  return rows.map((r: any) => ({
    id: r.id, type: r.type, slug: r.slug, title: r.title, published: r.published,
    internal: r.internal, published_date: day(r.published_at),
    course_code: r.course_code, has_file: r.has_file,
  }));
}

/** Row + its storage key. The key stays server-side — see getContentItem. */
export async function getContentRow(id: string) {
  if (!isUuid(id)) return null;
  const rows = await sql`
    SELECT id, type::text AS type, slug, title, description, duration_minutes,
           audience_tags, topic_tags, search_keywords, internal, published,
           published_at, course_code, s3_key, updated_at
    FROM resources
    WHERE id = ${id} AND type IN ('newsletter', 'podcast')
  `;
  return (rows[0] as any) ?? null;
}

export async function getContentItem(id: string): Promise<ContentItem | null> {
  const r = await getContentRow(id);
  if (!r) return null;
  let file_url: string | null = null;
  if (r.s3_key) {
    try { file_url = await getPresignedUrl(r.s3_key); } catch (e) { console.error('Presigned URL error:', e); }
  }
  return {
    id: r.id, type: r.type, slug: r.slug, title: r.title, description: r.description ?? '',
    duration_minutes: r.duration_minutes, audience_tags: r.audience_tags ?? [],
    topic_tags: r.topic_tags ?? [], search_keywords: r.search_keywords ?? [],
    internal: r.internal, published: r.published, published_date: day(r.published_at),
    course_code: r.course_code, has_file: Boolean(r.s3_key), file_url,
    updated_at: new Date(r.updated_at).toISOString(),
  };
}

/** Site-wide resource ID: two letters + four digits, unique (docs §6at). */
async function newCourseCode(): Promise<string> {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < 50; i++) {
    const code = letters[Math.floor(Math.random() * 26)] +
      letters[Math.floor(Math.random() * 26)] +
      String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const hit = await sql`SELECT 1 FROM resources WHERE course_code = ${code}`;
    if (!hit[0]) return code;
  }
  throw new Error('could not find a free course_code');
}

/**
 * A new unpublished row. Returns the existing row's id instead when the slug
 * is taken, so the caller can send the admin to the item that is already
 * there rather than making a second one.
 */
export async function createDraft(
  input: { type: ContentType; slug: string; title: string },
): Promise<{ id: string; created: boolean }> {
  const existing = await sql`SELECT id FROM resources WHERE slug = ${input.slug}`;
  if (existing[0]) return { id: existing[0].id as string, created: false };

  const code = await newCourseCode();
  const rows = await sql`
    INSERT INTO resources (title, slug, type, description, topic_tags, audience_tags,
                           published, published_at, course_code)
    VALUES (${input.title}, ${input.slug}, ${input.type}, '', ${[]}, ${[]},
            FALSE, now(), ${code})
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `;
  if (!rows[0]) {
    const again = await sql`SELECT id FROM resources WHERE slug = ${input.slug}`;
    return { id: again[0].id as string, created: false };
  }
  const id = rows[0].id as string;
  await sql`INSERT INTO resource_visibility (resource_id, tenant_id)
            SELECT ${id}, id FROM tenants WHERE slug = 'fgi'
            ON CONFLICT DO NOTHING`;
  return { id, created: true };
}

export async function saveContent(id: string, input: ContentSaveInput): Promise<void> {
  // published_at keeps its time of day unless the date itself changes — the
  // library sorts on it, and two items sharing a date would otherwise reorder
  // every time one of them is saved.
  await sql`
    UPDATE resources SET
      title = ${input.title},
      description = ${input.description},
      duration_minutes = ${input.duration_minutes},
      audience_tags = ${input.audience_tags},
      topic_tags = ${input.topic_tags},
      search_keywords = ${input.search_keywords},
      internal = ${input.internal},
      published_at = CASE
        WHEN (published_at AT TIME ZONE 'UTC')::date = ${input.published_date}::date THEN published_at
        ELSE ${input.published_date}::date::timestamptz END,
      updated_at = now()
    WHERE id = ${id} AND type IN ('newsletter', 'podcast')
  `;
  await savePins(id, input.pins);
  if (input.guest !== undefined) await saveGuest(id, input.guest);
}

export async function setPublished(id: string, published: boolean): Promise<void> {
  await sql`
    UPDATE resources SET published = ${published}, updated_at = now()
    WHERE id = ${id} AND type IN ('newsletter', 'podcast')
  `;
}

export async function setFileKey(id: string, s3Key: string): Promise<void> {
  await sql`
    UPDATE resources SET s3_key = ${s3Key}, updated_at = now()
    WHERE id = ${id} AND type IN ('newsletter', 'podcast')
  `;
}

// -----------------------------------------------------------------------------
// Companion pins — related_resources. A webinar and its same-month newsletter
// point at each other, so every pin is written and removed in both directions.
// -----------------------------------------------------------------------------

export async function getPins(id: string): Promise<string[]> {
  const rows = await sql`SELECT related_id FROM related_resources WHERE resource_id = ${id}`;
  return rows.map((r: any) => r.related_id as string);
}

/** What can be pinned: the last year or so of the three monthly series, plus
    whatever is pinned already (so an older pin can still be seen and removed). */
export async function getPinOptions(id: string): Promise<PinOption[]> {
  const rows = await sql`
    SELECT id, type::text AS type, title, published, published_at FROM (
      SELECT r.*, row_number() OVER (PARTITION BY r.type ORDER BY r.published_at DESC NULLS LAST) AS n
      FROM resources r
      WHERE r.type IN ('webinar', 'newsletter', 'podcast') AND r.id <> ${id}
    ) ranked
    WHERE n <= 14 OR id IN (SELECT related_id FROM related_resources WHERE resource_id = ${id})
    ORDER BY type, published_at DESC NULLS LAST
  `;
  return rows.map((r: any) => ({
    id: r.id, type: r.type, title: r.title, published: r.published,
    published_date: day(r.published_at),
  }));
}

async function savePins(id: string, wanted: string[]): Promise<void> {
  const want = new Set(wanted.filter((p) => isUuid(p) && p !== id));
  const have = new Set(await getPins(id));
  for (const other of have) {
    if (want.has(other)) continue;
    await sql`DELETE FROM related_resources
              WHERE (resource_id = ${id} AND related_id = ${other})
                 OR (resource_id = ${other} AND related_id = ${id})`;
  }
  for (const other of want) {
    if (have.has(other)) continue;
    // The SELECT drops an id that is not a real resource instead of failing
    // the whole save on the foreign key.
    await sql`INSERT INTO related_resources (resource_id, related_id, position)
              SELECT a.id, b.id, 0 FROM resources a, resources b
              WHERE (a.id = ${id} AND b.id = ${other}) OR (a.id = ${other} AND b.id = ${id})
              ON CONFLICT DO NOTHING`;
  }
}

// -----------------------------------------------------------------------------
// Podcast guest — the `presenters` table the webinars also use. One row per
// person: editing a guest here edits them on every page they appear on.
// -----------------------------------------------------------------------------

export interface PresenterRow {
  id: string;
  name: string;
  credentials: string | null;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  org_name: string | null;
  org_logo_url: string | null;
  org_url: string | null;
}

export async function listPresenters(): Promise<PresenterRow[]> {
  const rows = await sql`
    SELECT id, name, credentials, title, bio, photo_url, org_name, org_logo_url, org_url
    FROM presenters ORDER BY name
  `;
  return rows as PresenterRow[];
}

export async function getGuestId(resourceId: string): Promise<string | null> {
  const rows = await sql`
    SELECT presenter_id FROM resource_presenters
    WHERE resource_id = ${resourceId} ORDER BY sort_order LIMIT 1
  `;
  return (rows[0]?.presenter_id as string) ?? null;
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

async function saveGuest(resourceId: string, guest: GuestInput | null): Promise<void> {
  if (!guest) {
    await sql`DELETE FROM resource_presenters WHERE resource_id = ${resourceId}`;
    return;
  }
  let presenterId: string | null = isUuid(guest.id) ? guest.id : null;
  if (!presenterId) {
    // Same rule as the loader: a repeat guest keeps one row, matched by name.
    const match = await sql`SELECT id FROM presenters WHERE lower(name) = lower(${guest.name.trim()}) LIMIT 1`;
    presenterId = (match[0]?.id as string) ?? null;
  }
  if (presenterId) {
    await sql`
      UPDATE presenters SET
        name = ${guest.name.trim()}, credentials = ${orNull(guest.credentials)},
        title = ${orNull(guest.title)}, bio = ${orNull(guest.bio)},
        photo_url = ${orNull(guest.photo_url)}, org_name = ${orNull(guest.org_name)},
        org_logo_url = ${orNull(guest.org_logo_url)}, org_url = ${orNull(guest.org_url)},
        updated_at = now()
      WHERE id = ${presenterId}`;
  } else {
    const rows = await sql`
      INSERT INTO presenters (name, credentials, title, bio, photo_url,
                              org_name, org_logo_url, org_url)
      VALUES (${guest.name.trim()}, ${orNull(guest.credentials)}, ${orNull(guest.title)},
              ${orNull(guest.bio)}, ${orNull(guest.photo_url)}, ${orNull(guest.org_name)},
              ${orNull(guest.org_logo_url)}, ${orNull(guest.org_url)})
      RETURNING id`;
    presenterId = rows[0].id as string;
  }
  await sql`DELETE FROM resource_presenters
            WHERE resource_id = ${resourceId} AND presenter_id <> ${presenterId}`;
  await sql`INSERT INTO resource_presenters (resource_id, presenter_id, sort_order)
            VALUES (${resourceId}, ${presenterId}, 1)
            ON CONFLICT DO NOTHING`;
}
