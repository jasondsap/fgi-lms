require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const NEWSLETTERS = [
  {
    title:        'RCOE September 2025 Newsletter',
    slug:         'rcoe-september-2025-newsletter',
    description:  'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — September 2025.',
    s3_key:       'newsletters/fletcher-group-rcoe-september-2025-newsletter.pdf',
    published_at: '2025-09-01',
    topic_tags:   ['recovery_support'],
  },
  {
    title:        'RCOE October 2025 Newsletter',
    slug:         'rcoe-october-2025-newsletter',
    description:  'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — October 2025.',
    s3_key:       'newsletters/fletcher-group-rcoe-october-2025-newsletter.pdf',
    published_at: '2025-10-01',
    topic_tags:   ['recovery_support'],
  },
  {
    title:        'RCOE November 2025 Newsletter',
    slug:         'rcoe-november-2025-newsletter',
    description:  'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — November 2025.',
    s3_key:       'newsletters/fletcher-group-rcoe-november-2025-newsletter.pdf',
    published_at: '2025-11-01',
    topic_tags:   ['recovery_support'],
  },
  {
    title:        'RCOE December 2025 Newsletter',
    slug:         'rcoe-december-2025-newsletter',
    description:  'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — December 2025.',
    s3_key:       'newsletters/fletcher-group-rcoe-december-2025-newsletter.pdf',
    published_at: '2025-12-01',
    topic_tags:   ['recovery_support'],
  },
  {
    title:        'RCOE January 2026 Newsletter',
    slug:         'rcoe-january-2026-newsletter',
    description:  'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — January 2026.',
    s3_key:       'newsletters/fletcher-group-rcoe-january-2026-newsletter.pdf',
    published_at: '2026-01-01',
    topic_tags:   ['recovery_support'],
  },
  {
    title:        'Fletcher Group Inc. RCOE February 2026 Newsletter',
    slug:         'rcoe-february-2026-newsletter',
    description:  'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — February 2026.',
    s3_key:       'newsletters/fletcher-group-inc-rcoe-february-2026-newsletter.pdf',
    published_at: '2026-02-01',
    topic_tags:   ['recovery_support'],
  },
  {
    title:        'RCOE March 2026 Newsletter',
    slug:         'rcoe-march-2026-newsletter',
    description:  'The official newsletter of the RCORP Rural Center of Excellence on SUD Recovery at the Fletcher Group — March 2026.',
    s3_key:       'newsletters/fletcher-group-rcoe-march-2026-newsletter.pdf',
    published_at: '2026-03-01',
    topic_tags:   ['recovery_support'],
  },
];

async function seed() {
  console.log(`\nSeeding ${NEWSLETTERS.length} newsletters...`);
  let inserted = 0, skipped = 0;

  for (const n of NEWSLETTERS) {
    try {
      await sql`
        INSERT INTO resources (
          title, slug, type, description,
          s3_key, audience_tags, topic_tags,
          published, published_at
        ) VALUES (
          ${n.title}, ${n.slug}, 'newsletter', ${n.description},
          ${n.s3_key}, ${'{}'},  ${n.topic_tags}, TRUE, ${n.published_at}
        )
        ON CONFLICT (slug) DO NOTHING
      `;
      console.log(`  ✓  ${n.title}`);
      inserted++;
    } catch (err) {
      console.log(`  ✗  SKIP ${n.slug} — ${err.message}`);
      skipped++;
    }
  }
  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.\n`);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
