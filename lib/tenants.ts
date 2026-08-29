// =============================================================================
// Tenant portal configuration (Colorado, SCARR, …)
// -----------------------------------------------------------------------------
// Static, per-tenant presentation config for the co-branded landing pages at
// /<slug> (e.g. /colorado, /scarr). The DB `tenants` row owns slug/name/active
// and the resource_visibility allow-list; this file owns the rich presentation
// (logos, colors, hero copy, the "hosted on FGI" bar, the certification
// instruction block, socials, contact info) that Jennifer specced in the
// 7-21-26 tenant mockups. Rich-text fields are trusted author content rendered
// with dangerouslySetInnerHTML.
// =============================================================================

export type TenantSocialPlatform = 'facebook' | 'instagram' | 'linkedin';

export interface TenantSocial {
  platform: TenantSocialPlatform;
  href: string;
}

export type TenantHeroRight =
  | { kind: 'logo'; src: string; alt: string }
  | {
      kind: 'video';
      embedUrl: string;
      title: string;
      /**
       * Source aspect ratio, so the frame fits the video instead of
       * letterboxing it. Defaults to 16:9; set '1:1' only for a genuinely
       * square source, which 16:9 framing would pillarbox with black bars.
       */
      aspect?: '16:9' | '1:1';
    };

/** padding-top percentage that produces each aspect ratio. */
export const HERO_ASPECT_PADDING: Record<'16:9' | '1:1', string> = {
  '16:9': '56.25%',
  '1:1': '100%',
};

/**
 * Hero column width per aspect. Chosen so the *video* has comparable visual
 * area across surfaces: FGI's 16:9 renders 520×293 (~152k px²), and a square
 * at 400 renders 380×380 (~144k px²). Matching frame widths instead would
 * make the square video 44% smaller than FGI's.
 */
export const HERO_COLUMN_WIDTH: Record<'16:9' | '1:1', string> = {
  '16:9': '540px',
  '1:1': '400px',
};

/*
 * Second-generation tenant portal (Jennifer's 8-11-26 Colorado mockup), which
 * follows the rebuilt FGI homepage rather than the 7-21-26 tenant layout:
 * dark branded header with the logo in a white box, light hero with a framed
 * photo and a halftone dot ring, Latest Highlights, a light "hosted on FGI"
 * bar, a full-bleed certification band, and a dark footer.
 *
 * A tenant opts in by carrying a `v2` block. Colorado has one; SCARR does not,
 * so /scarr keeps the original layout untouched until its own mockup lands
 * (Jason, 8-11).
 */
export interface TenantV2 {
  /** Tenant's own website, in the header nav — e.g. "ORH-CO Web". */
  orgSiteLabel: string;
  orgSiteUrl: string;
  /**
   * Label for the link across to the FGI library. The mockup renames the old
   * "FGI Site" tab to "Fletcher Web"; the hosted-bar copy still says "FGI Site
   * tab", which Jennifer should reconcile.
   */
  fgiNavLabel: string;
  heroBg: string;
  /** Optional heading above the hero media (SCARR's "Why Certification"). */
  heroHeading?: string;
  heroMedia:
    | { kind: 'photo'; src: string; alt: string; width: number; height: number }
    | { kind: 'video'; embedUrl: string; title: string };
  /** Halftone dot ring behind the hero media. */
  heroDots: string;
  /**
   * Placement in the shared 470 x 410 hero unit space, measured off each
   * mockup: `media` is the framed photo/video, `ring` the halftone circle.
   */
  heroLayout: {
    media: { left: number; top: number; width: number };
    ring: { cx: number; cy: number; d: number };
  };
  /** Header/footer logo treatment — Colorado boxes its mark on white. */
  logoOnWhite: boolean;
  /**
   * 8-17-26 Colorado mockup: the black-bordered full-colour mark sits on a
   * pale-yellow field at the left of the header/footers, and the brand-navy
   * content bar gets a pill-rounded left cap sweeping around it. When set,
   * the header and both footers use this treatment and `logo` below replaces
   * the tenant's default mark in the chrome.
   */
  lobe?: { bg: string; logo: string };
  /**
   * Footer mark. `displayWidth` is the rendered width; `width`/`height` are the
   * asset's intrinsic dimensions for next/image.
   */
  footerLogo?: { src: string; width: number; height: number; displayWidth: string };
  highlightTileBg: string;
  hostedBar2: { bg: string; fg: string; buttonLabel: string };
  certification: {
    heading: string;
    bodyHtml: string;
    image: string;
    imageAlt: string;
    /** Fill behind the certification image. */
    panelBg: string;
    /**
     * Padding around that image. Colorado's stamp is inset; SCARR's banner
     * runs edge to edge in its panel, as drawn.
     */
    imagePadding?: string;
  };
  /** Footer support line — label plus a branded button. */
  footerSupport: { label: string; href: string; buttonLabel: string };
}

