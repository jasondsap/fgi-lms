/**
 * Apply Jennifer's portal filter crosswalk (9-3-26) — sets audience_tags and
 * topic_tags on the Colorado/SCARR rows by course_code.
 *
 * Source: docs/8-22-Burn Down/portal item filter - tag crosswalk.xlsm,
 * flattened to scripts/data/portal-tag-crosswalk.json (sheet labels mapped to
 * the AudienceTag / TopicTag values in types/index.ts). Tags live on the
 * shared resource row, so rows also visible on FGI pick up the same tags.
 *
 *   node scripts/seed-portal-tags.js --dry-run   # show the diff only
 *   node scripts/seed-portal-tags.js             # apply
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const { neon } = require('@neondatabase/serverless');
const crosswalk = require('./data/portal-tag-crosswalk.json');

const sql = neon(process.env.DATABASE_URL);
const dryRun = process.argv.includes('--dry-run');
const same = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());

(async () => {
  const codes = Object.keys(crosswalk);
  const rows = await sql`
    SELECT id, course_code, title, audience_tags, topic_tags
    FROM resources WHERE course_code = ANY(${codes})`;
  const byCode = Object.fromEntries(rows.map((r) => [r.course_code, r]));

  let changed = 0, skipped = 0;
  for (const code of codes) {
    const want = crosswalk[code];
    const row = byCode[code];
    if (!row) { console.log(`MISSING ${code} (${want.name})`); continue; }
    if (same(row.audience_tags, want.audience) && same(row.topic_tags, want.topics)) { skipped++; continue; }
    changed++;
    console.log(`${dryRun ? 'would set' : 'set'} ${code} ${row.title}`);
    console.log(`   audience ${JSON.stringify(row.audience_tags)} -> ${JSON.stringify(want.audience)}`);
    console.log(`   topics   ${JSON.stringify(row.topic_tags)} -> ${JSON.stringify(want.topics)}`);
    if (!dryRun) {
      await sql`UPDATE resources SET audience_tags = ${want.audience}::text[], topic_tags = ${want.topics}::text[],
                updated_at = NOW() WHERE id = ${row.id}`;
    }
  }
  console.log(`\n${changed} changed, ${skipped} already matched, ${codes.length} codes in crosswalk${dryRun ? ' (dry run)' : ''}`);
})().catch((e) => { console.error(e); process.exit(1); });
