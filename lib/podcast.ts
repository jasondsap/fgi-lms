// =============================================================================
// Recovery Ecosystem Radio — show-level data for the podcast shell (8-12-26)
// =============================================================================
// Everything here is true of the *show*, not of one episode, so it lives in
// code rather than in a resources row: the host, the tagline, the info-modal
// copy, the platform links and the production credit. Episode-level data
// (title, description, guest, audio, release date) stays in Neon.
//
// Copy is verbatim from Jennifer's "page info.docx" and "Your Host Info.docx"
// (docs/final build/Podcast) — edit there first, then mirror here.

/** One content block inside an info modal: a paragraph or a bullet list. */
export type PodcastInfoBlock = string | string[];

export interface PodcastInfoSection {
  heading?: string;
  blocks: PodcastInfoBlock[];
}

export const SHOW_TITLE = 'Recovery Ecosystem Radio';

/** Two lines, broken where Jennifer's mockup breaks them. */
export const SHOW_TAGLINE_LINES = [
  'Recovery Ecosystem Radio is about building communities where',
  'Recovery is Not the Exception, It IS the Expectation',
];

/** Slug of the trailer's resources row — the shell's "Trailer" button target. */
export const TRAILER_SLUG = 'recovery-ecosystem-radio-trailer';

/** Listener mail goes to Tony's box, not the platform-support address. */
export const PODCAST_EMAIL = 'podcast@fletchergroup.org';

/** "Share your Thoughts & Ideas with Tony" — Jennifer's Monday.com form. */
export const PODCAST_FEEDBACK_FORM_URL =
  'https://forms.monday.com/forms/461c03a66ea8eb689a7a2e592e5c2543?r=use1';

/**
 * Hosting-platform links for the "Find Us On" box and the footer icons — from
 * Jennifer's "podcast links.docx" (8-15-26), with the session/tracking params
 * stripped to the canonical listing URLs (each verified live before wiring).
 * The doc's Amazon link was the amazon.in *retail* page for the same catalog
 * item (ASIN B0H8LWBS6M); the US Amazon Music URL for that ASIN is used
 * instead. An entry with a null url simply doesn't render an icon, so this
 * list stays the only edit needed per platform.
 */
export interface PodcastPlatform {
  key: 'spotify' | 'apple' | 'amazon' | 'audible';
  label: string;
  url: string | null;
}

export const PODCAST_PLATFORMS: PodcastPlatform[] = [
  { key: 'spotify', label: 'Spotify',
    url: 'https://open.spotify.com/show/033KqbTdsvmoWs4kvvfnxF' },
  { key: 'apple',   label: 'Apple Podcasts',
    url: 'https://podcasts.apple.com/us/podcast/recovery-ecosystem-radio-an-fgi-podcast/id6792062382' },
  { key: 'amazon',  label: 'Amazon Music',
    url: 'https://music.amazon.com/podcasts/B0H8LWBS6M' },
  { key: 'audible', label: 'Audible',
    url: 'https://www.audible.com/podcast/Recovery-Ecosystem-Radio-an-FGI-Podcast/B0H8LWJGS1' },
];

/** Where a podcast icon lands while no platform listing exists yet. */
export const PODCAST_FALLBACK_URL = '/library?type=podcast';

// ---------------------------------------------------------------------------
// Your Host
// ---------------------------------------------------------------------------

export const PODCAST_HOST = {
  name: 'Tony White',
  title: 'Director of Outreach, Fletcher Group',
  photo: '/images/podcast/tony-white.webp',
  bio: [
    'Tony White is the host of Recovery Ecosystem Radio and a person committed ' +
    'to long-term recovery since July 8, 2003. He comes to this work through ' +
    'lived experience and years of leadership in long-term, residential, ' +
    'peer-led social model programs, walking alongside people who were ' +
    'unhoused, justice-involved, and repeatedly written off, and watching them ' +
    'become mentors, employees, parents, community, and national leaders.',

    'Tony currently serves with the Fletcher Group, partnering with recovery ' +
    'housing operators, peers, employers, treatment providers, courts, and ' +
    'community teams to expand recovery housing and strengthen recovery ' +
    'ecosystems, especially in rural communities. His style is practical and ' +
    'plain-spoken: part storytelling, part toolkit, and always grounded in ' +
    'dignity, accountability, the principles of recovery, and the belief that ' +
    'people can, and do, recover. Because many had done the same for him.',
  ],
};

