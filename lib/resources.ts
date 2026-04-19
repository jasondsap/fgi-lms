// =============================================================================
// Resource query helpers — used by API routes
// =============================================================================
import { sql } from './db';
import { getPresignedUrl } from './s3';
import type { Resource, ResourceListParams, ResourceListResponse } from '@/types';

/**
 * Build and execute the filtered resource list query.
 * Returns paginated results shaped for the public API.
 */
export async function getPublicResources(
  params: ResourceListParams
): Promise<ResourceListResponse> {
  const {
    type,
    audience,
    topic,
    duration,
    search,
    tenant,
    page = 1,
    per_page = 12,
    match = 'any',
  } = params;

  const offset = (page - 1) * per_page;
  const audienceArr = audience ? (Array.isArray(audience) ? audience : [audience]) : [];
  const topicArr    = topic    ? (Array.isArray(topic)    ? topic    : [topic])    : [];

  // Duration bucket → SQL condition
  const durationCondition = (() => {
    switch (duration) {
      case 'under_15':  return 'AND duration_minutes < 15';
      case '16_30':     return 'AND duration_minutes BETWEEN 16 AND 30';
      case '31_60':     return 'AND duration_minutes BETWEEN 31 AND 60';
      case '61_90':     return 'AND duration_minutes BETWEEN 61 AND 90';
      case '91_120':    return 'AND duration_minutes BETWEEN 91 AND 120';
      case '121_plus':  return 'AND duration_minutes > 120';
      default:          return '';
    }
  })();

  // Audience tag filter
  const audienceCondition = audienceArr.length
    ? match === 'all'
      ? `AND audience_tags @> ARRAY[${audienceArr.map(t => `'${t}'`).join(',')}]::text[]`
      : `AND audience_tags && ARRAY[${audienceArr.map(t => `'${t}'`).join(',')}]::text[]`
    : '';

  // Topic tag filter
  const topicCondition = topicArr.length
    ? match === 'all'
      ? `AND topic_tags @> ARRAY[${topicArr.map(t => `'${t}'`).join(',')}]::text[]`
      : `AND topic_tags && ARRAY[${topicArr.map(t => `'${t}'`).join(',')}]::text[]`
    : '';

  // Tenant visibility filter
  const tenantCondition = tenant
    ? `AND (
        NOT EXISTS (SELECT 1 FROM resource_visibility WHERE resource_id = r.id)
        OR EXISTS (
          SELECT 1 FROM resource_visibility rv
          JOIN tenants t ON t.id = rv.tenant_id
          WHERE rv.resource_id = r.id AND t.slug = '${tenant}'
        )
      )`
    : `AND NOT EXISTS (SELECT 1 FROM resource_visibility WHERE resource_id = r.id)`;

  const rows = await sql`
    SELECT
      id, title, slug, type, description, duration_minutes,
      thumbnail_url, vimeo_id, external_url,
      is_naadac_ce, audience_tags, topic_tags, published_at,
      COUNT(*) OVER() AS total_count
    FROM public_resources r
    WHERE 1=1
      ${type   ? sql`AND type = ${type}` : sql``}
      ${search ? sql`AND (title ILIKE ${'%' + search + '%'} OR description ILIKE ${'%' + search + '%'})` : sql``}
    ORDER BY published_at DESC
    LIMIT ${per_page} OFFSET ${offset}
  `;

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return {
    resources: rows as unknown as Resource[],
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  };
}

/**
 * Fetch a single resource by slug.
 * If the resource has an s3_key, generate a presigned download URL.
 */
export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const rows = await sql`
    SELECT
      r.id, r.title, r.slug, r.type, r.description, r.duration_minutes,
      r.thumbnail_url, r.vimeo_id, r.external_url,
      r.is_naadac_ce, r.audience_tags, r.topic_tags, r.published_at,
      r.s3_key
    FROM resources r
    WHERE r.slug = ${slug} AND r.published = TRUE
    LIMIT 1
  `;

  if (!rows[0]) return null;

  const resource = rows[0] as any;
  let download_url: string | undefined;

  if (resource.s3_key) {
    download_url = await getPresignedUrl(resource.s3_key);
    delete resource.s3_key; // never expose the raw key
  }

  return { ...resource, download_url } as Resource;
}
