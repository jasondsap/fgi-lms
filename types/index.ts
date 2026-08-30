// =============================================================================
// FGI LMS — Shared TypeScript Types
// =============================================================================

export type ResourceType =
  | 'course'
  | 'naadac_ce'
  | 'toolkit'      // displayed as "Learning Brief" (6-2-2026 update)
  | 'guidebook'
  | 'handbook'     // displayed as "Handbook / RH Templates"
  | 'webinar'
  | 'newsletter'
  | 'video'
  | 'podcast'
  | 'paper'        // displayed as "Publications"
  | 'whitepaper'
  | 'infographic'
  | 'success_story'
  | 'fgi_service'
  | 'non_fgi';

export type AudienceTag =
  | 'house_owner'
  | 'peer_support'
  | 'community'
  | 'criminal_justice'
  | 'clinical'
  | 'medical'
  | 'workforce';

export type TopicTag =
  | 'establishing_rh'
  | 'rh_management'
  | 'operations'
  | 'recovery_support'
  | 'social_model'
  | 'reentry'
  | 'workforce'
  | 'funding'
  | 'research'
  | 'mental_health'
  | 'self_care'
  | 'hud'
  | 'recovery_ky_model'
  | 'rhoar_model'
  | 'recovery_ecosystems'
  | 'rh_policies'
  | 'fgi_services';

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

// A speaker attached to a webinar. Presenters are their own table because they
// recur across the catalog (Tara Hyde fronts two webinars already).
export interface Presenter {
  id: string;
  name: string;
  credentials: string | null;  // "LCSW, LCADC, CCS"
  title: string | null;        // role + organization, one line
  bio: string | null;
  photo_url: string | null;    // /images/presenters/*.jpg — public, not S3
  org_name: string | null;
  org_logo_url: string | null;
  org_url: string | null;
  /** Optional second affiliation (8-29-26) — e.g. TASC + PTACC for Jac Charlier. */
  org2_name?: string | null;
  org2_url?: string | null;
}

export type MaterialKind = 'transcript' | 'slides' | 'handout' | 'other';

// Supporting download attached to a resource (transcript, deck, handout).
export interface ResourceMaterial {
  id: string;
  kind: MaterialKind;
  label: string;
  // Same invariant as Resource: the s3_key stays server-side.
  download_url: string;
}

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = {
  transcript: 'Transcript',
  slides:     'Presentation Slides',
  handout:    'Handout',
  other:      'Resource',
};

export interface Resource {
  id: string;
  title: string;
  slug: string;
  type: ResourceType;
  description: string;
  duration_minutes: number | null;
  thumbnail_url: string | null;
  vimeo_id: string | null;
  external_url: string | null;
  is_naadac_ce: boolean;
  /** Hidden from ordinary learners; cards show an Internal pill (8-29-26). */
  internal?: boolean;
  audience_tags: AudienceTag[];
  topic_tags: TopicTag[];
  published_at: string | null;
  event_date?: string | null;    // the date the webinar was actually delivered
  ceu_credits?: number | null;
  course_code?: string | null;
  /** NAADAC skill groups printed on the webinar shell; Jennifer-supplied. */
  naadac_skill_groups?: string[] | null;
  /** Formatted citation for a peer-reviewed publication. Trusted HTML —
      the journal name carries <em>, exactly as the research sheet marks it. */
  citation?: string | null;
  /** Full published abstract. `description` stays short for cards and search. */
  abstract?: string | null;
  /** True once a Moodle course backs this resource — drives "Start Webinar".
      The course id itself is never sent to the client. */
  has_moodle_course?: boolean;
  /** Course sponsor block (8-11-26 course shell) — e.g. the Marshall Health
      employability series. Text is the "sponsored by" sentence. */
  sponsor_text?: string | null;
  sponsor_logo_url?: string | null;
  sponsor_url?: string | null;
  // s3_key is never exposed to the client — middleware issues a presigned URL
  download_url?: string;   // presigned URL, populated per-request for PDF resources
  attachment_url?: string; // same object, signed to force a save rather than render
  presenters?: Presenter[];
  materials?: ResourceMaterial[];
}

