import type { MetadataRoute } from 'next';

/**
 * robots.txt (8-31-26 SEO pass). Crawlers get the public site — the library,
 * resource pages (their signed-out teasers are real content), and help — and
 * are kept out of everything account-, admin- or player-shaped. The tenant
 * portals are members-only (surface enforcement) and deliberately absent
 * from the sitemap, but not blocked here: their landings are public sign-in
 * doors.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/account', '/support', '/course/'],
    },
    sitemap: 'https://fgilearn.org/sitemap.xml',
  };
}
