// Apply a .sql file to Neon: node scripts/apply-sql.js scripts/sql/<file>.sql
// Statements are split on ";\n" — keep one statement per block, no functions.
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/apply-sql.js <file.sql>'); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);
const text = fs.readFileSync(file, 'utf8')
  .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const statements = text.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);

(async () => {
  for (const s of statements) {
    await sql(s);
    console.log('ok:', s.replace(/\s+/g, ' ').slice(0, 80));
  }
})().catch((e) => { console.error(e); process.exit(1); });
