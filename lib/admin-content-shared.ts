// =============================================================================
// Admin content uploads — PURE module (client-safe, no server imports).
// Shapes and naming rules shared by the /admin/content pages, their server
// actions and lib/admin-content.ts.
// =============================================================================
import type { AudienceTag, TopicTag } from '@/types';

/** The two types Jennifer can load herself (11-19-26). Webinars need a Moodle
    course build and are still handed off. */
export const CONTENT_TYPES = ['newsletter', 'podcast'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
];

/** Upload ceilings, checked against the stored object after the PUT. */
export const MAX_FILE_BYTES: Record<ContentType, number> = {
  newsletter: 100 * 1024 * 1024,
  podcast: 400 * 1024 * 1024,
};
export const FILE_CONTENT_TYPE: Record<ContentType, string> = {
  newsletter: 'application/pdf',
  podcast: 'audio/mpeg',
};

/**
 * Slug and S3 key follow the loader scripts exactly
 * (scripts/load-newsletter-archive.js, scripts/load-podcasts.js) so a row
 * made here is indistinguishable from one they made.
 */
export function newsletterSlug(month: number, year: number): string {
  return `rcoe-${MONTHS[month - 1].toLowerCase()}-${year}-newsletter`;
}
export function podcastSlug(episode: number): string {
  return `recovery-ecosystem-radio-episode-${episode}`;
}
export function fileKeyFor(type: ContentType, slug: string): string {
  return type === 'newsletter'
    ? `newsletters/fletcher-group-${slug}.pdf`
    : `podcasts/${slug}.mp3`;
}

/** Headshots / org logos uploaded from the admin page live under this S3
    prefix and are served by app/media/[...key]/route.ts. */
export const MEDIA_URL = /^\/media\/presenters\/[a-z0-9-]+\.(webp|png)$/;
/** Anything a presenter image may point at: a committed file or an upload. */
export const IMAGE_URL = /^\/(images|media)\/[A-Za-z0-9._/-]+$/;

export interface GuestInput {
  /** Existing presenters.id, or null to create / match by name. */
  id: string | null;
  name: string;
  credentials: string;
  title: string;
  bio: string;
  photo_url: string;
  org_name: string;
  org_logo_url: string;
  org_url: string;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  description: string;
  duration_minutes: number | null;
  audience_tags: AudienceTag[];
  topic_tags: TopicTag[];
  search_keywords: string[];
  internal: boolean;
  published: boolean;
  /** YYYY-MM-DD (UTC) of resources.published_at. */
  published_date: string;
  course_code: string | null;
  has_file: boolean;
  /** Short-lived link to the stored file, for the "open current file" link. */
  file_url: string | null;
  updated_at: string;
}

export interface ContentListRow {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  published: boolean;
  internal: boolean;
  published_date: string;
  course_code: string | null;
  has_file: boolean;
}

export interface PinOption {
  id: string;
  type: string;
  title: string;
  published_date: string;
  published: boolean;
}

export interface ContentSaveInput {
  title: string;
  description: string;
  published_date: string;
  duration_minutes: number | null;
  audience_tags: string[];
  topic_tags: string[];
  search_keywords: string[];
  internal: boolean;
  /** resources.id of every pinned companion — the complete list. */
  pins: string[];
  /** Podcast only. `undefined` leaves the guest alone; `null` removes it. */
  guest?: GuestInput | null;
}
