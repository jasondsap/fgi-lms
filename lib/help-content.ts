// =============================================================================
// Help Center content — single source for /help and Fletch's help mode
// =============================================================================
//
// Modeled on the DDOR platform's lib/help-content.ts (Jason, 8-31-26): the
// page renders this data, and the help assistant is prompted from the same
// data (helpCorpus), so the two can never drift apart. Plain data — no JSX,
// no icons — so it can be imported server-side by the API route.
//
// Organised by visitor journey rather than role (the LRC has no user roles to
// speak of): Finding Resources → Courses & CE → Your Account → the tenant
// certification portals.
//
// Wording rule (Jason, 8-31-26): never name individual tenants — say
// "certification portal" / "partner portal" so the content stays true as
// more tenants join. The tenant-specific facts (seven-part series, cert
// pills) are common to the portal model, not to one tenant.

export interface HelpFaq {
  q: string;
  a: string;
}

export interface HelpTopic {
  /** Stable anchor id — also what the help assistant returns. */
  id: string;
  category: string;
  name: string;
  description: string;
  quickStart: string[];
  tips: string[];
  faqs: HelpFaq[];
}

export const HELP_CATEGORIES = [
  'Finding Resources',
  'Courses & CE Credits',
  'Your Account',
  'Certification Portals',
] as const;

