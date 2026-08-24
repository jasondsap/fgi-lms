// Loads the Recovery Ecosystem Radio episodes from
// `docs/final build/Podcast/Podcasts/` — MP3s to S3, episode rows + guests to
// Neon. Run: node scripts/load-podcasts.js [--dry]
//
// Skips "Jennifer's working folder - do not load" (Eps 4-5 in progress) and the
// Trailer's 196MB social MP4 (its Information.docx says "MP3 or MP4 — same
// audio", so only the 1.9MB MP3 is hosted).
//
// Titles, descriptions, dates and guest details are from each folder's
// Information.docx. Two editorial notes:
//   - Episode 2's docx title has no "Episode 2:" prefix while every other
//     episode carries its own label; the prefix is added here to match the
//     series (the folder name confirms the number).
//   - Ernie Fletcher's bio is from Jennifer's shell mockup, which carries his
//     real fletchergroup.org bio (unlike the webinar mockups' PsychArmor
//     filler); the docx itself has no bio text.
//
// Guests upsert into `presenters` by lower(name) — the same table the
// webinars use, so a repeat guest keeps one row. Idempotent on slug.
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
const DIR = path.join(__dirname, '..', 'docs', 'final build', 'Podcast', 'Podcasts');
const dry = process.argv.includes('--dry');

const GUESTS = {
  ernie: {
    name: 'Ernie Fletcher',
    credentials: 'MD',
    title: 'Co-Founder and Chief Medical Officer, Fletcher Group, Inc.',
    bio: 'Fighter pilot, physician, statesman and healthcare visionary, Ernie was ' +
         'elected in 1998 to the first of three consecutive terms in the United ' +
         'States House of Representatives. In 2003, he was elected the 60th ' +
         'Governor of Kentucky. As the founder of the Fletcher Group, Ernie ' +
         'continues a legacy of public service and innovations in health and ' +
         'human services that promises to extend sustainable models of recovery ' +
         'service supports and recovery residences.',
    photo_url: '/images/presenters/ernie-fletcher.webp',
    org_name: 'Fletcher Group, Inc.',
    org_logo_url: '/images/logos/fgi-logo-tagline.png',
    org_url: 'https://www.fletchergroup.org',
  },
  kelly: {
    name: 'John F. Kelly',
    credentials: 'PhD',
    title: 'Elizabeth R. Spallin Professor of Psychiatry in Addiction Medicine, ' +
           'Harvard Medical School; Founder and Director, Recovery Research Institute',
    // Bio + RRI logo supplied by Jennifer 8-22; keep in sync with the
    // presenters row.
    bio: 'Dr. Kelly is the Elizabeth R. Spallin Professor of Psychiatry in ' +
      'Addiction Medicine at Harvard Medical School — the first endowed ' +
      'professor in addiction medicine at Harvard — and Founder and Director ' +
      'of the Recovery Research Institute at Massachusetts General Hospital. ' +
      'A leading figure in addiction psychology, he has published over 300 ' +
      'peer-reviewed works, contributed to the U.S. Surgeon General\'s Report ' +
      'on Alcohol, Drugs, and Health, and received numerous lifetime ' +
      'achievement awards for his research on addiction treatment, recovery, ' +
      'and reducing stigma.',
    photo_url: '/images/presenters/john-kelly.webp',
    org_name: 'Recovery Research Institute',
    org_logo_url: '/images/presenters/recovery-research-institute.webp',
    org_url: 'https://www.recoveryanswers.org',
  },
  dona: {
    name: 'Dona Dmitrovic',
    credentials: null,
    title: "Acting Director, Office of Recovery, SAMHSA",
    // Bio supplied by Jennifer 8-22; keep in sync with the presenters row.
    bio: 'Dona Dmitrovic is currently serving as the Acting Director of the ' +
      'Office of Recovery. She is an accomplished behavioral health leader ' +
      'with more than 39 years of experience in the substance use prevention, ' +
      'treatment, and recovery field. Prior to her current role, Ms. ' +
      'Dmitrovic served as Senior Advisor for Recovery, where she advanced ' +
      'recovery initiatives across the agency. She also served as Director ' +
      'of the Center for Substance Abuse Prevention (CSAP), providing ' +
      'executive leadership for federal efforts to strengthen the nation\'s ' +
      'behavioral health through evidence-based prevention strategies. ' +
      'Throughout her career, Ms. Dmitrovic has played a key role in ' +
      'developing and implementing programs that support individuals with ' +
      'substance use and mental health conditions and advance ' +
      'recovery-centered systems of care.',
    photo_url: '/images/presenters/dona-dmitrovic.webp',
    org_name: "SAMHSA Office of Recovery",
    org_logo_url: null,
    org_url: 'https://www.samhsa.gov/about/offices-centers/or',
  },
};

