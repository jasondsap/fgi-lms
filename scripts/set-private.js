// Mark (or unmark) a resource PRIVATE — the "approved by HRSA for limited
// 1-on-1 direct client TA only" label (Jennifer, burn-down 9-28 row 19).
// Label only: staff and admins see a PRIVATE pill with the pop-up; it does
// not change who can open the resource. Needs resources.private to exist
// (scripts/sql/2026-10-12-private-feedback.sql).
//
//   node scripts/set-private.js xu7177            # mark private
//   node scripts/set-private.js xu7177 --public   # clear
//   node scripts/set-private.js --list            # who is private today
require('dotenv').config({ path: '.env.local', quiet: true });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);
const [key, flag] = process.argv.slice(2);

(async () => {
  if (key === '--list') {
    const rows = await sql`SELECT course_code, title FROM resources WHERE private ORDER BY title`;
    console.log(rows.length ? rows : 'no private resources');
    return;
  }
  if (!key) {
    console.error('usage: node scripts/set-private.js <course_code | slug> [--public] | --list');
    process.exit(1);
  }
  const value = flag !== '--public';
  const rows = await sql`
    UPDATE resources SET private = ${value}, updated_at = now()
    WHERE course_code = ${key} OR slug = ${key}
    RETURNING course_code, slug, title, private`;
  if (!rows.length) { console.error(`no resource matches "${key}"`); process.exit(1); }
  console.log(rows[0]);
})().catch((e) => { console.error(e.message); process.exit(1); });
