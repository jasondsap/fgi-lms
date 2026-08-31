// =============================================================================
// Support tickets — ported from the DDOR platform (Jason, 8-31-26; queue owned
// by Learning Center Support / LC@fletchergroup.org per Jennifer).
// =============================================================================
//
// Phase 1 of the agreed port: tickets + comments, no attachments (the DDOR
// S3 presign flow comes later if needed).
//
// PURE module (the hard-won DDOR lesson, relearned 8-31-26): constants,
// types and row shapes ONLY, no server imports — client components (the
// report modal, the ticket views) import this, so anything touching
// lib/db here ends up in the browser bundle and crashes on the missing
// DATABASE_URL. Queries live in lib/support-db.ts (server-only).
//
// Access model: submitters see their own tickets; users.role = 'admin' sees
// and works the full queue (/admin/support — the LRC's first admin page).
// Internal comments (is_internal) are admin-only and are stripped before a
// non-admin viewer ever receives them.

// ---- Vocabularies (code-as-config, matching the DDOR convention) -----------

export const TICKET_CATEGORIES = [
  // 'question' added 8-31-26 (Jennifer/Jason): tickets are for questions too,
  // not just problems. Requires 'question' in the support_tickets_category_chk
  // CHECK constraint (widened via direct SQL in Neon, like all schema).
  { value: 'question', label: 'Ask a question' },
  { value: 'bug', label: 'Something is broken' },
  { value: 'access', label: 'Sign-in / access problem' },
  { value: 'content', label: 'Content issue (wrong or missing material)' },
  { value: 'certificate', label: 'Certificate / CE credit problem' },
  { value: 'feature', label: 'Suggestion / feature request' },
  { value: 'other', label: 'Other' },
] as const;

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const TICKET_STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed'] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]['value'];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORY_VALUES = new Set<string>(TICKET_CATEGORIES.map((c) => c.value));
export const TICKET_PRIORITY_VALUES = new Set<string>(TICKET_PRIORITIES);
export const TICKET_STATUS_VALUES = new Set<string>(TICKET_STATUSES);

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  TICKET_CATEGORIES.map((c) => [c.value, c.label]),
);
export const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting: 'Waiting on you',
  resolved: 'Resolved',
  closed: 'Closed',
};
export const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
};

/** Semantic pill colours (LRC style: inline hex pairs, not utility classes). */
export const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  open:        { bg: '#e8f2f8', fg: '#0e72a2' },
  in_progress: { bg: '#fdf3dd', fg: '#8a6410' },
  waiting:     { bg: '#efe8f8', fg: '#6a3fa0' },
  resolved:    { bg: '#e6f4ea', fg: '#1e7a3a' },
  closed:      { bg: '#eef1f3', fg: '#5f6e7c' },
};
export const PRIORITY_COLOR: Record<string, { bg: string; fg: string }> = {
  low:    { bg: '#eef1f3', fg: '#5f6e7c' },
  normal: { bg: '#e8f2f8', fg: '#0e72a2' },
  high:   { bg: '#fdf3dd', fg: '#8a6410' },
  urgent: { bg: '#fdecec', fg: '#b3261e' },
};

// ---- Row shapes ------------------------------------------------------------

export interface SupportTicket {
  id: string;
  submitted_by: string;
  assigned_to: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  page_url: string | null;
  browser_info: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  // joined display fields
  submitted_by_name?: string | null;
  submitted_by_email?: string | null;
  /** users.registered_surface — picks the ticket link in submitter emails. */
  submitted_by_surface?: string | null;
  assigned_to_name?: string | null;
  comment_count?: number;
}

/** Admin option for the assignee dropdown. */
export interface TicketAssignee {
  id: string;
  name: string;
}

export interface SupportTicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
  author_name?: string | null;
  author_is_admin?: boolean;
}
