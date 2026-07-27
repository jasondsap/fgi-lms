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
  audience_tags: AudienceTag[];
  topic_tags: TopicTag[];
  published_at: string | null;
  event_date?: string | null;    // the date the webinar was actually delivered
  ceu_credits?: number | null;
  course_code?: string | null;
  // s3_key is never exposed to the client — middleware issues a presigned URL
  download_url?: string; // presigned URL, populated per-request for PDF resources
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
  page?: number;
  per_page?: number;
  match?: 'any' | 'all'; // any category match vs all categories must match
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
  course:        'Course / Training',
  naadac_ce:     'NAADAC CE Course',
  toolkit:       'Learning Brief',
  guidebook:     'Guidebook',
  handbook:      'Handbook / RH Templates',
  webinar:       'Webinar',
  newsletter:    'Newsletter',
  video:         'Video',
  podcast:       'Podcast',
  paper:         'Publications',
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
  rh_management:      'RH Management',
  operations:         'RH Operations',
  recovery_support:   'Recovery Support Services',
  social_model:       'Social Model of Recovery',
  reentry:            'Re-entry / Criminal Justice',
  workforce:          'Workforce',
  funding:            'Funding',
  research:           'Research / Data / Recovery Economic Calculator',
  mental_health:      'Co-Occurring Mental Health',
  self_care:          'Self-care',
  hud:                'HUD',
  recovery_ky_model:  'Recovery KY Model',
  rhoar_model:        'RHOAR Model',
  recovery_ecosystems:'Recovery Ecosystems',
  rh_policies:        'RH Policies & Procedures',
  fgi_services:       'FGI Services',
};

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
