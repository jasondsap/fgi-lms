// =============================================================================
// Resource query helpers — parameterized for safety against SQL injection
// =============================================================================
// All user-supplied values flow through parameter binding ($1, $2, ...). The
// only strings ever interpolated into SQL text are:
//   • column/clause fragments built from a hardcoded whitelist (the duration map)
//   • placeholder tokens generated from values.length (purely numeric)
// Never user input.
// =============================================================================

import { sql } from './db';
import { getPresignedUrl, getPresignedDownloadUrl } from './s3';
import type {
  Presenter, Resource, ResourceListParams, ResourceListResponse, ResourceMaterial, ResourceType,
} from '@/types';

// Whitelist of duration keys → SQL fragments. Lookup is by key only;
// fragments are static and never derived from user input.
const DURATION_CLAUSES: Record<string, string> = {
  under_15:   'duration_minutes < 15',
  '16_30':    'duration_minutes BETWEEN 16 AND 30',
  '31_60':    'duration_minutes BETWEEN 31 AND 60',
  '61_90':    'duration_minutes BETWEEN 61 AND 90',
  '91_120':   'duration_minutes BETWEEN 91 AND 120',
  '121_plus': 'duration_minutes > 120',
};

/**
 * Shuffle seed for the stratified default view. Constant for a UTC day, so
 * paging stays consistent within a visit but the mix rotates day to day.
 * (A visit spanning UTC midnight could see one repeated card on Load More —
 * acceptable versus threading a session seed through every caller.)
 */
