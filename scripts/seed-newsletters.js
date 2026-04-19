// =============================================================================
// FGI LMS — Newsletter Seed Script
// Run AFTER uploading PDFs to S3 at: fgi-resources/newsletters/
//
// Usage:
//   node scripts/seed-newsletters.js
//
// Requires DATABASE_URL in .env.local
// =============================================================================

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

// ---------------------------------------------------------------------------
// Newsletter manifest — add one entry per PDF file in S3.
// s3_key must match the exact filename you uploaded to the newsletters/ folder.
// ---------------------------------------------------------------------------
const NEWSLETTERS = [
  {
    title:       'Celebrate Recovery Month',
    slug:        '2020-09-celebrate-recovery-month',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — September 2020.',
    s3_key:      'newsletters/2020-09 Celebrate Recovery Month.pdf',
    published_at: '2020-09-01',
    topic_tags:  ['recovery_support'],
  },
  {
    title:       'Recovery Capital',
    slug:        '2020-10-recovery-capital',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — October 2020.',
    s3_key:      'newsletters/2020-10 Recovery Capital.pdf',
    published_at: '2020-10-01',
    topic_tags:  ['recovery_support'],
  },
  {
    title:       "Women's History",
    slug:        '2021-03-womens-history',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — March 2021.',
    s3_key:      "newsletters/2021-03 Women's History.pdf",
    published_at: '2021-03-01',
    topic_tags:  ['recovery_support'],
  },
  {
    title:       'Mental Health Month',
    slug:        '2021-05-mental-health-month',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — May 2021.',
    s3_key:      'newsletters/2021-05 Mental Health Month.pdf',
    published_at: '2021-05-01',
    topic_tags:  ['mental_health', 'recovery_support'],
  },
  {
    title:       'Stigma Shames Us All',
    slug:        '2021-06-stigma-shames-us-all',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — June 2021.',
    s3_key:      'newsletters/2021-06 Stigma Shames Us All.pdf',
    published_at: '2021-06-01',
    topic_tags:  ['recovery_support'],
  },
  {
    title:       'Overcoming NIMBYism',
    slug:        '2021-07-overcoming-nimbyism',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — July 2021.',
    s3_key:      'newsletters/2021-07 Overcoming NIMBYism.pdf',
    published_at: '2021-07-01',
    topic_tags:  ['establishing_rh', 'operations'],
  },
  {
    title:       'Recovery Housing',
    slug:        '2021-08-recovery-housing',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — August 2021.',
    s3_key:      'newsletters/2021-08 Recovery Housing.pdf',
    published_at: '2021-08-01',
    topic_tags:  ['rh_management', 'operations'],
  },
  {
    title:       'Recovery Employment',
    slug:        '2021-11-recovery-employment',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — November 2021.',
    s3_key:      'newsletters/2021-11 Recovery Employment.pdf',
    published_at: '2021-11-01',
    topic_tags:  ['workforce'],
  },
  {
    title:       'Contingency Management',
    slug:        '2022-04-contingency-management',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — April 2022.',
    s3_key:      'newsletters/2022-04 Contingency Management.pdf',
    published_at: '2022-04-01',
    topic_tags:  ['recovery_support'],
  },
  {
    title:       'Social Model',
    slug:        '2022-05-social-model',
    description: 'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — May 2022.',
    s3_key:      'newsletters/2022-05 Social Model.pdf',
    published_at: '2022-05-01',
    topic_tags:  ['social_model'],
  },
  // ── Add more newsletters here as Jennifer uploads them ─────────────────
  // {
  //   title:       '',
  //   slug:        '',
  //   description: 'The official newsletter of the RCORP Rural Center of Excellence...',
  //   s3_key:      'newsletters/FILENAME.pdf',
  //   published_at: 'YYYY-MM-01',
  //   topic_tags:  [],
  // },
];

async function seed() {
  console.log(`Seeding ${NEWSLETTERS.length} newsletters...`);
  let inserted = 0;
  let skipped  = 0;

  for (const n of NEWSLETTERS) {
    try {
      await sql`
        INSERT INTO resources (
          title, slug, type, description,
          s3_key, audience_tags, topic_tags,
          published, published_at
        ) VALUES (
          ${n.title},
          ${n.slug},
          'newsletter',
          ${n.description},
          ${n.s3_key},
          ${'{}'},
          ${n.topic_tags || []},
          TRUE,
          ${n.published_at}
        )
        ON CONFLICT (slug) DO NOTHING
      `;
      console.log(`  ✓ ${n.title}`);
      inserted++;
    } catch (err) {
      console.log(`  ✗ SKIP ${n.slug} — ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
