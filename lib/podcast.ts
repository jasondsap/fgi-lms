// =============================================================================
// Recovery Ecosystem Radio — show-level data for the podcast shell (8-18-26)
// =============================================================================
// Everything here is true of the *show*, not of one episode, so it lives in
// code rather than in a resources row: the host, the tagline, the info-modal
// copy, the platform links and the production credit. Episode-level data
// (title, description, guest, audio, release date) stays in Neon.
//
// Copy is verbatim from Jennifer's "Recovery Ecosystem Radio - information
// for LRC 8-18-26.docx" and "page info.docx" (docs/final build/Podcast/
// Podcast Update) — edit there first, then mirror here.

/** One content block inside an info modal: a paragraph or a bullet list. */
export type PodcastInfoBlock = string | string[];

export interface PodcastInfoSection {
  heading?: string;
  blocks: PodcastInfoBlock[];
}

export const SHOW_TITLE = 'Recovery Ecosystem Radio';

/** One line in the 8-18-26 mockup (was two on the 8-12 shell). */
export const SHOW_TAGLINE =
  'Building communities where Recovery is Not the Exception, It IS the Expectation';

/** The RER banner logo (8-18-26) — replaces the title text + square cover art. */
export const SHOW_LOGO = '/images/podcast/rer-logo.webp';

/** Slug of the trailer's resources row — the shell's "Trailer" button target. */
export const TRAILER_SLUG = 'recovery-ecosystem-radio-trailer';

/** Listener mail goes to Tony's box, not the platform-support address. */
export const PODCAST_EMAIL = 'podcast@fletchergroup.org';

/** "Share your Thoughts & Ideas with Tony" — Jennifer's Monday.com form. */
export const PODCAST_FEEDBACK_FORM_URL =
  'https://forms.monday.com/forms/461c03a66ea8eb689a7a2e592e5c2543?r=use1';

/**
 * The same Monday form as an embeddable URL (8-30-26): only /forms/embed/
 * omits Monday's frame-ancestors CSP, so this is the one an iframe may load.
 */
export const PODCAST_FEEDBACK_EMBED_URL =
  'https://forms.monday.com/forms/embed/461c03a66ea8eb689a7a2e592e5c2543?r=use1';

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
    // Canonical show URL per Jason 8-30 (the bare-ASIN form also resolves).
    url: 'https://music.amazon.com/podcasts/14311bb8-f04d-4762-8943-ba627db80db5/recovery-ecosystem-radio-an-fgi-podcast' },
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

// The 8-18-26 doc consolidates the shell's three former modals (About / Who
// should listen / What is a Recovery Ecosystem) into one document, and the
// 8-18 mockup shows a single "About The Podcast" button — so it all lives in
// this one modal now.
export const ABOUT_THE_PODCAST: PodcastInfoSection[] = [
  {
    blocks: [
      'Recovery Ecosystem Radio is a podcast about what it takes to build ' +
      'communities where recovery isn’t the exception — it’s the expectation.',

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

      'Produced by Fletcher Group, Inc. in partnership with Webberized, the ' +
      'podcast bridges storytelling, research, policy, and real-world ' +
      'implementation. It is part conversation, part toolkit, and part ' +
      'invitation for anyone working to build recovery-ready communities — ' +
      'where dignity replaces stigma, warm handoffs replace dead ends, and ' +
      'recovery becomes a way of life.',
    ],
  },
  {
    heading: 'Why Recovery Ecosystem Radio?',
    blocks: [
      'Each episode features lived experience, practical solutions, and ' +
      'collaborative strategies that support long-term recovery through ' +
      'Health, Home, Purpose, and Community.',

      'Listeners will hear in-depth conversations with policymakers, ' +
      'clinicians, and national leaders, including voices such as Ernie ' +
      'Fletcher and federal recovery experts from agencies including the ' +
      'Substance Abuse and Mental Health Services Administration (SAMHSA). ' +
      'These discussions explore how recovery housing, community design, and ' +
      'cross-sector collaboration can break down silos and create ' +
      'sustainable pathways to healing.',

      'This podcast will help you:',
      [
        'Learn how recovery ecosystems support long-term stability',
        'Understand how policy and funding shape recovery systems',
        'Hear real stories from leaders and people with lived experience',
      ],
    ],
  },
  {
    heading: 'Who Should Listen?',
    blocks: [
      'Whether you’re someone in recovery, a frontline responder, a ' +
      'behavioral health professional, or a policymaker shaping funding and ' +
      'systems, Recovery Ecosystem Radio offers grounded, actionable insight ' +
      'into what works and why.',

      'Ideal listeners include:',
      [
        'People in recovery or seeking support',
        'First responders, EMS, and law enforcement',
        'Recovery housing, behavioral health, and social service professionals',
        'Policymakers and funders',
      ],
      'If you’re looking to understand how recovery can move from ' +
      'isolated success stories to a scalable, community-wide reality, ' +
      'Recovery Ecosystem Radio is for you.',
    ],
  },
  {
    heading: 'What is a Recovery Ecosystem?',
    blocks: [
      'A Recovery Ecosystem, as defined by the Fletcher Group, is an ' +
      'interconnected, community-based network of people, organizations, ' +
      'policies, and resources that collectively support long-term recovery ' +
      'by addressing substance use, mental health, housing, health care, ' +
      'employment, and social connection — centered on lived experience and ' +
      'coordinated across sectors.',
    ],
  },
  {
    heading: 'What topics will you cover?',
    blocks: [
      'Each episode explores the people and partnerships making recovery ' +
      'possible: recovery housing, peers, employers, policymakers, ' +
      'researchers, pre-arrest/deflection practitioners, behavioral health ' +
      'professionals, justice and reentry partners, families, and community ' +
      'leaders. The podcast places special focus on lived experience and the ' +
      'peer-led, social experiential model of recovery — where the ' +
      'environment itself becomes the service.',
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
