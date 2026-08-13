// Adds the NAADAC CE fields the 8-11-26 webinar shell needs, and marks the
// monthly webinar series as CE-bearing.
// Run: node scripts/add-naadac-fields.js
//
// `ceu_credits` and `is_naadac_ce` already existed but were never populated for
// webinars. `naadac_skill_groups` is new: the shell prints "This course aligns
// with NAADAC Skill Group(s): …", which is per-webinar wording only Jennifer
// can supply, so the array stays empty until she does and that line is simply
// not rendered.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`ALTER TABLE resources ADD COLUMN IF NOT EXISTS naadac_skill_groups text[]`;

  // Jason, 8-12: every monthly webinar carries 1 NAADAC CE.
  const updated = await sql`
    UPDATE resources
       SET is_naadac_ce = TRUE,
           ceu_credits  = 1.0
     WHERE type = 'webinar'
       AND published = TRUE
     RETURNING slug
  `;
  console.log(`naadac_skill_groups ready; ${updated.length} webinars marked 1 CE`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
