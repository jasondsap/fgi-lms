// Flag a resource internal (staff/admin-only) on ONE surface while it stays
// open on the others — resource_visibility.internal (9-10-26). The global
// resources.internal flag still hides a row everywhere; this is the
// per-library version of it. Lookup is by six-character course code or slug.
//
//   node scripts/set-surface-internal.js an4384 fgi            (internal on FGI)
//   node scripts/set-surface-internal.js an4384 fgi --public   (open again)
//   node scripts/set-surface-internal.js an4384                (show all surfaces)
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const [key, surface, flag] = process.argv.slice(2);
if (!key) {
  console.error('usage: node scripts/set-surface-internal.js <code|slug> [<surface> [--public]]');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

(async () => {
  if (surface) {
    const internal = flag !== '--public';
    const rows = await sql`
      UPDATE resource_visibility rv SET internal = ${internal}
      FROM resources r, tenants t
      WHERE rv.resource_id = r.id AND rv.tenant_id = t.id
        AND (r.course_code = ${key} OR r.slug = ${key}) AND t.slug = ${surface}
      RETURNING r.slug`;
    if (!rows.length) {
      console.error('no visibility row for that resource on that surface (check the code/slug and that it is allow-listed there)');
      process.exit(1);
    }
  }
  const rows = await sql`
    SELECT r.course_code, r.slug, r.internal AS internal_everywhere,
           t.slug AS surface, rv.internal AS internal_here
    FROM resources r
    JOIN resource_visibility rv ON rv.resource_id = r.id
    JOIN tenants t ON t.id = rv.tenant_id
    WHERE r.course_code = ${key} OR r.slug = ${key}
    ORDER BY t.slug`;
  if (!rows.length) {
    console.error('no such resource');
    process.exit(1);
  }
  console.table(rows);
})().catch((e) => { console.error(e); process.exit(1); });
