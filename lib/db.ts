// =============================================================================
// Database client — Neon serverless driver
// =============================================================================
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// neon() returns a tagged-template SQL function.
// Usage: const rows = await sql`SELECT * FROM resources WHERE slug = ${slug}`
//
// `cache: 'no-store'` is load-bearing. The driver runs every query as an HTTP
// POST through global fetch, which Next 14 patches: a query that fires before
// the request has touched cookies/headers/searchParams is written to the Data
// Cache with a one-year lifetime and replayed from there on later renders —
// and on Vercel that cache survives deploys. That is how the tenant portals
// kept showing October's webinar in Latest Highlights after the November one
// was loaded (11-16-26). A database read must never be served from that cache.
export const sql = neon(process.env.DATABASE_URL, {
  fetchOptions: { cache: 'no-store' },
});
