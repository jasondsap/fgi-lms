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
  /** Footer mark, when it differs from the header's (SCARR uses a lockup). */
  footerLogo?: { src: string; width: number; height: number };
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
    fgiSiteUrl: 'https://resource.made180.dev',
    logo: '/images/tenants/colorado-logo.png',
    logoWhite: '/images/tenants/colorado-logo-white.png',
    logoAlt: 'Ohio Recovery Housing – Colorado',
    primary: '#001970',   // CO blue
    accent: '#ffd100',    // CO yellow
    // 8-11-26 mockup uses FGI's generic wording verbatim, including "research,"
    // which HERO_P1 drops for tenants. Jason chose this over keeping the old
    // Colorado-specific paragraphs; it loses the CARR provenance note.
    heroParagraphs: [
      'Your one-stop, no-cost library for building stronger recovery housing and ' +
      'support programs — <strong>courses, guides, webinars, podcasts, NAADAC CE ' +
      'opportunities, research, and more.</strong>',
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
      logoOnWhite: true,
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
  },

  scarr: {
    slug: 'scarr',
    name: 'South Carolina Alliance for Recovery Residences',
    fgiSiteUrl: 'https://resource.made180.dev',
    logo: '/images/tenants/scarr/logo-square.webp',
    logoWhite: '/images/tenants/scarr/logo-horizontal.webp',
    logoAlt: 'South Carolina Alliance for Recovery Residences (SCARR)',
    primary: '#041e42',   // SCARR navy
    accent: '#f5d300',    // SCARR yellow
    // 8-11-26 mockup uses FGI's generic wording verbatim, as Colorado's does.
    heroParagraphs: [
      'Your one-stop, no-cost library for building stronger recovery housing and ' +
      'support programs — <strong>courses, guides, webinars, podcasts, NAADAC CE ' +
      'opportunities, research, and more.</strong>',
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
      footerLogo: { src: '/images/tenants/scarr/logo-horizontal.webp', width: 367, height: 97 },
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
  },
};

// The shared "hosted on FGI" bar body text.
export const TENANT_HOSTED_TEXT = HOSTED_HTML;

export function getTenantConfig(slug: string): TenantConfig | null {
  return TENANTS[slug] ?? null;
}

export const TENANT_SLUGS = Object.keys(TENANTS);
