// Make (or unmake) a user a tenant admin — sees that tenant's `internal`
// resources (e.g. the ORH-CO Code of Ethics course). The role takes effect
// on the user's next sign-in (role rides in the session JWT).
//
//   node scripts/set-tenant-admin.js kevin@corecoveryhousing.org colorado
//   node scripts/set-tenant-admin.js kevin@corecoveryhousing.org --remove
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const [email, tenant] = process.argv.slice(2);
if (!email || !tenant) {
  console.error('usage: node scripts/set-tenant-admin.js <email> <tenant-slug | --remove>');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

(async () => {
  const rows = tenant === '--remove'
    ? await sql`
        UPDATE users SET role = 'learner', tenant_id = NULL, updated_at = now()
        WHERE lower(email) = lower(${email}) RETURNING email, role, tenant_id`
    : await sql`
        UPDATE users u SET role = 'tenant_admin', tenant_id = t.id, updated_at = now()
        FROM tenants t
        WHERE t.slug = ${tenant} AND lower(u.email) = lower(${email})
        RETURNING u.email, u.role, t.slug AS tenant`;
  if (!rows.length) {
    console.error('no such user (or tenant) — the person must have signed in at least once');
    process.exit(1);
  }
  console.log(JSON.stringify(rows[0]));
})().catch((e) => { console.error(e.message); process.exit(1); });