/*
 * Third-generation tenant portal (Jennifer's 8-19-26 SCARR mockup): navy
 * header carrying the gold logo directly (no lobe) plus the two certification
 * buttons, a light hero whose right side is the Latest Highlights CARD over a
 * gold halftone spray (no video), a full-bleed navy certification band with a
 * white copy box and photo card, the grey support bar, the unchanged library,
 * and a rebuilt navy footer. A tenant opts in with a `v3` block, which wins
 * over `v2`; SCARR is first, Colorado follows once Jennifer confirms.
 */
export interface TenantV3 {
  orgSiteLabel: string;
  orgSiteUrl: string;
  /** Logo mark sitting directly on the navy header bar (no lobe, no box). */
  headerLogo: { src: string; width: number; height: number; displayWidth: string };
  /**
   * 8-17-26 Colorado lobe treatment, carried into v3 (Jason, 8-23): the
   * black-bordered full-colour mark sits on a pale-yellow field at the left
   * of the header and the navy bar gets a pill-rounded left cap around it;
   * the footer swaps its lockup for the same mark in a rounded yellow box.
   * When set, `headerLogo` above is unused.
   */
  lobe?: { bg: string; logo: string };
  /** Header certification buttons. A button with no href renders a placeholder. */
  certButtons: {
    pre: { label: string; href?: string };
    post?: { label: string; href?: string };
  };
  /**
   * Curated library views reachable as `/<tenant>?collection=<key>`. The
   * landing filters its library to exactly these slugs, in this order, and
   * shows a banner naming the collection. Slugs that have no visible row on
   * the tenant simply don't appear — the banner's "N of M" makes the gap
   * visible.
   */
  collections?: Record<string, { label: string; slugs: string[] }>;
  heroBg: string;
  /**
   * Optional smaller-print paragraph between the hero copy and the
   * Explore · learn · Grow line (Colorado's CARR provenance note, 8-26).
   */
  heroNote?: string;
  /** Gold halftone dot spray behind the Latest Highlights card. */
  heroDots: string;
  highlightTileBg: string;
  /** `heading` defaults to "Need Platform Help?" (SCARR: "Learning Center Support"). */
  supportBar: { bg: string; fg: string; buttonLabel: string; heading?: string };
  certBand: {
    heading: string;
    /** Trusted author HTML paragraphs (apply link, contact email). */
    paragraphsHtml: string[];
    photo: string;
    photoAlt: string;
  };
  footer: {
    lockup: { src: string; width: number; height: number; displayWidth: string };
    siteLabel: string;
    siteUrl: string;
    email: string;
    /** Optional contact-page link line (SCARR has one; Colorado does not). */
    contactUrl?: string;
    addressLines: string[];
    phone: string;
    socials: TenantSocial[];
    supportLabel: string;
    supportHref: string;
    supportButtonLabel: string;
  };
}

export interface TenantConfig {
  slug: string;
  name: string;
  fgiSiteUrl: string;
  // Chrome
  logo: string;        // header logo (on light background)
  logoWhite: string;   // footer logo (on dark background)
  logoAlt: string;
  // Colors
  primary: string;     // header underline + footer background + accents
  accent: string;      // active-nav underline
  // Hero
  heroParagraphs: string[];    // HTML strings (may contain <strong>)
  heroRight: TenantHeroRight;
  // "Hosted on FGI" support/info bar
  hostedBar: { bg: string; fg: string };
  // Certification / instruction block
  instruction: { heading: string; bodyHtml: string; bg: string; fg: string };
  // Footer
  footer: {
    bg: string;
    orgName: string;
    contactHtml: string;       // HTML block of contact lines
    websiteLabel: string;
    websiteUrl: string;
    socials: TenantSocial[];
  };
  /** Present only on tenants moved to the 8-11-26 portal design. */
  v2?: TenantV2;
  /** Present only on tenants moved to the 8-19-26 portal design (wins over v2). */
  v3?: TenantV3;
}

