// Loads the full RCOE monthly newsletter archive from
// `docs/final build/Newsletter/` (+ its `Private/` subfolder).
// Run: node scripts/load-newsletter-archive.js [--dry]
//
// The seven issues seeded by scripts/seed-newsletters.js (vols 58-64) are
// already in S3; this script leaves their PDFs alone and only rewrites their
// descriptions and tags, so the whole run is one pass over the series.
//
// Two things the folder gets wrong, both corrected here from the PDF itself:
//
//   - `2020-10-recovery-capital.pdf` is the NOVEMBER 2020 issue (Vol. 8). The
//     filename month is wrong; the cover is not. Every date below was read off
//     the cover, never off the filename.
//   - "Private" is the folder the archive was delivered in, not a visibility
//     rule. Jason confirmed 2026-08-13 that these load published, restricted to
//     the fgi tenant, exactly like the seven already live.
//
// The volume numbers prove the series is complete from Vol. 6 forward with no
// missing recent issue: 57 is December 2024 and 58 is September 2025, i.e. the
// RCOE simply did not publish between. Vols 1-5, 7, 9-11, 13, 18-19, 21-24,
// 27-29 and 34 were never supplied and are the only real gaps.
//
// Descriptions are written from each issue's own text (cover essay + article
// pages) and are deliberately short: this string feeds the library cards, the
// search index and the assistant's catalog, which is re-sent on every request.
// The full text stays in the PDF.
//
// Idempotent on slug.
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const sql = neon(process.env.DATABASE_URL);
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.S3_BUCKET_NAME;
const DIR = path.join(__dirname, '..', 'docs', 'final build', 'Newsletter');
const dry = process.argv.includes('--dry');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];