export const HELP_TOPICS: HelpTopic[] = [
  // ── Finding Resources ─────────────────────────────────────────────────────
  {
    id: 'browse-filter',
    category: 'Finding Resources',
    name: 'Browse & Filter the Library',
    description:
      'The Library lists everything available to you. The filter bar on the left narrows it down: each section (Courses, Resource Type, Audience, Topics) expands with the arrow, and ticking boxes filters the results immediately.',
    quickStart: [
      'Open Library from the header.',
      'Click a filter section title to expand it.',
      'Tick one or more boxes — the result count at the top updates as you go.',
      'Click "Clear all" next to the result count to start over.',
    ],
    tips: [
      'Boxes within a section add together — ticking Webinars and Podcasts shows both.',
      'The first screen mixes every resource type so you get a sample of the whole library; once you filter or search, newest items come first.',
      'On a certification portal, a Certification Info section sits at the top of the filter bar.',
    ],
    faqs: [
      {
        q: 'Why do I see different items than a colleague?',
        a: 'The Fletcher Group library and each partner portal have their own catalogs. You may be browsing different libraries, and some internal items are visible only to administrators.',
      },
    ],
  },
  {
    id: 'search',
    category: 'Finding Resources',
    name: 'Search',
    description:
      'The search box above the results searches titles, descriptions, and each course’s keyword tags. It is forgiving: misspellings ("HIPPA"), plurals ("budgets"), and word forms still find the right resources.',
    quickStart: [
      'Type what you’re looking for in the search box above the results.',
      'Press Enter — the best matches rank first.',
      'Combine search with filter-bar checkboxes to narrow further.',
    ],
    tips: [
      'Describe the subject, not the exact title — "naloxone training" works even if the title says PAR.',
      'Have a resource ID? Every resource page shows one (for example "ID: ka7386"). Type the ID into the search box and that resource comes back first.',
      'If a keyword search comes up short, try Ask Fletch and describe your situation in a full sentence instead.',
    ],
    faqs: [
      {
        q: 'Do I need the exact title?',
        a: 'No. Search matches related word forms and tolerates typos, and every course carries keyword tags for common synonyms and abbreviations.',
      },
      {
        q: 'Can I search by resource ID?',
        a: 'Yes. Each resource has a six-character ID (two letters and four digits) shown on its page. Enter it in the search box, or give it to Ask Fletch, to go straight to that resource.',
      },
    ],
  },
  {
    id: 'ask-fletch',
    category: 'Finding Resources',
    name: 'Ask Fletch (AI Assistant)',
    description:
      'Fletch is the library’s AI assistant — the Ask Fletch pill in the bottom-right corner of the library pages. Describe what you’re working on in plain language and Fletch replies with the resources that fit, as clickable cards.',
    quickStart: [
      'Click the Ask Fletch pill in the bottom-right corner.',
      'Describe your situation — "I need to train new peer support staff" — or pick a starter question.',
      'Click any recommended card to open that resource.',
      'Use "↺ Start over" in the panel header to begin a fresh conversation.',
    ],
    tips: [
      'Full sentences beat keywords — Fletch matches your situation, not just words.',
      'Give Fletch a resource ID (the "ID: …" code on any resource page) and it returns that exact resource.',
      'Fletch only recommends real items from your library, so every card is safe to click.',
      'Fletch will say plainly when the library doesn’t cover something rather than guessing.',
    ],
    faqs: [
      {
        q: 'Why does Fletch ask me to sign in?',
        a: 'The assistant is available to signed-in visitors. Use the Sign In button in the header first.',
      },
    ],
  },
  {
    id: 'resource-types',
    category: 'Finding Resources',
    name: 'Resource Types',
    description:
      'Every card carries a colored type label: Courses (interactive lessons in the course player), Webinars (recorded sessions with slides and presenter info), Podcasts, Toolkits, Guidebooks & Handbooks, Newsletters, Learning Briefs, Publications & Papers, and Videos. "External Resources" are curated links from partner organizations.',
    quickStart: [
      'Use the Resource Type section of the filter bar to show only the formats you want.',
      'The colored label on each card tells you the format before you open it.',
    ],
    tips: [
      'A yellow NAADAC CE pill on a card means completing it can earn continuing-education credit.',
      'A green checkmark on a card means you’ve already completed that course.',
    ],
    faqs: [],
  },
  {
    id: 'other-libraries',
    category: 'Finding Resources',
    name: 'Other Libraries',
    description:
      'Certification-portal members have full access to the Fletcher Group library as well. The "Other Libraries" section at the bottom of the filter bar moves you between them.',
    quickStart: [
      'On your portal’s library, expand Other Libraries and click "Fletcher Group Library" — it opens in a new browser tab.',
      'To come back, expand Other Libraries in that tab and click your portal’s name — the tab closes and you’re back where you were.',
    ],
    tips: [
      'Your sign-in works across both — no need to sign in again in the new tab.',
    ],
    faqs: [],
  },

  // ── Courses & CE Credits ──────────────────────────────────────────────────
  {
    id: 'course-player',
    category: 'Courses & CE Credits',
    name: 'Taking a Course',
    description:
      'Courses open in the course player: lessons listed in the sidebar, the current item in the main pane. Work top to bottom — completed items get a checkmark, and your progress is saved to My Learning automatically.',
    quickStart: [
      'Open a course from the library and click its start button.',
      'Pick a lesson from the sidebar (or just start at the top).',
      'Watch each video to the end — a video counts as complete once you’ve watched about 90% of it.',
      'Finish with the Share Your Feedback evaluation to complete the course.',
    ],
    tips: [
      'Skipping ahead inside a video means it won’t register as watched — let it play through.',
      'Handouts and resources attached to a lesson are listed with it in the sidebar.',
      'You can leave anytime; the player remembers what you’ve completed when you return.',
    ],
    faqs: [
      {
        q: 'I watched a video but it isn’t marked complete.',
        a: 'The player needs to see about 90% of the video actually played. Reopen it, let it play through without skipping, then refresh the page.',
      },
      {
        q: 'Why is an item locked?',
        a: 'Certificates unlock after every item above them is complete. In the pre-certification video series, each video unlocks after you’ve watched the previous one.',
      },
    ],
  },
  {
    id: 'naadac-ce',
    category: 'Courses & CE Credits',
    name: 'NAADAC CE Credits',
    description:
      'Courses with the yellow NAADAC pill are approved for continuing-education credit through NAADAC, the Association for Addiction Professionals. The course page says how many CEs it carries — most are 1 CE (about 60 minutes); a few longer courses are 2 CEs.',
    quickStart: [
      'Look for the yellow NAADAC CE pill on a card, or tick "NAADAC CE" in the filter bar’s Courses section.',
      'Complete every item in the course, including the evaluation.',
      'Download your certificate from the course player — it’s your CE documentation.',
    ],
    tips: [
      'Your CE hours also total up on your My Learning page.',
    ],
    faqs: [],
  },
  {
    id: 'certificates',
    category: 'Courses & CE Credits',
    name: 'Certificates',
    description:
      'Courses that award a certificate list it as the last item in the course player. It stays locked until everything above it — every lesson, every video, and the evaluation — is complete, then it unlocks for download as a PDF.',
    quickStart: [
      'Complete every item in the course, including the Share Your Feedback evaluation.',
      'Click the certificate at the bottom of the course sidebar.',
      'Download the PDF for your records.',
    ],
    tips: [
      'If the certificate is still locked, hover it — the message tells you what’s missing.',
    ],
    faqs: [
      {
        q: 'I finished everything but the certificate is locked.',
        a: 'Most often one video didn’t register as fully watched, or the evaluation wasn’t submitted. Check the sidebar for any item without a checkmark.',
      },
    ],
  },
  {
    id: 'evaluation',
    category: 'Courses & CE Credits',
    name: 'Share Your Feedback',
    description:
      'The Share Your Feedback survey is a short 9-question evaluation. It appears at the end of each course (where it counts toward completion) and via the button on resource pages. It’s the same survey everywhere, and it directly shapes what gets added to the Learning Resource Center.',
    quickStart: [
      'In a course: open the evaluation item at the end and submit it — it’s part of completing the course.',
      'On a resource page: click Share Your Feedback anytime.',
    ],
    tips: [
      'The final question is open-ended — topic requests written there are read and used for planning.',
    ],
    faqs: [],
  },

  // ── Your Account ──────────────────────────────────────────────────────────
  {
    id: 'sign-in',
    category: 'Your Account',
    name: 'Signing In',
    description:
      'The Sign In button at the top right opens the sign-in window. Once signed in, it becomes a circle with your initials — that’s your account menu, with My Learning and Sign Out.',
    quickStart: [
      'Click Sign In at the top right.',
      'Enter your email and password.',
      'Click your initials anytime to open the account menu.',
    ],
    tips: [
      'Signing in is required to open resources, take courses, and use Ask Fletch.',
      'One account works across the Fletcher Group library and your certification portal.',
    ],
    faqs: [
      {
        q: 'How do I get an account?',
        a: 'If registration isn’t offered in the sign-in window, contact Learning Center Support at LC@fletchergroup.org and the team will set you up.',
      },
      {
        q: 'I forgot my password.',
        a: 'Use the password reset link in the sign-in window.',
      },
    ],
  },
  {
    id: 'my-learning',
    category: 'Your Account',
    name: 'My Learning',
    description:
      'My Learning (in your account menu) is your personal dashboard: courses in progress with completion percentages, finished courses, total CE hours, your bookmarks, and a downloadable transcript of everything you’ve completed.',
    quickStart: [
      'Click your initials at the top right, then My Learning.',
      'Review in-progress courses and jump back in from there.',
      'Download your transcript (CSV) for records or reporting.',
    ],
    tips: [
      'On a certification-portal account, My Learning also tracks your required-video series as a program with its own progress bar.',
    ],
    faqs: [],
  },
  {
    id: 'bookmarks',
    category: 'Your Account',
    name: 'Bookmarks',
    description:
      'The bookmark button on any resource page saves it to your list, so you can find it again without searching. Your bookmarks live on the My Learning page.',
    quickStart: [
      'Open a resource and click the bookmark button.',
      'Find everything you’ve saved under My Learning → Bookmarks.',
      'Click the bookmark button again to remove one.',
    ],
    tips: [],
    faqs: [],
  },

  {
    id: 'report-problem',
    category: 'Your Account',
    name: 'Asking a Question or Reporting a Problem',
    description:
      'Have a question, or something isn’t working? Send it from the Help page — it becomes a support ticket that Learning Center Support reads and replies to. You can follow the whole conversation and the ticket’s status under My Tickets.',
    quickStart: [
      'Open Help (the ? icon in the header) and click Question / Problem.',
      'Give it a short title, pick a category (including "Ask a question"), and write your question or describe what happened — the page you were on is captured automatically.',
      'Track replies and status anytime under My Tickets on the Help page.',
    ],
    tips: [
      'For problems, steps to reproduce help us fix it faster.',
      'You can reply inside the ticket — no email thread needed.',
    ],
    faqs: [
      {
        q: 'What do the ticket statuses mean?',
        a: 'Open — received. In progress — being worked on. Waiting on you — we need more information from you. Resolved — fixed, with a note explaining the outcome. Closed — wrapped up.',
      },
    ],
  },

  // ── Certification Portals ─────────────────────────────────────────────────
  {
    id: 'portal-basics',
    category: 'Certification Portals',
    name: 'Your Certification Portal',
    description:
      'Partner certification portals are curated views for recovery-residence certification: the header carries the Pre-Certification (and, where offered, Post-Certification) buttons, and the library’s Certification Info filter separates the Required Videos and Certification Documents from everything else.',
    quickStart: [
      'Use Home and Library in the portal header to move around.',
      'In the filter bar, expand Certification Info and tick Required Videos or Cert. Documents.',
      'A banner above the results confirms the certification view — "Show full library" takes you back to everything.',
    ],
    tips: [
      'Tick Required Videos and Cert. Documents together to see the complete certification packet in one list.',
      'Green checkmarks on the cards show which required videos you’ve already completed.',
    ],
    faqs: [],
  },
  {
    id: 'pre-cert',
    category: 'Certification Portals',
    name: 'Pre-Certification Videos',
    description:
      'The pre-certification course is a seven-part video series taken in order: each video unlocks after you’ve watched the one before it (about 90% counts as watched). The certificate unlocks after all seven plus the evaluation.',
    quickStart: [
      'Click the Pre-Certification button in the portal header.',
      'Start with Part 1 and let each video play through.',
      'Each next part unlocks as the previous one completes.',
      'Submit the evaluation, then download your certificate.',
    ],
    tips: [
      'A locked video’s tooltip says exactly what to finish first.',
      'Your progress through the series also appears on My Learning as a program.',
    ],
    faqs: [],
  },
  {
    id: 'cert-docs',
    category: 'Certification Portals',
    name: 'Certification Documents',
    description:
      'The Cert. Documents filter gathers the certification paperwork — checklists, standards, policies, and the code of ethics — so you can review or download the full set in one place.',
    quickStart: [
      'Expand Certification Info in the filter bar and tick Cert. Documents.',
      'Open any document to read it online or download it.',
    ],
    tips: [],
    faqs: [],
  },
];

