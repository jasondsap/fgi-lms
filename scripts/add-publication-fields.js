// Adds the two fields the 8-12-26 publication shell needs.
// Run: node scripts/add-publication-fields.js
//
// `citation` is stored as a small fragment of HTML, not plain text: the shell
// prints the journal name in italics, exactly as Jennifer's spreadsheet marks it
// up. Only <em> is ever emitted (see scripts/load-publications.js), so it is
// rendered with dangerouslySetInnerHTML from a trusted, editor-controlled field.
//
// `abstract` holds the full published abstract. It is deliberately separate from
// `description`, which stays short because it feeds the library cards, the
// search and the AI assistant's catalog — the assistant sees every description
// on every request, so a 2,000-character abstract there is paid for repeatedly.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`ALTER TABLE resources ADD COLUMN IF NOT EXISTS citation text`;
  await sql`ALTER TABLE resources ADD COLUMN IF NOT EXISTS abstract text`;
  console.log('citation + abstract columns ready');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