// vol   — the issue number printed on the cover, and the sort key that proves
//         the series is unbroken.
// file  — relative to DIR. null means the PDF is already in S3 from the
//         earlier seed and must not be re-uploaded.
// tags  — inferred from the issue's content, from the TopicTag union in
//         types/index.ts. Content taxonomy is Jennifer's call; these are a
//         starting point, and changing one is a single UPDATE.
const ISSUES = [
  { vol: 6, year: 2020, month: 9, file: 'Private/2020-09-celebrate-recovery-month.pdf',
    tags: ['recovery_support'],
    description: 'Marks National Recovery Month and its 2020 theme, “Join the Voices for Recovery: Celebrating Connections,” with ways to promote recovery in rural communities where shortages of care leave people feeling forgotten.' },

  { vol: 8, year: 2020, month: 11, file: 'Private/2020-10-recovery-capital.pdf',
    tags: ['recovery_support', 'research'],
    description: 'A primer on recovery capital — how Granfield and Cloud defined it in 1999, how instruments like REC-CAP and SABRS quantify it, and how the concept displaced the “hit rock bottom” model of addiction.' },

  { vol: 12, year: 2021, month: 3, file: "Private/2021-03 Women's History.pdf",
    tags: ['recovery_support'],
    description: 'Honors Women’s History Month with the women who shaped modern recovery, from Anne Smith to Betty Ford, alongside Medicaid postpartum coverage for mothers in recovery and the power of mentorship.' },

  { vol: 14, year: 2021, month: 5, file: 'Private/2021-05 Mental Health Month.pdf',
    tags: ['mental_health', 'self_care'],
    description: 'Three Fletcher Group Outreach and Engagement Specialists, all in long-term recovery themselves, write on the rural inflection point, confronting loneliness, and caring for the people who do the caring.' },

  { vol: 15, year: 2021, month: 6, file: 'Private/2021-06 Stigma Shames Us All.pdf',
    tags: ['recovery_support', 'social_model'],
    description: 'Examines the cost of public, structural and self-stigma, why stigma around substance use runs higher in rural areas, and how the “Community as Method” approach helps defeat it.' },

  { vol: 16, year: 2021, month: 7, file: 'Private/2021-07 Overcoming NIMBYism.pdf',
    tags: ['establishing_rh', 'rh_policies'],
    description: 'Best-practice guidance for recovery housing developers meeting NIMBY opposition — preparing early, answering legitimate concerns, recruiting local allies, and how the framing of a debate decides it.' },

  { vol: 17, year: 2021, month: 8, file: 'Private/2021-08 Recovery Housing.pdf',
    tags: ['establishing_rh', 'recovery_support'],
    description: 'Defines recovery housing and sets out the Fletcher Group’s model and its documented outcomes, written the year overdose deaths jumped to 93,000 and rural providers were working largely alone.' },

  { vol: 20, year: 2021, month: 11, file: 'Private/2021-11 Recovery Employment.pdf',
    tags: ['workforce', 'recovery_support'],
    description: 'A deep dive into employment’s role in rural recovery — the documented benefits for workers and employers alike, and the rural barriers of stigma, thin job markets, childcare and computer inexperience.' },

  { vol: 25, year: 2022, month: 4, file: 'Private/2022-04 Contingency Management.pdf',
    tags: ['recovery_support', 'research'],
    description: 'Introduces contingency management, the evidence-based use of motivational incentives, and the Fletcher Group’s partnerships with Washington State and Wayne State universities bringing CM programs to rural recovery homes.' },

  { vol: 26, year: 2022, month: 5, file: 'Private/2022-05 Social Model.pdf',
    tags: ['social_model'],
    description: 'Traces the social model of recovery from its 1940s California origins to the present, why peer support does what clinical care cannot, and how operators can put the model to work.' },

  { vol: 30, year: 2022, month: 9, file: 'Private/2022-09 Finding Work.pdf',
    tags: ['workforce'],
    description: 'How rural recovery homes can be both launchpad and matchmaker for employment, connecting residents to a labor market with 11 million unfilled postings and employers to workers with reason to stay.' },

  { vol: 31, year: 2022, month: 10, file: 'Private/2022-10 Recovery Ecosystem Mapping Tool.pdf',
    tags: ['recovery_ecosystems', 'funding', 'fgi_services'],
    description: 'Introduces two interactive maps: a State Resources Tool for finding funding including opioid settlement money, and a County Assessment Tool showing recovery ecosystem resources county by county.' },

  { vol: 32, year: 2022, month: 11, file: 'Private/2022-11 Power of Gratitude.pdf',
    tags: ['recovery_support', 'self_care'],
    description: 'Dr. Joel Wong of Indiana University on the transformative power of gratitude — how gratitude practice actually works, how recovery home residents benefit, and one woman’s account of it.' },

  { vol: 33, year: 2022, month: 12, file: 'Private/2022-12 Faith-Based Partnerships.pdf',
    tags: ['recovery_ecosystems', 'recovery_support'],
    description: 'Dr. Matt Johnson, the Fletcher Group’s Director of Faith-Based Initiatives, on partnering with faith-based organizations — the barriers that keep them apart from recovery providers, and the steps to take now.' },

  { vol: 35, year: 2023, month: 2, file: 'Private/2023-02 Write Winning Grants.pdf',
    tags: ['funding'],
    description: 'Grant-writing expert Pam Baston on winning proposals: what to say and how to say it, when to start, the mistakes that sink an application, and how to find both grants and evaluators.' },

  { vol: 36, year: 2023, month: 3, file: 'Private/2023-03 Networking Tips.pdf',
    tags: ['workforce', 'recovery_ecosystems'],
    description: 'Rural networking expert Karen Atkins on networking as giving rather than taking — naming the fear, keeping it genuine, and knowing when and where to make the connection.' },

  { vol: 37, year: 2023, month: 4, file: 'Private/2023-04 The Phoenix.pdf',
    tags: ['recovery_support', 'social_model'],
    description: 'Profiles The Phoenix, the sober active community whose 200,000-plus members build recovery through free classes and events, and what its virtual offerings mean for rural communities.' },

  { vol: 38, year: 2023, month: 5, file: 'Private/2023-05 SMART Recovery Life Skills.pdf',
    tags: ['recovery_support', 'rh_management'],
    description: 'How SMART Recovery’s evidence-based meetings and life-skills tools work, and how rural recovery homes can bring the program in free of charge through HRSA and the Elevance Health Foundation.' },

  { vol: 39, year: 2023, month: 6, file: 'Private/2023-06 Finding Donors.pdf',
    tags: ['funding'],
    description: 'Dr. Bill Stanczykiewicz of the Lilly Family School of Philanthropy on individual giving — where to find donors even in low-income rural areas, how to make the ask, and the stewardship that keeps them.' },

  { vol: 40, year: 2023, month: 7, file: 'Private/2023-07 Economic Calculator.pdf',
    tags: ['funding', 'fgi_services'],
    description: 'Introduces the Fletcher Group Economic Calculator, which quantifies a recovery home’s costs and benefits for grant proposals, funders and ROI projections — what it needs from you and how to start.' },

  { vol: 41, year: 2023, month: 8, file: 'Private/2023-08 Recovery Housing Legislation.pdf',
    tags: ['rh_policies', 'funding'],
    description: 'New federal and state legislation affecting recovery housing, including $5 million for state recovery housing efforts and expanded access to medication-assisted treatment, with advocacy tips and state models.' },

  { vol: 42, year: 2023, month: 9, file: 'Private/2023-09 Recovery Allies.pdf',
    tags: ['recovery_support', 'recovery_ecosystems'],
    description: 'Recovery Allies author Alison Webb on recovery capital in its personal, social and community forms, and the actions allies can take — marking Recovery Month and the 60 million Americans in recovery.' },

  { vol: 43, year: 2023, month: 10, file: 'Private/2023-10 Value-Based Care Model.pdf',
    tags: ['funding', 'rh_policies'],
    description: 'Explains the shift from volume to value in healthcare payment, what value-based care could mean for recovery housing, and real-world examples of the model already working.' },

  { vol: 44, year: 2023, month: 11, file: 'Private/2023-11 Veterans in Recovery.pdf',
    tags: ['recovery_support', 'reentry'],
    description: 'Veterans in recovery: the poverty, homelessness and healthcare gaps facing them, the misconceptions and stigma they meet, and the case for hiring veterans into recovery work.' },

  { vol: 45, year: 2023, month: 12, file: 'Private/2023-12 Confidentiality.pdf',
    tags: ['operations', 'rh_management'],
    description: 'Why confidentiality is a sacred duty in recovery, the legal and ethical obligations it carries, and the particular difficulty of privacy in rural communities where everyone knows everyone.' },

  { vol: 46, year: 2024, month: 1, file: 'Private/2024-01 Year in Review 2023.pdf',
    tags: ['research', 'fgi_services'],
    description: 'The Fletcher Group’s 2023 in review — research into best practices for a largely unregulated field, employment as recovery capital, and the tools released that year.' },

  { vol: 47, year: 2024, month: 2, file: 'Private/2024-02 ASAM Criteria Changes.pdf',
    tags: ['rh_policies', 'research'],
    description: 'ASAM’s revised criteria recognise recovery housing as part of the evidence-based continuum of care for the first time. What changed, what did not, and what it means for operators.' },

  { vol: 48, year: 2024, month: 3, file: 'Private/2024-03 Deeper Look at ASAM Changes.pdf',
    tags: ['rh_policies', 'funding'],
    description: 'A closer look at the ASAM changes: finding a common language with clinicians and insurers, measuring success with tools like the BARC-10, and what to do now to be ready for the funding.' },

  { vol: 49, year: 2024, month: 4, file: 'Private/2024-04 Recovery Community Organizations.pdf',
    tags: ['recovery_ecosystems', 'social_model'],
    description: 'Donald McDonald of JBS International on Recovery Community Organizations — the many forms of mutual aid beyond 12-step, the many paths to recovery, and the resources RCOs put within reach.' },

  { vol: 50, year: 2024, month: 5, file: 'Private/2024-05 Brain Science of Addiction.pdf',
    tags: ['research', 'recovery_support'],
    description: 'University of Kentucky researcher Dr. Alex Elswick on what neuroimaging reveals about addiction and the brain’s reward system, told alongside his own recovery journey.' },

  { vol: 51, year: 2024, month: 6, file: 'Private/2024-06 New Perspective on Recovery.pdf',
    tags: ['recovery_support', 'social_model'],
    description: 'Dr. Alex Elswick argues that rock bottom is not the answer, that some enabling is a good thing, and that demanding sobriety before housing is punishment by another name.' },

  { vol: 52, year: 2024, month: 7, file: 'Private/2024-07 Landlord Tenant Issues.pdf',
    tags: ['operations', 'rh_management'],
    description: 'Attorney Brandon Pauley on landlord/tenant law for recovery homes — the basics, the duties running both ways, and the compliance traps that catch operators who never put it in writing.' },

  { vol: 53, year: 2024, month: 8, file: 'Private/2024-08 Compliance Challenges.pdf',
    tags: ['operations', 'rh_policies'],
    description: 'Healthcare attorneys Daphne Kackloudis and Jordan Burdick on the regulatory maze facing homes that also provide treatment, including kickback risk for dual operations, with compliance checklists.' },

  { vol: 54, year: 2024, month: 9, file: 'Private/2024-09 Sex Trafficking Survivors.pdf',
    tags: ['recovery_support', 'mental_health'],
    description: 'Sarah Medina of Refuge for Women on recognising sex trafficking, understanding what survivors carry, and the trauma-informed aftercare a recovery home can provide.' },

  { vol: 55, year: 2024, month: 10, file: 'Private/2024-10 Public Speaking.pdf',
    tags: ['workforce', 'self_care'],
    description: 'Dr. Matt Johnson on the mindset, skillset and toolset of telling your story in public, and what to do about the public speaking anxiety that ranks ahead of spiders and dentists.' },

  { vol: 56, year: 2024, month: 11, file: 'Private/2024-11 HIPAA Compliance.pdf',
    tags: ['operations', 'rh_policies'],
    description: 'A practical guide to confidentiality law for recovery homes — first compliance steps, how HIPAA and 42 CFR Part 2 differ, your obligations under each, and a downloadable release form.' },

  { vol: 57, year: 2024, month: 12, file: 'Private/2024-12 The Healing Place.pdf',
    tags: ['recovery_ky_model', 'social_model'],
    description: 'The story of The Healing Place in Louisville — the peer-driven model that inspired Recovery Kentucky and then the Fletcher Group — and a tribute to its founder Jay Davidson.' },

  // --- Already in S3 from scripts/seed-newsletters.js: description + tags only.
  { vol: 58, year: 2025, month: 9, file: null,
    tags: ['rh_management', 'self_care'],
    description: 'Conflict resolution expert Sal Corbin on why avoiding conflict carries its own cost, the skillset for handling it, and what to actually do in the moment.' },

  { vol: 59, year: 2025, month: 10, file: null,
    tags: ['reentry', 'recovery_ecosystems'],
    description: 'TASC’s Jac Charlier and Guy Farina on deflection — the six pathways that route people to treatment instead of arrest, the rural obstacles, and how to start a program.' },

  { vol: 60, year: 2025, month: 11, file: null,
    tags: ['funding', 'fgi_services'],
    description: 'Funding is the number one challenge recovery homes name. Dr. Fletcher on the blended-funding model behind Recovery Kentucky, the Economic Calculator, and where else to look.' },

  { vol: 61, year: 2025, month: 12, file: null,
    tags: ['recovery_support', 'establishing_rh'],
    description: 'PEARL and its Grace House women’s centre in rural Franklin County, Virginia, which houses pregnant and postpartum women in recovery an hour’s drive from the nearest services.' },

  { vol: 62, year: 2026, month: 1, file: null,
    tags: ['recovery_support', 'research'],
    description: 'OpenRecovery’s Zachary Gidwitz and Alex Weber on what AI in recovery is and is not, how to get it right, and an introduction to Kai — including how readers can shape it.' },

  { vol: 63, year: 2026, month: 2, file: null,
    tags: ['recovery_support', 'mental_health'],
    description: 'Three non-pharmaceutical withdrawal management tools — AcuDetox acupuncture, biofeedback training and neuro-electrode treatment — and why none of them stands alone.' },

  { vol: 64, year: 2026, month: 3, file: null,
    tags: ['mental_health', 'self_care'],
    description: 'Cecily McMillan, author of The Scars of the Chosen, on trauma as an inside job, why our hardest habits are survival strategies, and a three-part resiliency toolkit.' },

  // --- New public issues.
  { vol: 65, year: 2026, month: 4, file: 'FLETCHER-GROUP-RCOE-APRIL-2026-NEWSLETTER.pdf',
    tags: ['social_model', 'recovery_support'],
    description: 'Tara Moseley Hyde on Community-Based Recovery Support Services — why the medical and social models work best together rather than in competition, and recovery as a “we thing.”' },

  { vol: 66, year: 2026, month: 5, file: 'FLETCHER-GROUP-RCOE-MAY-2026-NEWSLETTER.pdf',
    tags: ['rh_management', 'mental_health'],
    description: 'Carmin Long and Alan Muia on resident behaviour in rural recovery homes — taming the “lizard brain,” the distinction between the person and the behaviour, and a worksheet to work it through.' },

  { vol: 67, year: 2026, month: 6, file: 'FLETCHER-GROUP-RCOE-JUNE-2026-NEWSLETTER.pdf',
    tags: ['funding'],
    description: 'Seed Sower CEO Jay Phillips on braided funding — why grants alone leave a non-profit precarious, how a revenue-positive transport service pays for recovery housing, and data-driven storytelling.' },

  { vol: 68, year: 2026, month: 7, file: 'FLETCHER-GROUP-RCOE-JULY-2026-NEWSLETTER.pdf',
    tags: ['mental_health', 'recovery_support'],
    description: 'Co-occurring disorder expert Geoff Wilson on dual diagnosis — how common it is, the barriers that keep it untreated, and what works best in rural communities.' },
];