// duration is ceil(minutes) from each Information.docx (1m22s, 14m26s, 52m,
// 33m, 30m). published_at is the release date the docx states.
const EPISODES = [
  {
    slug: 'recovery-ecosystem-radio-trailer',
    title: 'Trailer: Introducing Recovery Ecosystem Radio, an FGI Podcast',
    file: 'Trailer/Podcast Trailer.MP3',
    duration: 2, released: '2026-07-15',
    tags: ['recovery_ecosystems'],
    guest: null,
    // The Trailer docx has no description; this one is written from the show's
    // own About copy so the library card and search have something honest.
    description:
      'The trailer for Recovery Ecosystem Radio, a Fletcher Group podcast ' +
      'hosted by Tony White about building communities where recovery is not ' +
      'the exception — it is the expectation.',
  },
  {
    slug: 'recovery-ecosystem-radio-opening-episode',
    title: 'Opening Episode: Recovery is the Expectation: Introducing Recovery Ecosystem Radio',
    file: 'Opening Episode Introducing Recovery Ecosystem Radio/00 Recovery Ecosystem Podcast - Ep1 1st EDIT (1) _opening launch.mp3',
    duration: 15, released: '2026-07-15',
    tags: ['recovery_ecosystems', 'social_model', 'recovery_support'],
    guest: null,
    description:
      'In this opening episode, host Tony White shares part of his own recovery ' +
      'journey and introduces the heart of the podcast: what it takes for whole ' +
      'communities to become places where recovery is not the exception; it is ' +
      'the expectation.\n' +
      'The episode defines a recovery ecosystem, explores Health, Home, Purpose, ' +
      'and Community, and highlights the role of lived experience, peer ' +
      'leadership, warm handoffs, recovery housing, pre-arrest deflection and ' +
      'diversion, reentry, and community connection in building long-term recovery.\n' +
      'Listen in and join us as we begin the conversation about building ' +
      'recovery-ready communities where people do not have to recover alone.',
  },
  {
    slug: 'recovery-ecosystem-radio-episode-1',
    title: 'Episode 1: Health, Housing and Hope: A Conversation with Governor Ernie Fletcher',
    file: 'Episode 1 Health, Housing & Hope/01 Recovery Ecosystem Podcast - Ernie Fletcher - Ep1 2nd EDIT NEW.mp3',
    duration: 52, released: '2026-07-15',
    tags: ['recovery_ecosystems', 'social_model'],
    guest: 'ernie',
    description:
      'Tony White sits down with Governor Ernie Fletcher, physician, former ' +
      'Governor of Kentucky, and co-founder of the Fletcher Group, to explore ' +
      'the origins of FGI and the first dimension of recovery: Health.\n' +
      'Together, they discuss how the medical model of treatment and the ' +
      'peer-led Social Experiential Model of Recovery can work in tandem within ' +
      'a true recovery ecosystem that connects treatment, recovery housing, ' +
      'lived experience, and community support.',
  },
  {
    slug: 'recovery-ecosystem-radio-episode-2',
    title: 'Episode 2: From Crime to Clinic to Community: Building Recovery Ecosystems That Work',
    file: 'Episode 2 From Crime to Clinic to Community/00 Recovery Ecosystem Podcast - Ep2 1st EDIT (1) _John Kelly.mp3',
    duration: 33, released: '2026-07-15',
    tags: ['recovery_ecosystems', 'social_model', 'research', 'recovery_support'],
    guest: 'kelly',
    description:
      'This episode features Dr. John F. Kelly, Elizabeth R. Spallin Professor ' +
      'of Psychiatry in the Field of Addiction Medicine at Harvard Medical ' +
      'School and Founder and Director of the Massachusetts General Hospital ' +
      'Recovery Research Institute.\n' +
      'Together, we explore recovery as a long-term, community-supported ' +
      'process, and why strong “fluid linkages” between treatment, mutual-help, ' +
      'recovery housing, peer support, and community-based recovery services ' +
      'are essential.\n' +
      'Dr. Kelly discusses recovery capital, the Social Model of Recovery, ' +
      'Alcoholics Anonymous, Twelve-Step Facilitation research, expanding the ' +
      'menu of recovery options, and how communities can help people move from ' +
      'crisis and system involvement toward Health, Home, Purpose, and Community.\n' +
      '“Recovery is more than putting the fire out. It’s about helping people rebuild.”',
  },
  {
    slug: 'recovery-ecosystem-radio-episode-3',
    title: 'Episode 3: Policy, Peers, and the Connective Tissue of Recovery',
    file: 'Episode 3 Dona/01 Recovery Ecosystem Podcast - Ep3 1st EDIT - Dona Dimitrovic.mp3',
    duration: 30, released: '2026-08-15',
    tags: ['recovery_ecosystems', 'recovery_support', 'funding'],
    guest: 'dona',
    description:
      'Tony White sits down with Dona Dmitrovic, Acting Director of the Office ' +
      'of Recovery at SAMHSA, to explore how policy, services, and lived ' +
      'experience can work together to support long-term recovery.\n' +
      'This episode looks at SAMHSA’s Four Dimensions of Recovery — Health, ' +
      'Home, Purpose, and Community — and how communities can build the ' +
      '“connective tissue” people need: no-wrong-door access, warm handoffs, ' +
      'full-circle follow-through, quality recovery housing, and peer support.\n' +
      'Listen in for a conversation about turning recovery from an individual ' +
      'journey into a community-supported recovery pathway.',
  },
];