export const GENERAL_FAQS: HelpFaq[] = [
  {
    q: 'Do I need an account to use the Learning Resource Center?',
    a: 'You can browse the library without one, but opening resources, taking courses, and Ask Fletch require signing in.',
  },
  {
    q: 'Does my progress carry across the Fletcher Group site and my portal?',
    a: 'Yes — it’s one account. Courses you complete show up on My Learning regardless of which library you started from.',
  },
  {
    q: 'A page or video isn’t loading properly.',
    a: 'Refresh the page first; if it persists, try another browser or clear the cache. Still stuck? Email Learning Center Support with the page you were on.',
  },
  {
    q: 'Who do I contact for help?',
    a: 'Learning Center Support: LC@fletchergroup.org. Include what you were trying to do and any message you saw.',
  },
];

export const SUPPORT_EMAIL = 'LC@fletchergroup.org';

// ── Assistant corpus ─────────────────────────────────────────────────────────

/** Topic-id → topic, for validating what the help assistant returns. */
export const HELP_TOPICS_BY_ID: Map<string, HelpTopic> = new Map(
  HELP_TOPICS.map((t) => [t.id, t]),
);

/**
 * The whole help corpus as prompt text. Small (a few thousand tokens), so —
 * exactly like the recommender's catalog — it all goes in the prompt and the
 * model can only ever cite a topic id we handed it.
 */
export function helpCorpus(): string {
  const topicText = HELP_TOPICS.map((t) => {
    const bits = [
      `id: ${t.id} | ${t.category} | ${t.name}`,
      t.description,
      t.quickStart.length ? `Steps: ${t.quickStart.join(' ')}` : '',
      t.tips.length ? `Tips: ${t.tips.join(' ')}` : '',
      ...t.faqs.map((f) => `Q: ${f.q} A: ${f.a}`),
    ].filter(Boolean);
    return bits.join('\n');
  }).join('\n\n');

  const general = GENERAL_FAQS.map((f) => `Q: ${f.q} A: ${f.a}`).join('\n');
  return `${topicText}\n\nGENERAL:\n${general}\n\nSupport email: ${SUPPORT_EMAIL}`;
}