async function main() {
  // Guard the two things that would silently corrupt the series: a duplicate
  // or missing volume, and a source file that is not where the table says.
  const vols = ISSUES.map((i) => i.vol);
  if (new Set(vols).size !== vols.length) throw new Error('duplicate volume number in ISSUES');
  for (const issue of ISSUES) {
    if (issue.file && !fs.existsSync(path.join(DIR, issue.file))) {
      throw new Error(`missing source PDF: ${issue.file}`);
    }
  }

  const summary = [];

  for (const issue of ISSUES) {
    const month = MONTHS[issue.month - 1];
    const title = `RCOE ${month} ${issue.year} Newsletter`;
    const slug = `rcoe-${month.toLowerCase()}-${issue.year}-newsletter`;
    const s3Key = `newsletters/fletcher-group-${slug}.pdf`;
    const publishedAt = `${issue.year}-${String(issue.month).padStart(2, '0')}-01`;

    if (issue.file && !dry) {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: fs.readFileSync(path.join(DIR, issue.file)),
        ContentType: 'application/pdf',
      }));
    }

    if (!dry) {
      // s3_key is written for every row, which normalises the one issue that
      // did not follow the convention: February 2026 was seeded as
      // "Fletcher Group Inc. RCOE February 2026 Newsletter" and its object as
      // .../fletcher-group-inc-rcoe-february-2026-newsletter.pdf. Writing the
      // canonical key first pointed that row at nothing, so the object was
      // copied to the canonical key on 2026-08-13. The `-inc-` object is still
      // in the bucket, now orphaned, and can be deleted once this is settled.
      const [resource] = await sql`
        INSERT INTO resources (title, slug, type, description, s3_key,
                               topic_tags, audience_tags, published, published_at)
        VALUES (${title}, ${slug}, 'newsletter', ${issue.description}, ${s3Key},
                ${issue.tags}, ${[]}, true, ${publishedAt})
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title, description = EXCLUDED.description,
          s3_key = EXCLUDED.s3_key, topic_tags = EXCLUDED.topic_tags,
          published = EXCLUDED.published, published_at = EXCLUDED.published_at,
          updated_at = now()
        RETURNING id`;

      await sql`INSERT INTO resource_visibility (resource_id, tenant_id)
                SELECT ${resource.id}, id FROM tenants WHERE slug = 'fgi'
                ON CONFLICT DO NOTHING`;
    }

    summary.push({
      vol: issue.vol,
      slug: slug.replace('-newsletter', ''),
      pdf: issue.file ? 'uploaded' : 'already in S3',
      tags: issue.tags.join(','),
      desc: issue.description.length,
    });
  }

  console.table(summary);
  const uploaded = summary.filter((s) => s.pdf === 'uploaded').length;
  console.log(`${dry ? '[dry] ' : ''}${summary.length} issues, vols ${vols[0]}-${vols[vols.length - 1]}; ` +
              `${uploaded} PDFs uploaded, ${summary.length - uploaded} already hosted`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
