import { sql } from './db';
import { getPresignedUrl } from './s3';
import type { Resource, ResourceListParams, ResourceListResponse } from '@/types';

export async function getPublicResources(
  params: ResourceListParams
): Promise<ResourceListResponse> {
  const {
    type, duration, search, tenant,
    page = 1, per_page = 12, match = 'any',
  } = params;

  const offset = (page - 1) * per_page;
  const audienceArr = params.audience
    ? (Array.isArray(params.audience) ? params.audience : [params.audience]) : [];
  const topicArr = params.topic
    ? (Array.isArray(params.topic) ? params.topic : [params.topic]) : [];

  const conditions: string[] = ['published = TRUE'];

  if (type) conditions.push(`type = '${type}'`);

  if (search) {
    const safe = search.replace(/'/g, "''");
    conditions.push(`(title ILIKE '%${safe}%' OR description ILIKE '%${safe}%')`);
  }

  if (duration) {
    const map: Record<string, string> = {
      under_15: 'duration_minutes < 15',
      '16_30':  'duration_minutes BETWEEN 16 AND 30',
      '31_60':  'duration_minutes BETWEEN 31 AND 60',
      '61_90':  'duration_minutes BETWEEN 61 AND 90',
      '91_120': 'duration_minutes BETWEEN 91 AND 120',
      '121_plus':'duration_minutes > 120',
    };
    if (map[duration]) conditions.push(map[duration]);
  }

  if (audienceArr.length > 0) {
    const tags = audienceArr.map((t: string) => `'${t}'`).join(',');
    conditions.push(match === 'all'
      ? `audience_tags @> ARRAY[${tags}]::text[]`
      : `audience_tags && ARRAY[${tags}]::text[]`);
  }

  if (topicArr.length > 0) {
    const tags = topicArr.map((t: string) => `'${t}'`).join(',');
    conditions.push(match === 'all'
      ? `topic_tags @> ARRAY[${tags}]::text[]`
      : `topic_tags && ARRAY[${tags}]::text[]`);
  }

  if (tenant) {
    const safeTenant = tenant.replace(/'/g, "''");
    conditions.push(`(
      NOT EXISTS (SELECT 1 FROM resource_visibility WHERE resource_id = id)
      OR EXISTS (
        SELECT 1 FROM resource_visibility rv
        JOIN tenants t ON t.id = rv.tenant_id
        WHERE rv.resource_id = id AND t.slug = '${safeTenant}'
      )
    )`);
  } else {
    conditions.push(`NOT EXISTS (SELECT 1 FROM resource_visibility WHERE resource_id = id)`);
  }

  const where = conditions.join(' AND ');
  const query = `
    SELECT
      id, title, slug, type, description, duration_minutes,
      thumbnail_url, vimeo_id, external_url,
      is_naadac_ce, audience_tags, topic_tags, published_at,
      COUNT(*) OVER() AS total_count
    FROM resources
    WHERE ${where}
    ORDER BY published_at DESC NULLS LAST
    LIMIT ${per_page} OFFSET ${offset}
  `;

  const rows = await sql(query);
  const total = rows.length > 0 ? Number((rows[0] as any).total_count) : 0;

  return {
    resources: rows as unknown as Resource[],
    total, page, per_page,
    total_pages: Math.ceil(total / per_page),
  };
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  const safeSlug = slug.replace(/'/g, "''");
  const rows = await sql(
    `SELECT id, title, slug, type, description, duration_minutes,
            thumbnail_url, vimeo_id, external_url,
            is_naadac_ce, audience_tags, topic_tags, published_at, s3_key
     FROM resources
     WHERE slug = '${safeSlug}' AND published = TRUE
     LIMIT 1`
  );

  if (!rows[0]) return null;

  const resource = { ...rows[0] } as any;
  let download_url: string | undefined;

  if (resource.s3_key) {
    try {
      download_url = await getPresignedUrl(resource.s3_key);
    } catch (e) {
      console.error('Presigned URL error:', e);
    }
    delete resource.s3_key;
  }

  return { ...resource, download_url } as Resource;
}
