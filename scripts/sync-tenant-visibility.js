// Syncs tenant (colorado / scarr) resource_visibility from the Burn Down Chart
// manifest (scripts/data/tenant-content.json — regenerated from the xlsx).
//
// FGI visibility is owned by the initial allow-list migration; this script only
// ADDS colorado/scarr surfaces to resources that are already loaded AND matched
// to a manifest row. Unmatched manifest rows are content still to be loaded.
//
// Dry-run by default:   node scripts/sync-tenant-visibility.js
// Write changes:        node scripts/sync-tenant-visibility.js --apply
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const sql = neon(process.env.DATABASE_URL);
const APPLY = process.argv.includes('--apply');

// Explicit title -> slug overrides for items whose Burn Down Chart title differs
// from the loaded resource title. Extend this as tenant content is loaded.
const SLUG_OVERRIDES = {
  'the role of recovery allies: webinar': 'role-of-recovery-allies',
  'confidentiality and ethics: webinar': 'confidentiality-ethics-and-sud',
  'how physical & social activity aids recovery: webinar': 'how-physical-and-social-activities-aid-recovery',
};

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/[:\-–—(),.&/]/g, ' ')
    .replace(/\b(webinar|corr|scarr|the|a)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'tenant-content.json'), 'utf8')
  );
  const resources = await sql`SELECT id, slug, title FROM resources`;
  const byNorm = new Map(resources.map((r) => [norm(r.title), r]));
  const bySlug = new Map(resources.map((r) => [r.slug, r]));

  const tenants = await sql`SELECT id, slug FROM tenants WHERE slug IN ('colorado','scarr')`;
  const tid = Object.fromEntries(tenants.map((t) => [t.slug, t.id]));

  const existing = await sql`SELECT resource_id, tenant_id FROM resource_visibility`;
  const has = new Set(existing.map((e) => `${e.resource_id}:${e.tenant_id}`));

  const matched = [];
  const unmatched = [];
  const toAdd = [];

  for (const it of manifest.items) {
    let res = null;
    if (it.slug && bySlug.has(it.slug)) res = bySlug.get(it.slug);
    if (!res) res = bySlug.get(SLUG_OVERRIDES[it.title.toLowerCase()]);
    if (!res) res = byNorm.get(norm(it.title));
    if (!res) { unmatched.push(it); continue; }
    matched.push({ it, res });

    for (const surf of ['colorado', 'scarr']) {
      const want = surf === 'colorado' ? it.co : it.scarr;
      if (want && tid[surf] && !has.has(`${res.id}:${tid[surf]}`)) {
        toAdd.push({ resource_id: res.id, tenant_id: tid[surf], surf, title: res.title });
      }
    }
  }

  console.log(`Manifest tenant items:  ${manifest.items.length}`);
  console.log(`Matched to loaded:      ${matched.length}`);
  console.log(`Unmatched (to load):    ${unmatched.length}`);
  console.log(`\nVisibility rows to add: ${toAdd.length}`);
  for (const a of toAdd) console.log(`  + ${a.surf.padEnd(8)} ${a.title}`);

  console.log('\nUnmatched / still-to-load:');
  for (const u of unmatched) {
    console.log(`  - [${String(u.type || '').padEnd(15)}] ${u.co ? 'CO' : '  '} ${u.scarr ? 'SCARR' : '     '}  ${u.title}`);
  }

  if (!APPLY) { console.log('\n(dry run — pass --apply to write)'); return; }
  for (const a of toAdd) {
    await sql`INSERT INTO resource_visibility (resource_id, tenant_id) VALUES (${a.resource_id}, ${a.tenant_id})`;
  }
  console.log(`\nApplied: inserted ${toAdd.length} visibility rows.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
