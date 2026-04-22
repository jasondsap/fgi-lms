// =============================================================================
// FGI LMS — Shared TypeScript Types
// =============================================================================

export type ResourceType =
  | 'course'
  | 'naadac_ce'
  | 'toolkit'
  | 'handbook'
  | 'webinar'
  | 'newsletter'
  | 'video'
  | 'podcast'
  | 'paper'
  | 'infographic'
  | 'success_story'
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
  | 'rh_policies';

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

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
  // s3_key is never exposed to the client — middleware issues a presigned URL
  download_url?: string; // presigned URL, populated per-request for PDF resources
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
  type?: ResourceType;
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
  toolkit:       'Toolkit',
  handbook:      'Handbook / Guidebook',
  webinar:       'Webinar',
  newsletter:    'Newsletter',
  video:         'Video',
  podcast:       'Podcast',
  paper:         'Publication / Whitepaper',
  infographic:   'Infographic',
  success_story: 'Success Story',
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
};

export const DURATION_LABELS = {
  under_15:  'Under 15 mins',
  '16_30':   '16–30 mins',
  '31_60':   '31–60 mins',
  '61_90':   '61–90 mins',
  '91_120':  '91–120 mins',
  '121_plus':'121+ mins',
} as const;

// Badge colors matching FGI mockup
export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  course:        '#0e72a2',
  naadac_ce:     '#1a5f7a',
  toolkit:       '#2d6a4f',
  handbook:      '#3a7d44',
  webinar:       '#f4a261',
  newsletter:    '#c9a227',
  video:         '#e76f51',
  podcast:       '#7b4fa6',
  paper:         '#795548',
  infographic:   '#0097a7',
  success_story: '#388e3c',
  non_fgi:       '#8d6e63',
};