// ---------------------------------------------------------------------------
// Info-modal copy
// ---------------------------------------------------------------------------

export const ABOUT_THE_PODCAST: PodcastInfoSection[] = [
  {
    blocks: [
      'Recovery Ecosystem Radio is a podcast about what it takes to really ' +
      'build communities where recovery isn’t the exception, but it is ' +
      'the expectation.',

      'Hosted by Tony White, Director of Outreach for Fletcher Group, Inc. ' +
      '(FGI), a person committed to long-term recovery. The show amplifies ' +
      'real voices, practical solutions, and community-driven strategies that ' +
      'help people move toward long-term recovery and build Health, Home, ' +
      'Purpose, and Community.',

      'Grounded in lived experience and the Social Experiential Model of ' +
      'Recovery, Recovery Ecosystem Radio highlights the people and ' +
      'partnerships making recovery possible: recovery housing, peers, ' +
      'employers, policymakers, researchers, pre-arrest/deflection ' +
      'practitioners, behavioral health professionals, justice and reentry ' +
      'partners, families, and community leaders.',

      'Produced by the Fletcher Group, Inc., in partnership with Webberized. ' +
      'The podcast bridges storytelling, research, policy, and real-world ' +
      'implementation. It is part conversation, part toolkit, and part ' +
      'invitation for anyone working to build recovery-ready communities ' +
      'where dignity replaces stigma, warm handoffs replace dead ends, and ' +
      'recovery becomes a way of life.',
    ],
  },
];

// The mockup's button says only "Who should listen"; Jennifer's page-info note
// asks for the Why as well, so the modal carries both sections.
export const WHO_SHOULD_LISTEN: PodcastInfoSection[] = [
  {
    heading: 'Why:',
    blocks: [
      'Each episode features lived experience, practical solutions, and ' +
      'collaborative strategies that support long-term recovery through ' +
      'Health, Home, Purpose, and Community.',
      [
        'Learn how recovery ecosystems support long-term stability',
        'Understand how policy and funding shape recovery systems',
        'Hear real stories from leaders and people with lived experience',
      ],
      'Listeners will hear in-depth conversations with policymakers, ' +
      'clinicians, and national leaders, including voices like Ernie Fletcher ' +
      'and federal recovery experts from agencies such as the Substance Abuse ' +
      'and Mental Health Services Administration. These discussions unpack ' +
      'how recovery housing, community design, and cross-sector collaboration ' +
      'can break down silos and create sustainable pathways to healing.',
    ],
  },
  {
    heading: 'Who:',
    blocks: [
      'Whether you’re someone in recovery, a frontline responder, a ' +
      'behavioral health professional, or a policymaker shaping funding and ' +
      'systems, this podcast offers grounded, actionable insight into what ' +
      'works and why.',
      [
        'People in recovery or seeking support',
        'First responders, EMS, and law enforcement',
        'Behavioral health and social service professionals',
        'Policymakers and funders',
      ],
      'If you’re looking to understand how recovery can move from ' +
      'isolated success stories to a scalable, community-wide reality, ' +
      'Recovery Ecosystem Radio is for you.',
    ],
  },
];

export const WHAT_IS_A_RECOVERY_ECOSYSTEM: PodcastInfoSection[] = [
  {
    blocks: [
      'We at Fletcher Group define a Recovery Ecosystem as: “An ' +
      'interconnected, community-based network of people, organizations, ' +
      'policies, and resources that collectively support long-term recovery ' +
      'by addressing substance use, mental health, housing, health care, ' +
      'employment, and social connection — centered on lived experience ' +
      'and coordinated across sectors.”',

      'Recovery Ecosystem Radio puts a special focus on the peer-led, ' +
      'social, and experiential side of recovery where environment itself ' +
      'becomes the service.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Production credit
// ---------------------------------------------------------------------------

export const WEBBERIZED = {
  name: 'Webberized',
  url: 'https://www.webberized.com',
  logo: '/images/podcast/webberized.png',
};
