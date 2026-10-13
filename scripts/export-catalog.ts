/**
 * Write the LRC catalog workbook (every item: ID, filters, tags, portals) to
 * a local file — the same workbook /api/admin/catalog/export serves.
 *
 *   npx tsx scripts/export-catalog.ts [out.xlsx]
 */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import { writeFileSync } from 'node:fs';

(async () => {
  // Imported after dotenv so lib/db.ts sees DATABASE_URL.
  const { getCatalogTables } = await import('../lib/catalog-export');
  const { tablesToXlsx } = await import('../lib/portal-admin-export');
  const out = process.argv[2] ?? `fgi-lrc-catalog-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const tables = await getCatalogTables();
  writeFileSync(out, await tablesToXlsx(tables, 'FGI Learning Resource Center — Catalog'));
  console.log(`${tables[0].rows.length} items -> ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