// Resource as stored in DB (admin view — includes all fields)
export interface ResourceAdmin extends Resource {
  s3_key: string | null;
  moodle_course_id: number | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// API Shapes
// ---------------------------------------------------------------------------

export interface ResourceListParams {
  type?: ResourceType | ResourceType[];
  audience?: AudienceTag | AudienceTag[];
  topic?: TopicTag | TopicTag[];
  duration?: 'under_15' | '16_30' | '31_60' | '61_90' | '91_120' | '121_plus';
  search?: string;
  tenant?: string;       // tenant slug — filters visibility
  /**
   * Restrict to an explicit slug list (a curated "collection", e.g. a
   * tenant's post-certification requirements). Results come back in the
   * order the slugs are listed, not newest-first.
   */
  slugs?: string[];
  page?: number;
  per_page?: number;
  match?: 'any' | 'all'; // any category match vs all categories must match
  /** Server-only: include `internal` rows (admins / the tenant's own admins). */
  includeInternal?: boolean;
}

export interface ResourceListResponse {
  resources: Resource[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ---------------------------------------------------------------------------
// Filter Label Maps (used in sidebar UI)
// ---------------------------------------------------------------------------

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  course:        'Course/Training',
  naadac_ce:     'NAADAC CE',
  toolkit:       'Learning Brief',
  guidebook:     'R.H. Guide/Handbook & Templates',
  handbook:      'Cert. Documents',
  webinar:       'Webinar',
  newsletter:    'Newsletter',
  video:         'Video',
  podcast:       'Podcast',
  paper:         'Publications & Papers',
  whitepaper:    'Whitepaper / Brief',
  infographic:   'Infographic',
  success_story: 'Success Story',
  fgi_service:   'FGI Services',
  non_fgi:       'Non-FGI Recommended',
};

export const AUDIENCE_TAG_LABELS: Record<AudienceTag, string> = {
  house_owner:      'RH Owner / Operator / Staff',
  peer_support:     'Peer Support Professional',
  community:        'Community Member / Ally',
  criminal_justice: 'Criminal Justice Professional',
  clinical:         'Clinical Professional',
  medical:          'Medical Professional',
  workforce:        'Workforce Professional',
};

export const TOPIC_TAG_LABELS: Record<TopicTag, string> = {
  establishing_rh:    'Establishing an RH',
  rh_management:      'RH Management & Staff',
  operations:         'RH Operations & Best Practices',
  recovery_support:   'Recovery Support Services',
  social_model:       'Social Model of Recovery',
  reentry:            'Re-entry / Criminal Justice',
  workforce:          'Workforce',
  funding:            'Funding',
  research:           'Research / Data / Recovery Economic Calculator',
  mental_health:      'Co-Occurring Mental Health',
  self_care:          'Safety, Security & Self-care',
  hud:                'HUD',
  recovery_ky_model:  'Recovery KY Model',
  rhoar_model:        'RHOAR Model',
  recovery_ecosystems:'Recovery Ecosystems',
  rh_policies:        'RH Policies & Procedures',
  fgi_services:       'FGI Services',
};

// ---------------------------------------------------------------------------
// Filter sidebar structure — Jennifer's 8-11-26 "lrc filter bar" doc
// ---------------------------------------------------------------------------
// The sidebar is no longer "one group per label map". Resource types are split
// across three groups, topics across two, and the order inside each group is
// hers, not the map's. Keep this list as the single source of that order.
//
// Length and Match Categories are deliberately absent: Jennifer asked for
// Match Categories removed and Length hidden "for now" (NAADAC timing is
// spelled out in the course shell, video length is visible on open, and
// everything else is self-paced). The `duration` and `match` query params
// still work in lib/resources.ts, so restoring Length is a UI-only change.

/**
 * A checkbox that writes to a different query key than its group — used for
 * the tenants' "Required Videos", which is a curated collection
 * (`?collection=required-videos`) rather than a resource type.
 */
export interface FilterItemSpec {
  param: 'type' | 'audience' | 'topic' | 'collection';
  value: string;
  label: string;
}

export interface FilterGroupSpec {
  title: string;
  /** Query-string key the group's checkboxes write to. */
  param: 'type' | 'audience' | 'topic';
  /** Keys into the matching label map, in display order. */
  items: Array<string | FilterItemSpec>;
  /** Per-group label overrides — the same type reads differently here. */
  labels?: Record<string, string>;
  /** Label overrides that apply on tenant portals only (Jennifer, 8-25). */
  tenantLabels?: Record<string, string>;
  /** Render only on a tenant portal (Colorado / SCARR). */
  tenantOnly?: boolean;
  /** Never render on a tenant portal. */
  hideOnTenant?: boolean;
  /** Items to drop when rendering on a tenant portal. */
  excludeOnTenant?: string[];
}

export const FILTER_GROUPS: FilterGroupSpec[] = [
  {
    // New for SCARR + CORR. Backed by existing types rather than new ones
    // (Jason, 8-11): on those portals `video` is the seven-part certification
    // series and `handbook` is the certification paperwork.
    title: 'Certification Info',
    param: 'type',
    // "Required Videos" is the tenant's seven-part series only — a curated
    // collection (lib/tenants.ts), not every `video` row (Jennifer, 8-25:
    // Clarifying Language is a video but not a requirement).
    items: [
      { param: 'collection', value: 'required-videos', label: 'Required Videos' },
      'handbook',
    ],
    labels: { handbook: 'Cert. Documents' },
    tenantOnly: true,
  },
  {
    title: 'Courses',
    param: 'type',
    // `naadac_ce` is not a stored type — getPublicResources maps it onto the
    // is_naadac_ce flag.
    items: ['naadac_ce', 'course'],
  },
  {
    title: 'Resource Type',
    param: 'type',
    // Jason 8-30: reads "External Resources" in the filter bar (cards keep the
    // full type label).
    labels: { non_fgi: 'External Resources' },
    items: [
      'webinar', 'podcast', 'toolkit', 'guidebook', 'newsletter',
      'video', 'paper', 'infographic', 'success_story', 'non_fgi',
    ],
    // Tenant portals keep only what the tenants actually publish
    // (Jennifer's SCARR page changes, 8-25): webinars, guides, videos.
    excludeOnTenant: ['podcast', 'toolkit', 'guidebook', 'newsletter', 'paper', 'infographic', 'success_story', 'non_fgi'],
  },
  {
    title: 'I Am A…',
    param: 'audience',
    items: ['house_owner', 'peer_support', 'community', 'criminal_justice',
            'clinical', 'medical', 'workforce'],
    excludeOnTenant: ['criminal_justice', 'clinical', 'medical', 'workforce'],
  },
  {
    title: 'I Want To Learn About…',
    param: 'topic',
    items: [
      'establishing_rh', 'rh_management', 'operations', 'recovery_support',
      'workforce', 'research', 'reentry', 'funding',
      'self_care', 'mental_health', 'recovery_ecosystems',
    ],
    excludeOnTenant: ['workforce', 'reentry', 'funding', 'mental_health'],
    tenantLabels: { research: 'Research & Data' },
  },
  {
    title: 'Recovery House Models',
    param: 'topic',
    // social_model moved here from "I Want To Learn About…" (Jason, 8-30).
    items: ['social_model', 'rhoar_model', 'recovery_ky_model'],
    hideOnTenant: true,
  },
];

// Types and topics that exist in the data model but are no longer offered as
// filters (8-11-26 doc): types `whitepaper` and `fgi_service`, topics `hud`,
// `rh_policies` and `fgi_services`. Only `rh_policies` is actually in use
// (9 resources); those rows keep the tag, they just cannot be filtered by it.

export const DURATION_LABELS = {
  under_15:  'Under 15 mins',
  '16_30':   '16–30 mins',
  '31_60':   '31–60 mins',
  '61_90':   '61–90 mins',
  '91_120':  '91–120 mins',
  '121_plus':'121+ mins',
} as const;

// Card colors from the FGI Resource Center Brand palette (4-9-26 doc).
// Types the palette doesn't define borrow the closest palette color
// (matched to the tint of Jennifer's 7-7-26 card images).
// Card color-bar palette — from Jennifer's 7-22-26 mockup "Color Codes.txt"
// (the hex encoded in each card-image filename). This revised several types.
export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  course:        '#0e72a2', // Course / Training
  naadac_ce:     '#0e72a2', // not in palette — uses Course blue
  toolkit:       '#047b3f', // Learning Brief
  guidebook:     '#3a4904', // Guidebook
  handbook:      '#4e6205', // Handbook & RH Template
  webinar:       '#2a56ac', // Webinar
  newsletter:    '#8b6f00', // Newsletter
  video:         '#a20e3e', // Video
  podcast:       '#204f64', // Podcast
  paper:         '#b13f08', // Publication
  whitepaper:    '#862f04', // Whitepaper & Topic Brief
  infographic:   '#557a92', // Infographic
  success_story: '#3d135f', // Success Story
  fgi_service:   '#03587c', // FGI Services
  non_fgi:       '#384f61', // Non-FGI Recommended
};

// =============================================================================
// Registration — the profile every signed-in user must complete once.
// Role keys are plain text in the DB (user_roles table), deliberately not a
// Postgres enum, so adding a role later is a code change only.
// =============================================================================
export type UserRole =
  | 'resident'
  | 'person_in_recovery'
  | 'certified_peer'
  | 'advocate'
  | 'rh_owner_operator_staff'
  | 'licensed_provider'
  | 'other';

// Key order here is the order the checkboxes render in the registration modal.
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  rh_owner_operator_staff: 'Recovery House Owner/Operator/Staff',
  certified_peer:          'Peer Support Professional',
  person_in_recovery:      'Person in substance use disorder recovery',
  resident:                'Resident',
  advocate:                'Ally (Family, Friend, Advocate, etc.)',
  licensed_provider:       'Licensed Provider (Social Worker, Counselor, etc.)',
  other:                   'Other',
};

export const US_STATES: Array<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },        { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },        { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },     { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },    { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },        { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },         { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },       { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },           { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },       { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },          { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },      { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },       { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },       { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },     { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },           { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },         { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },   { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },   { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },          { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },        { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },     { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },      { code: 'WY', name: 'Wyoming' },
  { code: 'PR', name: 'Puerto Rico' },    { code: 'VI', name: 'U.S. Virgin Islands' },
  { code: 'GU', name: 'Guam' },           { code: 'AS', name: 'American Samoa' },
  { code: 'MP', name: 'Northern Mariana Islands' },
];
