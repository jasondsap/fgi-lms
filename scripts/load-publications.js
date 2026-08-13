// Loads the peer-reviewed publications from Jennifer's 8-12-26 research sheet.
// Run: node scripts/load-publications.js [--dry]
//
// Source of truth is `scripts/data/publications-source.json`, extracted from
// `docs/final build/Publications/research - pub for LRC.xlsx` with the citation
// column's italic runs preserved (the journal name is italicised in the shell).
// Everything except the slug and the short description comes from that file, so
// re-running after a sheet update re-imports rather than re-types the content.
//
// Two columns of that sheet are compliance rules, not metadata:
//
//   "Listing Status in LMS"  — anything other than Public loads with
//                              published = false. Four rows are Private today
//                              (one awaiting HRSA approval, three never
//                              submitted); the row is ready, the page is not
//                              reachable, and approval is one UPDATE away.
//   "Public Access Status"   — "No" means the publisher does not permit us to
//                              host the PDF. Those rows get the DOI link only,
//                              and no PDF is uploaded even if a file exists.
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
const PDF_DIR = path.join(__dirname, '..', 'docs', 'final build', 'Publications');
const SOURCE = path.join(__dirname, 'data', 'publications-source.json');
const dry = process.argv.includes('--dry');

/**
 * Slug and card description per publication, keyed by the sheet's row order.
 * The descriptions are written from each abstract — short on purpose: this is
 * what the cards, the search and the AI assistant see (the full text lives in
 * `abstract`).
 */
const EDITORIAL = [
  {
    slug: 'smart-life-skills-in-rural-recovery-housing',
    description: 'What helped and what got in the way when rural recovery houses adopted SMART’s Successful Life Skills program, a 12-session curriculum that combines behavioral tools with the social model of recovery. Draws out implementation lessons for any house considering structured programming.',
  },
  {
    slug: 'recovery-ecosystems-and-overdose-mortality',
    description: 'A county-level analysis pairing drug overdose mortality with the Recovery Ecosystem Index, a 14-indicator measure of how strong a county’s recovery ecosystem is, to test whether stronger ecosystems track with lower overdose deaths.',
  },
  {
    slug: 'recovery-housing-closure-risk-covid-19',
    description: 'Which recovery houses were most at risk of closing during COVID-19. Survey data and a probit model point to the populations a house serves, the policies it adopted, and where it is located.',
  },
  {
    slug: 'covid-19-impact-on-rural-recovery-housing',
    description: 'A 2020 national survey of Oxford House and NARR-affiliated operators on what COVID-19 did to recovery housing — resident access, mitigation strategies, finances, and the well-being of residents and staff — compared across rural and non-rural houses.',
  },
  {
    slug: 'business-of-recovery-operating-costs-and-funding',
    description: 'What it actually costs to run recovery housing. A national survey of 408 organizations operating 1,458 houses, estimating annual operating costs, where the money goes, and which revenue sources the industry depends on.',
  },
  {
    slug: 'engagement-and-retention-justins-place',
    description: 'An evaluation of St. Matthew’s House Justin’s Place Recovery Program and its motivational, discovery and transitional tracks, testing whether completing the program is associated with retention, reduced return to use, restored family relationships and employment.',
  },
  {
    slug: 'recovery-capital-outcomes-access-to-recovery',
    description: 'Whether Kentucky’s Access to Recovery program built recovery capital over time, tracked across four points as participants used recovery housing, transportation support and help meeting basic needs.',
  },
  {
    slug: 'perceived-agency-and-paternalism-in-sud-support',
    description: 'An experiment testing how portraying people in recovery as having high or low agency changes what donors give — and whether they route that money to recovery houses or directly to individuals.',
  },
  {
    slug: 'retention-in-oxford-houses-scoping-review',
    description: 'A scoping review across five databases of what is known about how long residents stay in Oxford Houses and other recovery housing, and how retention is defined and measured in the literature.',
  },
  {
    slug: 'contingency-management-in-rural-recovery-housing',
    description: 'Recommendations from a national expert panel on bringing contingency management into rural recovery houses, where dropout rates run high — covering the practical and ethical questions implementation raises.',
  },
  {
    slug: 'benefits-and-costs-modeling-tool',
    description: 'A customizable economic model that lets a recovery program estimate its own costs, benefits and return on investment, accounting for operating and capital costs, location, size and success rate.',
  },
  {
    slug: 'addressing-rural-and-non-rural-sud-stigma',
    description: 'Evidence from a national randomized trial (N = 2,721) on whether education about recovery housing and personal recovery stories reduce stigma differently in rural and non-rural communities.',
  },
  {
    slug: 'facts-and-recovery-stories-to-reduce-stigma',
    description: 'A randomized study of five message conditions — education about recovery housing, and a personal recovery story told as identified text, anonymous text or video — measuring the effect on stigma and on support for recovery housing.',
  },
  {
    slug: 'case-for-a-recovery-surveillance-system',
    description: 'Focus interviews with recovery house representatives about the data they already collect at house and resident level, and what a recovery-related surveillance system would add.',
  },
  {
    slug: 'quality-and-outcome-measures-for-recovery-housing',
    description: 'Proposes a tiered matrix of quality and outcome measures that recovery housing providers can adopt at their own capacity level, filling the gap left by clinical SUD quality measures that do not fit recovery support services.',
  },
  {
    slug: 'state-level-support-for-recovery-housing',
    description: 'A national collaborative study of Single State Agencies — 48 of 51 responded — on how states support recovery housing and where it sits inside state-managed SUD service systems.',
  },
  {
    slug: 'fletcher-recovery-housing-alliance-measure',
    description: 'The psychometric properties of the Fletcher Recovery Housing Alliance Measure (FRHAM-12), a 12-item instrument for the sense of connection between residents that shared lived experience is meant to build.',
  },
  {
    slug: 'rural-vs-urban-recovery-housing-characteristics',
    description: 'A survey of Kentucky recovery houses comparing rural and urban programs and policies against NARR standards, including disability provisions, clinical service requirements and return-to-use policies.',
  },
  {
    slug: 'technical-assistance-needs-of-recovery-residences',
    description: 'A national survey of recovery residence owners and operators on where they most need technical assistance and training.',
  },
  {
    slug: 'financial-landscape-of-recovery-housing',
    description: 'Estimates the size of the recovery housing industry from 2020 survey data: roughly $250,000 in annual revenue per house and $4.5 billion nationally, broken down by revenue source for rural and non-rural houses.',
  },
  {
    slug: 'physician-barriers-to-treating-sud',
    description: 'A Kentucky pilot survey comparing waivered and non-waivered physicians on the barriers they face to prescribing medication for opioid use disorder.',
  },
];