async function upsertGuest(guest) {
  const [existing] = await sql`
    SELECT id FROM presenters WHERE lower(name) = lower(${guest.name}) LIMIT 1`;
  if (existing) {
    await sql`
      UPDATE presenters SET
        credentials = ${guest.credentials}, title = ${guest.title},
        bio = COALESCE(${guest.bio}, bio), photo_url = ${guest.photo_url},
        org_name = ${guest.org_name}, org_logo_url = ${guest.org_logo_url},
        org_url = ${guest.org_url}
      WHERE id = ${existing.id}`;
    return existing.id;
  }
  const [row] = await sql`
    INSERT INTO presenters (name, credentials, title, bio, photo_url,
                            org_name, org_logo_url, org_url)
    VALUES (${guest.name}, ${guest.credentials}, ${guest.title}, ${guest.bio},
            ${guest.photo_url}, ${guest.org_name}, ${guest.org_logo_url}, ${guest.org_url})
    RETURNING id`;
  return row.id;
}

async function main() {
  for (const ep of EPISODES) {
    const file = path.join(DIR, ep.file);
    if (!fs.existsSync(file)) throw new Error(`missing MP3: ${file}`);
  }

  const summary = [];

  for (const ep of EPISODES) {
    const file = path.join(DIR, ep.file);
    const s3Key = `podcasts/${ep.slug}.mp3`;
    const mb = (fs.statSync(file).size / 1024 / 1024).toFixed(1);

    if (!dry) {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: fs.readFileSync(file),
        ContentType: 'audio/mpeg',
      }));

      const [resource] = await sql`
        INSERT INTO resources (title, slug, type, description, s3_key,
                               duration_minutes, topic_tags, audience_tags,
                               published, published_at)
        VALUES (${ep.title}, ${ep.slug}, 'podcast', ${ep.description}, ${s3Key},
                ${ep.duration}, ${ep.tags}, ${[]}, true, ${ep.released})
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title, description = EXCLUDED.description,
          s3_key = EXCLUDED.s3_key, duration_minutes = EXCLUDED.duration_minutes,
          topic_tags = EXCLUDED.topic_tags, published = EXCLUDED.published,
          published_at = EXCLUDED.published_at, updated_at = now()
        RETURNING id`;

      await sql`INSERT INTO resource_visibility (resource_id, tenant_id)
                SELECT ${resource.id}, id FROM tenants WHERE slug = 'fgi'
                ON CONFLICT DO NOTHING`;

      if (ep.guest) {
        const guestId = await upsertGuest(GUESTS[ep.guest]);
        await sql`INSERT INTO resource_presenters (resource_id, presenter_id, sort_order)
                  VALUES (${resource.id}, ${guestId}, 1)
                  ON CONFLICT DO NOTHING`;
      }
    }

    summary.push({
      slug: ep.slug.replace('recovery-ecosystem-radio-', ''),
      mp3: `${mb} MB`,
      min: ep.duration,
      released: ep.released,
      guest: ep.guest ? GUESTS[ep.guest].name : '—',
    });
  }

  console.table(summary);
  console.log(`${dry ? '[dry] ' : ''}${summary.length} episodes processed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
