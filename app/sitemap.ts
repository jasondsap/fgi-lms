import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';

/**
 * sitemap.xml (8-31-26 SEO pass): the public FGI surface only — home,
 * library, help, and every published, non-internal, FGI-visible resource
 * (signed-out visitors get a real teaser page, so these are indexable).
 * Tenant portals are members-only and stay out.
 */
export const revalidate = 3600; // rebuild at most hourly

const BASE = 'https://fgilearn.org';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/library`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/help`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const rows = await sql`
      SELECT r.slug, coalesce(r.published_at, now()) AS last
      FROM resources r
      WHERE r.published = TRUE AND r.internal = FALSE
        AND EXISTS (
          SELECT 1 FROM resource_visibility rv
          JOIN tenants t ON t.id = rv.tenant_id
          WHERE rv.resource_id = r.id AND t.slug = 'fgi'
        )
      ORDER BY r.published_at DESC NULLS LAST
    `;
    const resources: MetadataRoute.Sitemap = rows.map((r) => ({
      url: `${BASE}/resource/${r.slug}`,
      lastModified: new Date(r.last as string),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
    return [...staticPages, ...resources];
  } catch (err) {
    // A DB blip must not 500 the sitemap — serve the static core instead.
    console.error('[sitemap]', err);
    return staticPages;
  }
}