function dailySeed(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getPublicResources(
  params: ResourceListParams
): Promise<ResourceListResponse> {
  const {
    duration, search, tenant,
    page = 1, per_page = 12, match = 'any',
  } = params;

  const offset = (page - 1) * per_page;
  // The sidebar's Resource Type group is multi-select, so `type` arrives as an
  // array whenever more than one box is ticked.
  const typeArr = params.type
    ? (Array.isArray(params.type) ? params.type : [params.type]) : [];
  const audienceArr = params.audience
    ? (Array.isArray(params.audience) ? params.audience : [params.audience]) : [];
  const topicArr = params.topic
    ? (Array.isArray(params.topic) ? params.topic : [params.topic]) : [];

  // Build conditions and matching parameter array in lockstep.
  const conditions: string[] = ['published = TRUE'];
  const values: unknown[] = [];

  // Helper: pushes a value, returns its placeholder ("$1", "$2", ...)
  const bind = (v: unknown): string => {
    values.push(v);
    return `$${values.length}`;
  };

  if (typeArr.length > 0) {
    // A resource has exactly one type, so multiple selections are always OR —
    // the any/all "Match Categories" toggle applies to audience and topic only.
    // Cast to text because the column is the resource_type enum.
    conditions.push(`type::text = ANY(${bind(typeArr)}::text[])`);
  }

  if (search) {
    const ph = bind(`%${search}%`);
    conditions.push(`(title ILIKE ${ph} OR description ILIKE ${ph})`);
  }

  if (duration && DURATION_CLAUSES[duration]) {
    // Whitelist lookup — fragment is a constant, no binding needed.
    conditions.push(DURATION_CLAUSES[duration]);
  }

  if (audienceArr.length > 0) {
    const ph = bind(audienceArr);
    conditions.push(match === 'all'
      ? `audience_tags @> ${ph}::text[]`
      : `audience_tags && ${ph}::text[]`);
  }

  if (topicArr.length > 0) {
    const ph = bind(topicArr);
    conditions.push(match === 'all'
      ? `topic_tags @> ${ph}::text[]`
      : `topic_tags && ${ph}::text[]`);
  }

  // Allow-list visibility model. Every surface — the FGI main site and each
  // tenant portal — is an explicit membership: a resource appears on a surface
  // only if it has a resource_visibility row for that surface's tenant. The
  // main site is the 'fgi' surface; tenant pages use their own slug. A resource
  // shared across surfaces simply has a row per surface.
  const surface = tenant || 'fgi';
  {
    const ph = bind(surface);
    conditions.push(`EXISTS (
      SELECT 1 FROM resource_visibility rv
      JOIN tenants t ON t.id = rv.tenant_id
      WHERE rv.resource_id = resources.id AND t.slug = ${ph}
    )`);
  }

  // A visitor who hasn't searched or ticked a filter gets the stratified view;
  // anyone who has expressed intent gets newest-first, which is what they want.
  // `tenant` is the surface, not a user filter, so it doesn't count here.
  const isDefaultView = typeArr.length === 0 && !search && !duration
    && audienceArr.length === 0 && topicArr.length === 0;

  const seedPh   = isDefaultView ? bind(dailySeed()) : null;
  const limitPh  = bind(per_page);
  const offsetPh = bind(offset);

  const where = conditions.join(' AND ');
  const COLUMNS = `
      id, title, slug, type, description, duration_minutes,
      thumbnail_url, vimeo_id, external_url,
      is_naadac_ce, audience_tags, topic_tags, published_at`;

  // Default view: round-robin across types so the first screen is a sample of
  // the whole library rather than whatever was bulk-loaded most recently.
  //
  // ROW_NUMBER() partitioned by type gives each resource its position within its
  // own type; ordering by that number first interleaves the types — every type's
  // 1st item, then every type's 2nd, and so on. Types run out at different
  // points and simply drop out of the rotation.
  //
  // Deliberately not `ORDER BY random()`: "Load More" appends, so a fresh
  // shuffle per request would repeat and skip items across pages. The seed is
  // stable for a day, which keeps paging consistent while still rotating what
  // greets a returning visitor.
  const query = isDefaultView
    ? `
    SELECT ${COLUMNS}, total_count
    FROM (
      SELECT ${COLUMNS},
        COUNT(*) OVER() AS total_count,
        ROW_NUMBER() OVER (PARTITION BY type ORDER BY md5(id::text || ${seedPh})) AS type_rank,
        md5(id::text || ${seedPh}) AS shuffle
      FROM resources
      WHERE ${where}
    ) ranked
    ORDER BY type_rank, shuffle
    LIMIT ${limitPh} OFFSET ${offsetPh}
  `
    : `
    SELECT ${COLUMNS},
      COUNT(*) OVER() AS total_count
    FROM resources
    WHERE ${where}
    ORDER BY published_at DESC NULLS LAST, id DESC
    LIMIT ${limitPh} OFFSET ${offsetPh}
  `;

  // Neon's sql() supports a function-call form: sql(query, params).
  // Values bind to $1, $2, ... in the order they were pushed.
  const rows = await sql(query, values);
  const total = rows.length > 0 ? Number((rows[0] as any).total_count) : 0;

  return {
    resources: rows as unknown as Resource[],
    total, page, per_page,
    total_pages: Math.ceil(total / per_page),
  };
}

/**
 * "You might also be interested in" — the most recent other webinars visible on
 * the same surface. Deliberately not tag-based: topic_tags are populated on
 * only a handful of rows, so a tag match would return noise rather than
 * neighbours. Revisit once tagging is backfilled.
 */
export async function getRelatedWebinars(
  excludeId: string, tenantSlug: string, limit = 3,
): Promise<Resource[]> {
  const rows = await sql`
    SELECT r.id, r.title, r.slug, r.type, r.description, r.duration_minutes,
           r.thumbnail_url, r.vimeo_id, r.external_url,
           r.is_naadac_ce, r.audience_tags, r.topic_tags, r.published_at
    FROM resources r
    WHERE r.type = 'webinar'
      AND r.published = TRUE
      AND r.id <> ${excludeId}
      AND EXISTS (
        SELECT 1 FROM resource_visibility rv
        JOIN tenants t ON t.id = rv.tenant_id
        WHERE rv.resource_id = r.id AND t.slug = ${tenantSlug}
      )
    ORDER BY r.published_at DESC NULLS LAST, r.id DESC
    LIMIT ${limit}
  `;
  return rows as unknown as Resource[];
}

/**
 * The newest published webinar on the FGI surface — what the "FGI's Latest
 * Webinar" tile points at on the homepage and on both tenant landing pages.
 *
 * Derived rather than hardcoded so the tile keeps matching its own label as new
 * webinars land. Note this makes the tile sensitive to `published_at`: a wrong
 * date in a source info sheet would promote the wrong webinar here (one such
 * typo was found and fixed during the July 2026 webinar load).
 */
export interface LatestItem { slug: string; title: string }

/*
 * Newest published resource of one type on the FGI surface — drives the
 * homepage "Latest Highlights" tiles. Returns null when the catalog holds
 * nothing of that type yet (podcasts, as of 8-11-26), so callers can decide
 * whether to hide the tile or fall back.
 */
export async function getLatestByType(type: ResourceType): Promise<LatestItem | null> {
  const rows = await sql(
    `SELECT r.slug, r.title
       FROM resources r
      WHERE r.type = $1
        AND r.published = TRUE
        AND EXISTS (
          SELECT 1 FROM resource_visibility rv
          JOIN tenants t ON t.id = rv.tenant_id
          WHERE rv.resource_id = r.id AND t.slug = 'fgi'
        )
      ORDER BY r.published_at DESC NULLS LAST, r.id DESC
      LIMIT 1`,
    [type],
  );
  return (rows[0] as LatestItem) ?? null;
}

export async function getLatestWebinar(): Promise<LatestItem | null> {
  return getLatestByType('webinar');
}

// Course-player lookup — includes moodle_course_id, which the public
// resource shape deliberately omits. Server-side use only.
export interface CourseResource {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  duration_minutes: number | null;
  moodle_course_id: number | null;
}

export async function getCourseResource(slug: string): Promise<CourseResource | null> {
  const rows = await sql`
    SELECT id, title, slug, type, description, duration_minutes, moodle_course_id
    FROM resources
    WHERE slug = ${slug} AND published = TRUE
    LIMIT 1
  `;
  return (rows[0] as CourseResource) ?? null;
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  // Tagged-template form — slug is bound as a parameter, not interpolated.
  const rows = await sql`
    SELECT id, title, slug, type, description, duration_minutes,
           thumbnail_url, vimeo_id, external_url,
           is_naadac_ce, audience_tags, topic_tags, published_at, s3_key,
           event_date, ceu_credits, course_code
    FROM resources
    WHERE slug = ${slug} AND published = TRUE
    LIMIT 1
  `;

  if (!rows[0]) return null;

  const resource = { ...rows[0] } as any;
  let download_url: string | undefined;
  let attachment_url: string | undefined;

  if (resource.s3_key) {
    try {
      // Two signings of the same object: one that renders inline (the embedded
      // viewer) and one that forces a save (the Download button). Signing is
      // local crypto, so the second costs nothing over the wire.
      const ext = resource.s3_key.split('.').pop() || 'pdf';
      [download_url, attachment_url] = await Promise.all([
        getPresignedUrl(resource.s3_key),
        getPresignedDownloadUrl(resource.s3_key, `${resource.slug}.${ext}`),
      ]);
    } catch (e) {
      console.error('Presigned URL error:', e);
    }
    delete resource.s3_key;
  }

  const [presenters, materials] = await Promise.all([
    getResourcePresenters(resource.id),
    getResourceMaterials(resource.id),
  ]);

  return { ...resource, download_url, attachment_url, presenters, materials } as Resource;
}

/** Presenters attached to a resource, in the order Jennifer listed them. */
async function getResourcePresenters(resourceId: string): Promise<Presenter[]> {
  const rows = await sql`
    SELECT p.id, p.name, p.credentials, p.title, p.bio,
           p.photo_url, p.org_name, p.org_logo_url, p.org_url
    FROM resource_presenters rp
    JOIN presenters p ON p.id = rp.presenter_id
    WHERE rp.resource_id = ${resourceId}
    ORDER BY rp.sort_order, p.name
  `;
  return rows as Presenter[];
}

/**
 * Transcripts, slide decks and handouts. Same S3 invariant as the resource
 * itself: the key is swapped for a presigned URL and never reaches the client.
 */
async function getResourceMaterials(resourceId: string): Promise<ResourceMaterial[]> {
  const rows = await sql`
    SELECT id, kind, label, s3_key
    FROM resource_materials
    WHERE resource_id = ${resourceId}
    ORDER BY sort_order, label
  `;

  const materials = await Promise.all(
    rows.map(async (row: any) => {
      const { s3_key, ...rest } = row;
      try {
        return { ...rest, download_url: await getPresignedUrl(s3_key) };
      } catch (e) {
        console.error('Presigned URL error:', e);
        return null;
      }
    }),
  );

  return materials.filter(Boolean) as ResourceMaterial[];
}