const cell = (row, name) => (row[name]?.text ?? '').trim();
const cellHtml = (row, name) => (row[name]?.html ?? '').trim();

/** The sheet's header for this column carries its own explanation, so match loosely. */
function accessStatus(row) {
  const key = Object.keys(row).find((k) => k.startsWith('Public Access Status'));
  return key ? (row[key]?.text ?? '').trim() : '';
}

/** Abstracts often open with a bare "Abstract" label; the page already says so. */
function cleanAbstract(text) {
  return text
    .replace(/^\s*Abstract\s*[\r\n:]+/i, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

async function main() {
  const rows = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  if (rows.length !== EDITORIAL.length) {
    throw new Error(`sheet has ${rows.length} rows but ${EDITORIAL.length} slugs are defined`);
  }

  const summary = [];

  for (const [i, row] of rows.entries()) {
    const { slug, description } = EDITORIAL[i];
    const title = cell(row, 'Title');
    const status = cell(row, 'Listing Status in LMS');
    const published = /^public$/i.test(status);
    const pdfName = cell(row, 'PDF in SP');
    const mayHostPdf = /^yes$/i.test(accessStatus(row));
    const year = cell(row, 'Date').match(/\d{4}/)?.[0];

    let s3Key = null;
    if (pdfName && mayHostPdf) {
      const file = path.join(PDF_DIR, pdfName);
      if (!fs.existsSync(file)) {
        console.log(`   !! PDF listed but missing on disk: ${pdfName}`);
      } else {
        s3Key = `publications/${slug}.pdf`;
        if (!dry) {
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET, Key: s3Key,
            Body: fs.readFileSync(file), ContentType: 'application/pdf',
          }));
        }
      }
    } else if (pdfName && !mayHostPdf) {
      console.log(`   -- ${slug}: PDF supplied but publisher access is "No" — not uploaded`);
    }

    if (!dry) {
      const [resource] = await sql`
        INSERT INTO resources (title, slug, type, description, abstract, citation,
                               external_url, s3_key, published, published_at)
        VALUES (${title}, ${slug}, 'paper', ${description},
                ${cleanAbstract(cell(row, 'Abstract'))},
                ${cellHtml(row, 'citation for LRC - journal italicized')},
                ${cell(row, 'DOI/Link') || null}, ${s3Key},
                ${published}, ${year ? `${year}-01-01` : null})
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title, description = EXCLUDED.description,
          abstract = EXCLUDED.abstract, citation = EXCLUDED.citation,
          external_url = EXCLUDED.external_url, s3_key = EXCLUDED.s3_key,
          published = EXCLUDED.published, published_at = EXCLUDED.published_at,
          updated_at = now()
        RETURNING id`;

      await sql`INSERT INTO resource_visibility (resource_id, tenant_id)
                SELECT ${resource.id}, id FROM tenants WHERE slug = 'fgi'
                ON CONFLICT DO NOTHING`;
    }

    summary.push({
      slug: slug.slice(0, 44),
      year,
      published,
      pdf: s3Key ? 'hosted' : (pdfName ? 'withheld' : 'link only'),
      abstract: cleanAbstract(cell(row, 'Abstract')).length,
      citation: cellHtml(row, 'citation for LRC - journal italicized').includes('<em>') ? 'italic' : 'plain',
    });
  }

  console.table(summary);
  const live = summary.filter((s) => s.published).length;
  console.log(`${dry ? '[dry] ' : ''}${live} published, ${summary.length - live} held back; ` +
              `${summary.filter((s) => s.pdf === 'hosted').length} PDFs hosted`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
