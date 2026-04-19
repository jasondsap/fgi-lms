// =============================================================================
// Database client — Neon serverless driver
// =============================================================================
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// neon() returns a tagged-template SQL function.
// Usage: const rows = await sql`SELECT * FROM resources WHERE slug = ${slug}`
export const sql = neon(process.env.DATABASE_URL);
