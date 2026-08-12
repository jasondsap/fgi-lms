// Creates the Learning Center evaluation table.
// Run: node scripts/create-evaluation-table.js
//
// One row per completed evaluation. The columns are deliberately flat and
// mirror the nine items of Jennifer's instrument ("Evaluation for everything
// except the Podcast"), in the order Moodle's `Course Evaluation` feedback
// activity asks them — so importing the Moodle side later is an INSERT..SELECT
// with `source = 'moodle'` rather than a reshaping job.
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS evaluation_responses (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

      -- What was evaluated. The slug is kept alongside the FK as a snapshot,
      -- so a later re-slug or deletion doesn't orphan the reporting.
      resource_id         uuid REFERENCES resources(id) ON DELETE SET NULL,
      resource_slug       text,
      surface             text NOT NULL DEFAULT 'fgi',

      -- Who, when known. Anonymous submissions are expected: nothing on the
      -- site is behind a login yet.
      user_id             uuid REFERENCES users(id) ON DELETE SET NULL,

      -- 'web' for this site, 'moodle' for rows imported from mod_feedback.
      source              text NOT NULL DEFAULT 'web',
      moodle_completed_id integer UNIQUE,
      moodle_course_id    integer,

      -- Bump when the instrument's questions change, so old rows stay readable.
      instrument_version  smallint NOT NULL DEFAULT 1,

      -- 0-10, all required
      made_sense          smallint NOT NULL CHECK (made_sense         BETWEEN 0 AND 10),
      can_apply           smallint NOT NULL CHECK (can_apply          BETWEEN 0 AND 10),
      presented_well      smallint NOT NULL CHECK (presented_well     BETWEEN 0 AND 10),
      overall_impression  smallint NOT NULL CHECK (overall_impression BETWEEN 0 AND 10),
      would_recommend     smallint NOT NULL CHECK (would_recommend    BETWEEN 0 AND 10),

      -- Open ended, all optional
      liked               text,
      disliked            text,
      future_topics       text,

      -- Required
      may_contact         boolean NOT NULL,
      contact_email       text,

      created_at          timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS evaluation_responses_resource_idx
      ON evaluation_responses (resource_id, created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS evaluation_responses_surface_idx
      ON evaluation_responses (surface, created_at DESC)
  `;

  // A signed-in learner evaluates a given resource once. Anonymous submissions
  // can't be deduplicated server-side (the modal remembers locally instead),
  // and imported Moodle rows are deduplicated by moodle_completed_id.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS evaluation_responses_one_per_user_idx
      ON evaluation_responses (user_id, resource_id)
      WHERE user_id IS NOT NULL AND source = 'web'
  `;

  console.log('evaluation_responses table ready');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
