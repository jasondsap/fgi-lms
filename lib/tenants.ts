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
    heroParagraphs: [
      HERO_P1,
      'Our Learning Center content, developed by subject matter experts in ' +
      'substance use disorder recovery, has been <strong>curated to support ' +
      'Colorado Recovery House owners, operators, and related supports.</strong>',
      'Some of these resources were originally developed by the Colorado Agency ' +
      'for Recovery Residences (CARR) and continue to reflect current best practices.',
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
        { platform: 'facebook', href: 'https://www.facebook.com/share/192NHyvUsz/?mibextid=wwXIfr' },
      ],
    },
  },

  scarr: {
    slug: 'scarr',
    name: 'South Carolina Alliance for Recovery Residences',
    fgiSiteUrl: 'https://resource.made180.dev',
    logo: '/images/tenants/scarr-logo.jpg',
    logoWhite: '/images/tenants/scarr-logo.jpg',
    logoAlt: 'South Carolina Alliance for Recovery Residences (SCARR)',
    primary: '#041e42',   // SCARR navy
    accent: '#f5d300',    // SCARR yellow
    heroParagraphs: [
      HERO_P1,
      'Our Learning Center content, developed by subject matter experts in ' +
      'substance use disorder recovery, has been <strong>curated to support ' +
      'South Carolina Recovery House owners, operators, and related supports.</strong>',
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
      socials: [
        { platform: 'facebook',  href: 'https://www.facebook.com/screcoveryresidences/' },
        { platform: 'instagram', href: 'https://www.instagram.com/scaforrr/' },
        { platform: 'linkedin',  href: 'https://www.linkedin.com/company/south-carolina-alliance-for-recovery-residences/' },
      ],
    },
  },
};

// The shared "hosted on FGI" bar body text.
export const TENANT_HOSTED_TEXT = HOSTED_HTML;

export function getTenantConfig(slug: string): TenantConfig | null {
  return TENANTS[slug] ?? null;
}

export const TENANT_SLUGS = Object.keys(TENANTS);