// Shared first hero paragraph (tenant pages drop "research," vs FGI).
const HERO_P1 =
  'Your one-stop, no-cost library for building stronger recovery housing and ' +
  'support programs — <strong>courses, guides, webinars, podcasts, NAADAC CE ' +
  'opportunities, and more.</strong>';

// Shared certification instruction block (Colorado copy; used as SCARR
// placeholder until SCARR supplies its own — Jason, 7-23-26).
const CERT_BLOCK_HTML = `
  <p>To support those interested in becoming a Colorado Certified Recovery Residence, we ask that you first watch all seven videos in our "So You Want to Be a Recovery Residence Owner or Operator?" series.</p>
  <p>As you complete each video, please fill out the brief survey to receive a completion certificate.</p>
  <p>If you're still interested in owning or operating a recovery residence after completing the series, click on the Certification Documents category in the search dropdown to review all required materials. Once you've reviewed everything, visit our website to begin your certification process.</p>
  <p>If you'd like to meet with a CRH staff member, have additional questions, or want access to the CRH Certification Portal, please email <a href="mailto:cert@corecoveryhousing.com">cert@corecoveryhousing.com</a> with all seven completion certificates attached, along with any questions you have. We'll respond as soon as possible to schedule a meeting.</p>
`;

const HOSTED_HTML = // right-side text in the "hosted on FGI" bar (shared)
  'Our Learning Center is hosted on the Fletcher Group (FGI) platform. As a ' +
  'registered user, you\'re also able to explore Fletcher Group\'s full library ' +
  'of recovery ecosystem support resources by clicking the FGI Site tab at the ' +
  'top of this page.';

