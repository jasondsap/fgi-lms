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
    //
    // `naadac_ce` is a filter option, not a stored type: CE courses are
    // `course` rows with is_naadac_ce = TRUE. Fold it into the OR so the
    // "NAADAC CE" checkbox matches them (it matched nothing before 8-25).
    const wantsNaadac = typeArr.includes('naadac_ce' as ResourceType);
    const storedTypes = typeArr.filter((t) => t !== 'naadac_ce');
    const typeClauses: string[] = [];
    if (storedTypes.length > 0) typeClauses.push(`type::text = ANY(${bind(storedTypes)}::text[])`);
    if (wantsNaadac) typeClauses.push('is_naadac_ce = TRUE');
    conditions.push(`(${typeClauses.join(' OR ')})`);
  }

  if (search) {
    const ph = bind(`%${search}%`);
    conditions.push(`(title ILIKE ${ph} OR description ILIKE ${ph})`);
  }

  // Curated collection: an explicit slug list (tenant config), returned in
  // list order. The list is bound as one text[] parameter and reused for the
  // ORDER BY via array_position — no user input reaches the SQL text.
  const slugArr = params.slugs && params.slugs.length > 0 ? params.slugs : null;
  let collectionSort = '';
  if (slugArr) {
    const ph = bind(slugArr);
    conditions.push(`slug = ANY(${ph}::text[])`);
    collectionSort = `array_position(${ph}::text[], slug) ASC, `;
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
    && audienceArr.length === 0 && topicArr.length === 0 && !slugArr;

  // A video-only filter (the tenants' "Required Videos") is a certification
  // sequence, not a feed: the CORR/SCARR series must list Part 1 → 7, and all
  // fourteen parts share one bulk-load published_at, so newest-first would
  // return them in arbitrary id order. The part number is parsed off the
  // title; non-series videos sort after the parts. Hardcoded SQL fragment —
  // no user input reaches it (see the DURATION_CLAUSES rule).
  const videoSort = !isDefaultView && typeArr.length === 1 && typeArr[0] === 'video'
    ? `(substring(title from '^Part ([0-9]+)'))::int ASC NULLS LAST, title ASC, `
    : '';

  // Podcasts read as a series too: Trailer, then the Opening Episode, then
  // numbered episodes in order (Jason, 8-23). Same hardcoded-fragment rule as
  // videoSort — no user input reaches this string.
  const podcastSort = !isDefaultView && typeArr.length === 1 && typeArr[0] === 'podcast'
    ? `CASE WHEN title ILIKE 'Trailer:%' THEN 0
            WHEN title ILIKE 'Opening Episode%' THEN 1
            ELSE 2 END ASC,
       (substring(title from '^Episode ([0-9]+)'))::int ASC NULLS LAST, `
    : '';

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
    ORDER BY ${collectionSort}${videoSort}${podcastSort}published_at DESC NULLS LAST, id DESC
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
 * "You might also be interested in" for a non-webinar resource.
 *
 * Tag-driven matching is not an option here: `topic_tags` is populated on 8 of
 * the 130-odd non-webinar rows, so it would return nothing for almost every
 * page. What every row does have is a title and a description, so this ranks
 * the rest of the catalog by Postgres full-text relevance against them —
 * title terms weighted three times description terms, since a title overlap
 * ("Communicate in a Crisis" ↔ "Communication in a Crisis") is the far stronger
 * signal. Anything below MIN_SCORE is dropped rather than padded out with a
 * generic course, and a type cap keeps the 76-course block from filling the
 * whole list.
 *
 * Curated companions come first: `related_resources` pins hand-picked pairs
 * (each monthly webinar ↔ its same-month RCOE newsletter, seeded 8-16-26, both
 * directions). Pinned rows take the top slots, then relevance fills the rest.
 */
export interface RelatedItem { slug: string; title: string; type: ResourceType }

// Words carrying no matching signal. Postgres drops English stopwords itself;
// this list only has to keep them out of the tsquery we hand it.
const RELATED_STOPWORDS = new Set([
  'and', 'are', 'but', 'for', 'from', 'has', 'have', 'how', 'his', 'her', 'its',
  'into', 'not', 'our', 'she', 'that', 'the', 'their', 'them', 'they', 'this',
  'was', 'were', 'what', 'when', 'which', 'who', 'will', 'with', 'you', 'your',
]);

/** Title/description -> a safe `a | b | c` tsquery. Only [a-z0-9] survives. */
function toOrQuery(text: string, cap: number): string {
  const words = (text || '').toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? [];
  const seen = new Set<string>();
  for (const word of words) {
    if (!RELATED_STOPWORDS.has(word)) seen.add(word);
    if (seen.size >= cap) break;
  }
  return [...seen].join(' | ');
}

export async function getRelatedResources(
  resource: Pick<Resource, 'id' | 'title' | 'description'>,
  tenantSlug: string,
  limit = 3,
): Promise<RelatedItem[]> {
  // Hand-curated companions (e.g. a webinar's same-month newsletter) always
  // lead the list, subject to the same published + surface rules as everything
  // else on the page.
  const pinned = await sql`
    SELECT r.slug, r.title, r.type::text AS type
    FROM related_resources rr
    JOIN resources r ON r.id = rr.related_id
    WHERE rr.resource_id = ${resource.id}
      AND r.published = TRUE
      AND EXISTS (
        SELECT 1 FROM resource_visibility rv
        JOIN tenants t ON t.id = rv.tenant_id
        WHERE rv.resource_id = r.id AND t.slug = ${tenantSlug}
      )
    ORDER BY rr.position, r.published_at DESC NULLS LAST
    LIMIT ${limit}
  ` as unknown as RelatedItem[];
  if (pinned.length >= limit) return pinned.slice(0, limit);

  const titleQuery = toOrQuery(resource.title, 12);
  const bodyQuery  = toOrQuery(resource.description ?? '', 30);
  if (!titleQuery && !bodyQuery) return pinned;

  // A resource matching only one of the two queries still has to be scored
  // against both, so an empty query has to be a legal tsquery: '' is not, and
  // to_tsquery would throw on it. A term no document can contain scores zero.
  const NO_MATCH = 'zzzznomatch';

  // Weighted document vector, repeated in the score, the filter and the rank —
  // spelled once here so the three can't drift apart.
  const VECTOR = `(setweight(to_tsvector('english', r.title), 'A')
                   || setweight(to_tsvector('english', coalesce(r.description, '')), 'B'))`;

  const rows = await sql(
    `SELECT r.slug, r.title, r.type::text AS type,
            3 * ts_rank(${VECTOR}, to_tsquery('english', $1))
              + ts_rank(${VECTOR}, to_tsquery('english', $2)) AS score
       FROM resources r
      WHERE r.published = TRUE
        AND r.id <> $3
        AND (${VECTOR} @@ to_tsquery('english', $1)
             OR ${VECTOR} @@ to_tsquery('english', $2))
        AND EXISTS (
          SELECT 1 FROM resource_visibility rv
          JOIN tenants t ON t.id = rv.tenant_id
          WHERE rv.resource_id = r.id AND t.slug = $4
        )
      ORDER BY score DESC, r.published_at DESC NULLS LAST
      LIMIT 20`,
    [titleQuery || NO_MATCH, bodyQuery || NO_MATCH, resource.id, tenantSlug],
  ) as unknown as Array<RelatedItem & { score: number }>;

  // Below this a "match" is two rows sharing the vocabulary every recovery
  // housing resource shares. Tuned against the 8-12-26 catalog: it keeps the
  // NIMBYism course under the NIMBYism brief and drops "Recovery House Alumni
  // Best Practices" from under "Conduct a Needs Assessment".
  const MIN_SCORE = 0.5;
  const MAX_PER_TYPE = 2;

  const perType = new Map<string, number>();
  const picked: RelatedItem[] = [...pinned];
  for (const pin of pinned) perType.set(pin.type, (perType.get(pin.type) ?? 0) + 1);
  for (const row of rows) {
    if (row.score < MIN_SCORE || picked.length >= limit) break;
    if (picked.some((p) => p.slug === row.slug)) continue;
    const seen = perType.get(row.type) ?? 0;
    if (seen >= MAX_PER_TYPE) continue;
    perType.set(row.type, seen + 1);
    picked.push({ slug: row.slug, title: row.title, type: row.type });
  }
  return picked;
}

/**
 * The other Recovery Ecosystem Radio episodes, for the podcast shell's "More
 * Episodes" rail — newest first, same surface rules as everything else. One
 * show today, so "every other podcast row" and "the rest of this series" are
 * the same query; revisit if a second show ever lands.
 */
export async function getOtherEpisodes(
  excludeId: string, tenantSlug: string, limit = 6,
): Promise<Array<{ slug: string; title: string }>> {
  const rows = await sql`
    SELECT r.slug, r.title
    FROM resources r
    WHERE r.type = 'podcast'
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
  return rows as unknown as Array<{ slug: string; title: string }>;
}

/**
 * Sibling parts of a numbered video series, for the video shell's "This
 * series" rail block — the only in-page path between the 14 CORR/SCARR
 * certification parts. Title format since 8-21-26:
 * "Part N: <topic> - <series name>"; series membership = same series name
 * (the text after the final " - ") + same surface (CORR is colorado-only
 * and SCARR scarr-only, so the two recordings never mix). A title with no
 * " - " groups on its full remainder, which also covered the older
 * "Part N of 7: <shared name>" format. Returns [] for non-series videos
 * or a series of one.
 */
export interface VideoSeriesItem {
  slug: string;
  title: string;
  part: number;
  /** The rail label — the title without the repeated series suffix. */
  label: string;
}

const SERIES_TITLE = /^Part (\d+)(?: of \d+)?:\s*(.+)$/;

function seriesKey(remainder: string): string {
  const i = remainder.lastIndexOf(' - ');
  return i >= 0 ? remainder.slice(i + 3) : remainder;
}

function seriesLabel(title: string): string {
  const i = title.lastIndexOf(' - ');
  return i >= 0 ? title.slice(0, i) : title;
}

export async function getVideoSeries(
  title: string, tenantSlug: string,
): Promise<VideoSeriesItem[]> {
  const m = SERIES_TITLE.exec(title);
  if (!m) return [];
  const key = seriesKey(m[2]);
  const rows = await sql`
    SELECT r.slug, r.title
    FROM resources r
    WHERE r.type = 'video'
      AND r.published = TRUE
      AND EXISTS (
        SELECT 1 FROM resource_visibility rv
        JOIN tenants t ON t.id = rv.tenant_id
        WHERE rv.resource_id = r.id AND t.slug = ${tenantSlug}
      )
  `;
  const items: VideoSeriesItem[] = [];
  for (const r of rows as Array<{ slug: string; title: string }>) {
    const mm = SERIES_TITLE.exec(r.title);
    if (mm && seriesKey(mm[2]) === key) {
      items.push({
        slug: r.slug, title: r.title,
        part: Number(mm[1]), label: seriesLabel(r.title),
      });
    }
  }
  items.sort((a, b) => a.part - b.part);
  return items.length > 1 ? items : [];
}

/**
 * The card-level facts about one resource, for the signed-out content gate
 * (8-20-26 auth rebuild, phase 4). Deliberately light: no presigned URLs, no
 * presenters/materials — nothing a signed-out visitor shouldn't receive is
 * even generated. Everything here is already public on the library cards.
 */
export interface ResourceTeaser {
  title: string;
  slug: string;
  type: string;
  description: string;
}

export async function getResourceTeaser(slug: string): Promise<ResourceTeaser | null> {
  const rows = await sql`
    SELECT title, slug, type, description
    FROM resources
    WHERE slug = ${slug} AND published = TRUE
    LIMIT 1
  `;
  return (rows[0] as ResourceTeaser) ?? null;
}

/**
 * Presigned audio for one podcast row by slug — how an episode page gets the
 * Trailer's MP3 so the Trailer button can play it in place (8-18-26 shell)
 * instead of navigating. Same 6-hour signing rule as the episode's own audio,
 * same invariant: the s3_key never leaves the server.
 */
export async function getPodcastAudioUrl(slug: string): Promise<string | null> {
  const rows = await sql`
    SELECT s3_key FROM resources
    WHERE slug = ${slug} AND type = 'podcast'
      AND published = TRUE AND s3_key IS NOT NULL
    LIMIT 1
  `;
  const key = (rows[0] as { s3_key?: string } | undefined)?.s3_key;
  if (!key) return null;
  try {
    return await getPresignedUrl(key, 6 * 3600);
  } catch (e) {
    console.error('Presigned URL error:', e);
    return null;
  }
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
  /** CE fields — snapshotted onto user_course_progress at completion. */
  ceu_credits: number | null;
  is_naadac_ce: boolean;
}

export async function getCourseResource(slug: string): Promise<CourseResource | null> {
  const rows = await sql`
    SELECT id, title, slug, type, description, duration_minutes, moodle_course_id,
           ceu_credits, is_naadac_ce
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
           event_date, ceu_credits, course_code, naadac_skill_groups,
           citation, abstract, sponsor_text, sponsor_logo_url, sponsor_url,
           -- The id itself stays server-side (see getCourseResource); the
           -- shells only need to know whether the course exists, and this
           -- shape is returned verbatim by /api/resources/[slug].
           moodle_course_id IS NOT NULL AS has_moodle_course
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
      // Podcast audio signs for 6 hours: the browser keeps range-requesting
      // the MP3 for as long as playback runs, and a listener who opens the
      // page, walks away and presses play later would hit an expired URL.
      const ext = resource.s3_key.split('.').pop() || 'pdf';
      const expiry = resource.type === 'podcast' ? 6 * 3600 : undefined;
      [download_url, attachment_url] = await Promise.all([
        getPresignedUrl(resource.s3_key, expiry),
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
           p.photo_url, p.org_name, p.org_logo_url, p.org_url,
           p.org2_name, p.org2_url
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