const TENANTS: Record<string, TenantConfig> = {
  colorado: {
    slug: 'colorado',
    name: 'Ohio Recovery Housing – Colorado',
    fgiSiteUrl: 'https://fgilearn.org',
    // Reverse mark (white outlines + white wordmark), so it sits directly on
    // the navy header and footer with no white box (Jason, 8-11).
    logo: '/images/tenants/colorado/logo-white.webp',
    logoWhite: '/images/tenants/colorado/logo-white.webp',
    logoAlt: 'Ohio Recovery Housing – Colorado',
    primary: '#001970',   // CO blue
    accent: '#ffd100',    // CO yellow
    // 8-11-26 mockup uses FGI's generic wording verbatim, including "research,"
    // which HERO_P1 drops for tenants. Jason chose this over keeping the old
    // Colorado-specific paragraphs; it loses the CARR provenance note.
    heroParagraphs: [
      'Your one-stop, no-cost library for building stronger recovery housing and ' +
      'support programs — <strong>certification information, courses, guides, ' +
      'webinars, podcasts, NAADAC CE opportunities, research, and more.</strong>',
      'Whether you’re opening your first recovery home, leading an established ' +
      'program, working as a peer or recovery support provider, or a community ' +
      'partner, there’s something here for you.',
    ],
    heroRight: {
      kind: 'logo',
      src: '/images/tenants/colorado-logo.png',
      alt: 'Ohio Recovery Housing – Colorado',
    },
    hostedBar: { bg: '#001970', fg: '#ffffff' },
    instruction: {
      heading: 'Becoming a Colorado Certified Recovery Residence',
      bodyHtml: CERT_BLOCK_HTML,
      bg: '#6d3a5d',   // CO purple
      fg: '#ffffff',
    },
    footer: {
      bg: '#001970',
      orgName: 'Ohio Recovery Housing – Colorado',
      contactHtml: `
        <p>For services in Colorado: (720) 782-0989</p>
        <p>Email: <a href="mailto:info@corecoveryhousing.org">info@corecoveryhousing.org</a></p>
        <p>For Certifications: <a href="mailto:cert@corecoveryhousing.org">cert@corecoveryhousing.org</a></p>
        <p>For Grievances: <a href="mailto:grievance@corecoveryhousing.org">grievance@corecoveryhousing.org</a></p>
      `,
      websiteLabel: 'www.corecoveryhousing.org',
      websiteUrl: 'https://www.corecoveryhousing.org',
      socials: [
        // TODO (Jennifer): the 8-11-26 mockup draws a LinkedIn icon too, but no
        // ORH-CO LinkedIn URL was supplied.
        { platform: 'facebook', href: 'https://www.facebook.com/share/192NHyvUsz/?mibextid=wwXIfr' },
      ],
    },
    v2: {
      orgSiteLabel: 'ORH-CO Web',
      orgSiteUrl: 'https://www.corecoveryhousing.org',
      fgiNavLabel: 'Fletcher Web',
      heroBg: '#f6f6fa',
      heroMedia: {
        kind: 'photo',
        src: '/images/tenants/colorado/hero-photo.webp',
        alt: 'A snowy Colorado mountain town main street',
        width: 1000,
        height: 665,
      },
      heroDots: '/images/tenants/colorado/dots.webp',
      heroLayout: {
        media: { left: 21.8, top: 108.1, width: 277.5 },
        ring:  { cx: 209, cy: 178, d: 287 },
      },
      logoOnWhite: false,
      // Pale yellow measured off "Rounded Yello colorado Logo.png" (8-17-26);
      // deliberately lighter than the #ffd100 accent so the mark's own yellow
      // house still separates from the field.
      lobe: { bg: '#ffe673', logo: '/images/tenants/colorado/logo-bordered.webp' },
      footerLogo: {
        src: '/images/tenants/colorado/logo-white.webp',
        width: 600, height: 447, displayWidth: '230px',
      },
      highlightTileBg: '#fffdf4',
      hostedBar2: { bg: '#e7e9f1', fg: '#111111', buttonLabel: 'Contact FGI' },
      certification: {
        heading: 'Becoming a Colorado Certified Recovery Residence',
        // Verbatim from the mockup, which is much shorter than the 7-23-26 copy.
        // NB it says corecoveryhousing.com while the footer says .org — the same
        // mismatch exists in the source; flagged for Jennifer.
        bodyHtml: `
          <p>To begin, watch all seven videos in &ldquo;So You Want to Be a Recovery Residence Owner or Operator?&rdquo; and review the Certification documents (all available in the &ldquo;Certification Info&rdquo; filter). After completing these, finish the brief survey and download your completion certificate.</p>
          <p>To proceed with certification, visit our website to apply. Your certificate of completion may be required.</p>
          <p>For questions, portal access, or to schedule a meeting with our team, email <a href="mailto:cert@corecoveryhousing.com">cert@corecoveryhousing.com</a> with your completion certificate attached.</p>
        `,
        image: '/images/tenants/colorado/stamp.webp',
        imageAlt: 'Colorado postage stamp',
        panelBg: '#8f94c9',
      },
      footerSupport: {
        label: 'Learning Center Support',
        href: 'mailto:LC@fletchergroup.org',
        buttonLabel: 'Contact',
      },
    },
    // 8-22-26: Colorado moved to the v3 layout "the same way we did SCARR"
    // (Jason). Copy is verbatim from the Colorado section of "tenant page
    // white box language 8-19-26.docx"; the hero ring is the SCARR asset
    // recoloured to CO yellow (#ffd100). NB the docx says
    // info@corecoveryhousing.com while every other CO contact uses .org —
    // kept verbatim; flagged for Jennifer.
    v3: {
      orgSiteLabel: 'ORH-CO Web',
      orgSiteUrl: 'https://www.corecoveryhousing.org',
      headerLogo: {
        src: '/images/tenants/colorado/logo-white.webp',
        width: 600, height: 447, displayWidth: '110px',
      },
      // Same pale yellow + bordered mark as the v2 chrome, so the landing
      // header/footer match the content pages' lobed shell (Jason, 8-23).
      lobe: { bg: '#ffe673', logo: '/images/tenants/colorado/logo-bordered.webp' },
      certButtons: {
        pre: {
          label: 'Pre-Certification Requirements',
          href: '/colorado/course/co-pre-certification-requirements',
        },
        // No Post-Certification button for Colorado (Jason, 8-23).
      },
      collections: {
        'required-videos': {
          label: 'Required Videos',
          slugs: [
            'corr-part-1-intro-to-recovery-residences',
            'corr-part-2-levels-of-recovery-residences',
            'corr-part-3-administrative-and-operations',
            'corr-part-4-budgeting-basics',
            'corr-part-5-staffing-and-leadership',
            'corr-part-6-recovery-oriented-culture',
            'corr-part-7-physical-property',
          ],
        },
      },
      heroBg: '#f6f6fa',
      // Jennifer, 8-26 (Changes for Colorado.xlsx row 27), verbatim.
      heroNote:
        'Some content may still reference the Colorado Agency for Recovery ' +
        'Residences (CARR) or the 2025 Guidebook. While we have updated these ' +
        'references wherever possible, any remaining content continues to provide ' +
        'relevant, valuable information for certified recovery residences in ' +
        'Colorado. For the most current requirements or questions, please refer to ' +
        'the certification documents in the library or visit our website.',
      heroDots: '/images/tenants/colorado/hero-ring.webp',
      highlightTileBg: '#fffdf4',
      supportBar: { bg: '#e7e9f1', fg: '#111111', buttonLabel: 'Contact', heading: 'Learning Center Support' },
      certBand: {
        heading: 'Are you wanting to open a Recovery Residence?',
        paragraphsHtml: [
          'Before starting your application, click the &ldquo;Pre-Certification ' +
          'Requirements&rdquo; button at the top of the screen. Here you will watch ' +
          'all seven videos in our &ldquo;So You Want to Be a Recovery Residence ' +
          'Owner or Operator&rdquo; series, review all Certification documents, ' +
          'complete two brief surveys, and download your completion certificate.',
          'To proceed with certification, visit <a href="https://www.corecoveryhousing.org" ' +
          'target="_blank" rel="noopener noreferrer">our website</a> to apply. ' +
          'Your certificate of completion will be required.',
          'Once you have completed the video series and reviewed the certification ' +
          'documents, if you would like to schedule a meeting with our team, email ' +
          '<a href="mailto:info@corecoveryhousing.com">info@corecoveryhousing.com</a> ' +
          'with your completion certificate attached.',
        ],
        photo: '/images/tenants/colorado/hero-photo.webp',
        photoAlt: 'A snowy Colorado mountain town main street',
      },
      footer: {
        lockup: {
          src: '/images/tenants/colorado/logo-white.webp',
          width: 600, height: 447, displayWidth: '230px',
        },
        siteLabel: 'www.corecoveryhousing.org',
        siteUrl: 'https://www.corecoveryhousing.org',
        email: 'info@corecoveryhousing.org',
        addressLines: ['8200 Shaffer Parkway', 'P.O. Box 271673', 'Littleton, CO 80127'],
        phone: '(720) 782-0989',
        socials: [
          { platform: 'facebook', href: 'https://www.facebook.com/share/192NHyvUsz/?mibextid=wwXIfr' },
        ],
        supportLabel: 'Learning Center Support',
        supportHref: 'mailto:LC@fletchergroup.org',
        supportButtonLabel: 'Contact',
      },
    },
  },

  scarr: {
    slug: 'scarr',
    name: 'South Carolina Alliance for Recovery Residences',
    fgiSiteUrl: 'https://fgilearn.org',
    logo: '/images/tenants/scarr/logo-square.webp',
    logoWhite: '/images/tenants/scarr/logo-horizontal.webp',
    logoAlt: 'South Carolina Alliance for Recovery Residences (SCARR)',
    primary: '#041e42',   // SCARR navy
    accent: '#f5d300',    // SCARR yellow
    // 8-11-26 mockup uses FGI's generic wording verbatim, as Colorado's does.
    heroParagraphs: [
      'Your one-stop, no-cost library for building stronger recovery housing and ' +
      'support programs — <strong>certification information, courses, guides, ' +
      'webinars, podcasts, NAADAC CE opportunities, research, and more.</strong>',
      'Whether you’re opening your first recovery home, leading an established ' +
      'program, working as a peer or recovery support provider, or a community ' +
      'partner, there’s something here for you.',
    ],
    heroRight: {
      kind: 'video',
      embedUrl: 'https://player.vimeo.com/video/1211785746?badge=0&autopause=0&player_id=0&app_id=58479',
      title: 'SCARR',
      // SCARR re-cut the source as widescreen (7-29-26), so it now matches the
      // FGI homepage hero exactly — same 540px column, same 16:9 frame.
      aspect: '16:9',
    },
    hostedBar: { bg: '#f5d300', fg: '#000000' },   // SCARR: yellow bar
    instruction: {
      // Placeholder: SCARR to supply real copy (Jason, 7-23-26).
      heading: 'Becoming a Colorado Certified Recovery Residence',
      bodyHtml: CERT_BLOCK_HTML,
      bg: '#041e42',
      fg: '#ffffff',
    },
    footer: {
      bg: '#041e42',
      orgName: 'South Carolina Alliance for Recovery Residences',
      contactHtml: `
        <p>Email: <a href="mailto:info@scarronline.org">info@Scarronline.org</a></p>
        <p><a href="https://scarronline.org/contact/" target="_blank" rel="noopener noreferrer">scarronline.org/contact</a></p>
        <p>4711 Forest Drive, Suite 3 #226</p>
        <p>Columbia, SC 29206</p>
        <p>(803) 430-6451</p>
      `,
      websiteLabel: 'www.scarronline.org',
      websiteUrl: 'https://scarronline.org',
      // The 8-11-26 mockup's Follow Us box shows only Facebook and LinkedIn.
      socials: [
        { platform: 'facebook',  href: 'https://www.facebook.com/screcoveryresidences/' },
        { platform: 'linkedin',  href: 'https://www.linkedin.com/company/south-carolina-alliance-for-recovery-residences/' },
      ],
    },
    v2: {
      orgSiteLabel: 'SCARR Web',
      orgSiteUrl: 'https://scarronline.org',
      fgiNavLabel: 'Fletcher Web',
      heroBg: '#f6f7f8',
      heroHeading: 'Why Certification',
      heroMedia: {
        kind: 'video',
        embedUrl: 'https://player.vimeo.com/video/1211785746?badge=0&autopause=0&player_id=0&app_id=58479',
        title: 'Why Certification — SCARR',
      },
      heroDots: '/images/tenants/scarr/dots.webp',
      // SCARR's video sits lower than Colorado's photo, and the ring follows it.
      heroLayout: {
        media: { left: 15.3, top: 141.3, width: 285 },
        ring:  { cx: 212.7, cy: 204.5, d: 287 },
      },
      logoOnWhite: false,
      footerLogo: {
        src: '/images/tenants/scarr/logo-horizontal.webp',
        width: 367, height: 97, displayWidth: '320px',
      },
      highlightTileBg: '#fffdf4',
      hostedBar2: { bg: '#e7e9ed', fg: '#111111', buttonLabel: 'Contact Us' },
      certification: {
        heading: 'Becoming a South Carolina Certified Recovery Residence',
        bodyHtml: `
          <p>To begin, watch all seven videos in &ldquo;So You Want to Be a Recovery Residence Owner or Operator?&rdquo; and review the Certification documents (all available in the &ldquo;Certification Info&rdquo; filter). After completing these, finish the brief survey and download your completion certificate.</p>
          <p>To proceed with certification, visit our website to apply. Your certificate of completion may be required.</p>
          <p>For questions, portal access, or to schedule a meeting with our team, email <a href="mailto:info@scarronline.org">info@scarronline.org</a> with your completion certificate attached.</p>
        `,
        image: '/images/tenants/scarr/cert-image.webp',
        imageAlt: 'Recovery is home — find yours today',
        panelBg: '#2c4362',
        imagePadding: '0',
      },
      footerSupport: {
        label: 'Learning Center Support',
        href: 'mailto:LC@fletchergroup.org',
        buttonLabel: 'Contact',
      },
    },
    // 8-19-26 SCARR mockup (docs/New Tenent PAges). Copy is verbatim from
    // "tenant page white box language 8-19-26.docx".
    v3: {
      orgSiteLabel: 'SCARR Web',
      orgSiteUrl: 'https://scarronline.org',
      headerLogo: {
        src: '/images/tenants/scarr/logo-gold.webp',
        width: 600, height: 600, displayWidth: '84px',
      },
      certButtons: {
        pre: {
          label: 'Pre-Certification Requirements',
          href: '/scarr/course/scarr-pre-certification-requirements',
        },
        // Filters the library to the post-certification collection below
        // (Jason, 8-25).
        post: {
          label: 'Post-Certification Requirements',
          href: '/scarr?collection=post-certification#library',
        },
      },
      // Jason's post-certification list (8-25-26), in his order. A slug with
      // no SCARR visibility row is silently absent from the page — keep this
      // list and resource_visibility in step.
      collections: {
        'required-videos': {
          label: 'Required Videos',
          slugs: [
            'scarr-part-1-intro-to-recovery-residences',
            'scarr-part-2-levels-of-recovery-residences',
            'scarr-part-3-administrative-and-operations',
            'scarr-part-4-budgeting-basics',
            'scarr-part-5-staffing-and-leadership',
            'scarr-part-6-recovery-oriented-culture',
            'scarr-part-7-physical-property',
          ],
        },
        'post-certification': {
          label: 'Post-Certification Requirements',
          slugs: [
            'narr-levels-recovery-housing',
            'hipaa-42-cfr',
            'insurance-budgeting-recovery-housing',
            'responding-to-nimbyism',
            'recovery-housing-asam-criteria',
            'pregnant-parenting-recovery-housing',
            'swot-analysis',
            'recovery-house-management-community',
            'cultural-humility',
            'why-evaluation-matters',
            'clarifying-language-and-acronyms-substance-use-disorders-and-medications',
            'implementing-mar',
            'preventing-mar-discrimination',
            'urine-analysis-best-practices',
            'managing-staff',
            'peer-leadership-best-practices',
            'naloxone-par-training',
            'first-aid-household-injuries',
            'cpr-hands-only',
            'samhsa-988-crisis-line',
            'recovery-ecosystems-for-communities',
            'role-of-recovery-allies',
          ],
        },
      },
      heroBg: '#f6f7f8',
      // Jennifer's own halftone ring ("scarr - f5d300.png", filename is the
      // hex), alpha-cropped so the CSS width IS the ring diameter.
      heroDots: '/images/tenants/scarr/hero-ring.webp',
      highlightTileBg: '#fffdf4',
      supportBar: { bg: '#e7e9ed', fg: '#111111', buttonLabel: 'Contact', heading: 'Learning Center Support' },
      certBand: {
        heading: 'Becoming a SCARR Certified Residence',
        paragraphsHtml: [
          'Before starting your application, click the &ldquo;Pre-Certification ' +
          'Requirements&rdquo; button at the top of the screen. Here you will watch ' +
          'all seven videos in our &ldquo;So You Want to Be a Recovery Residence ' +
          'Owner or Operator&rdquo; series, review all Certification documents, ' +
          'complete a brief survey and download your completion certificate.',
          'To proceed with certification, visit <a href="https://scarronline.org" ' +
          'target="_blank" rel="noopener noreferrer">our website</a> to apply. ' +
          'Your certificate of completion will be required.',
          'Once you have completed the video series and reviewed the certification ' +
          'documents, if you would like to schedule a meeting with our team, email ' +
          '<a href="mailto:info@scarronline.org">info@scarronline.org</a> with your ' +
          'completion certificate attached.',
        ],
        photo: '/images/tenants/scarr/cert-photo.webp',
        photoAlt: 'Recovery is home — find yours today',
      },
      footer: {
        lockup: {
          src: '/images/tenants/scarr/footer-lockup-v3.webp',
          width: 372, height: 101, displayWidth: '340px',
        },
        siteLabel: 'www.scarronline.org',
        siteUrl: 'https://scarronline.org',
        email: 'info@Scarronline.org',
        contactUrl: 'https://scarronline.org/contact/',
        addressLines: ['4711 Forest Drive, Suite 3 #226', 'Columbia, SC 29206'],
        phone: '(803) 430-6451',
        socials: [
          { platform: 'facebook', href: 'https://www.facebook.com/screcoveryresidences/' },
          { platform: 'linkedin', href: 'https://www.linkedin.com/company/south-carolina-alliance-for-recovery-residences/' },
        ],
        supportLabel: 'Learning Center Support',
        supportHref: 'mailto:LC@fletchergroup.org',
        supportButtonLabel: 'Contact',
      },
    },
  },
};

// The shared "hosted on FGI" bar body text.
export const TENANT_HOSTED_TEXT = HOSTED_HTML;

export function getTenantConfig(slug: string): TenantConfig | null {
  return TENANTS[slug] ?? null;
}

export const TENANT_SLUGS = Object.keys(TENANTS);
