// =============================================================================
// Support tickets — ported from the DDOR platform (Jason, 8-31-26; queue owned
// by Learning Center Support / LC@fletchergroup.org per Jennifer).
// =============================================================================
//
// Phase 1 of the agreed port: tickets + comments, no attachments (the DDOR
// S3 presign flow comes later if needed). Constants and row shapes up top are
// importable by client components; the query helpers below touch the DB and
// are server-only in practice.
//
// Access model: submitters see their own tickets; users.role = 'admin' sees
// and works the full queue (/admin/support — the LRC's first admin page).
// Internal comments (is_internal) are admin-only and are stripped before a
// non-admin viewer ever receives them.
import { sql } from '@/lib/db';

// ---- Vocabularies (code-as-config, matching the DDOR convention) -----------

export const TICKET_CATEGORIES = [
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
  comment_count?: number;
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

// ---- Queries (server-only) -------------------------------------------------

const TICKET_COLS = `
  t.id, t.submitted_by, t.title, t.description, t.category, t.priority,
  t.status, t.page_url, t.browser_info, t.resolution_note,
  t.created_at, t.updated_at,
  trim(coalesce(u.given_name, '') || ' ' || coalesce(u.family_name, '')) AS submitted_by_name,
  u.email AS submitted_by_email`;

export async function createTicket(input: {
  userId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  pageUrl: string | null;
  browserInfo: string | null;
}): Promise<string> {
  const rows = await sql`
    INSERT INTO support_tickets (submitted_by, title, description, category, priority, page_url, browser_info)
    VALUES (${input.userId}, ${input.title}, ${input.description}, ${input.category},
            ${input.priority}, ${input.pageUrl}, ${input.browserInfo})
    RETURNING id
  `;
  return rows[0].id as string;
}

/** The submitter's own tickets, newest first. */
export async function getMyTickets(userId: string): Promise<SupportTicket[]> {
  return (await sql`
    SELECT t.id, t.title, t.category, t.priority, t.status, t.created_at, t.updated_at,
           (SELECT count(*)::int FROM support_ticket_comments c
             WHERE c.ticket_id = t.id AND c.is_internal = FALSE) AS comment_count
    FROM support_tickets t
    WHERE t.submitted_by = ${userId} AND t.deleted_at IS NULL
    ORDER BY t.created_at DESC
  `) as unknown as SupportTicket[];
}

/** Full queue for the admin page, optionally filtered by status. */
export async function getAllTickets(status?: string): Promise<SupportTicket[]> {
  const rows = status
    ? await sql(
        `SELECT ${TICKET_COLS},
           (SELECT count(*)::int FROM support_ticket_comments c WHERE c.ticket_id = t.id) AS comment_count
         FROM support_tickets t JOIN users u ON u.id = t.submitted_by
         WHERE t.deleted_at IS NULL AND t.status = $1
         ORDER BY t.created_at DESC`,
        [status],
      )
    : await sql(
        `SELECT ${TICKET_COLS},
           (SELECT count(*)::int FROM support_ticket_comments c WHERE c.ticket_id = t.id) AS comment_count
         FROM support_tickets t JOIN users u ON u.id = t.submitted_by
         WHERE t.deleted_at IS NULL
         ORDER BY CASE WHEN t.status IN ('open', 'in_progress', 'waiting') THEN 0 ELSE 1 END,
                  t.created_at DESC`,
      );
  return rows as unknown as SupportTicket[];
}

/**
 * One ticket, only if this viewer may see it: the submitter or an admin.
 * Returns null otherwise so pages can 404 without leaking existence.
 */
export async function getTicketForViewer(
  ticketId: string,
  viewer: { userId: string; isAdmin: boolean },
): Promise<SupportTicket | null> {
  const rows = (await sql`
    SELECT t.id, t.submitted_by, t.title, t.description, t.category, t.priority,
           t.status, t.page_url, t.browser_info, t.resolution_note,
           t.created_at, t.updated_at,
           trim(coalesce(u.given_name, '') || ' ' || coalesce(u.family_name, '')) AS submitted_by_name,
           u.email AS submitted_by_email
    FROM support_tickets t JOIN users u ON u.id = t.submitted_by
    WHERE t.id = ${ticketId} AND t.deleted_at IS NULL
  `) as unknown as SupportTicket[];
  const ticket = rows[0];
  if (!ticket) return null;
  if (!viewer.isAdmin && ticket.submitted_by !== viewer.userId) return null;
  return ticket;
}

/** Comments on a ticket; internal notes only reach admins. */
export async function getTicketComments(
  ticketId: string,
  includeInternal: boolean,
): Promise<SupportTicketComment[]> {
  const rows = (await sql`
    SELECT c.id, c.ticket_id, c.author_id, c.body, c.is_internal, c.created_at,
           trim(coalesce(u.given_name, '') || ' ' || coalesce(u.family_name, '')) AS author_name,
           (u.role = 'admin') AS author_is_admin
    FROM support_ticket_comments c JOIN users u ON u.id = c.author_id
    WHERE c.ticket_id = ${ticketId}
    ORDER BY c.created_at ASC
  `) as unknown as SupportTicketComment[];
  return includeInternal ? rows : rows.filter((c) => !c.is_internal);
}

export async function addTicketComment(input: {
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
}): Promise<void> {
  await sql`
    INSERT INTO support_ticket_comments (ticket_id, author_id, body, is_internal)
    VALUES (${input.ticketId}, ${input.authorId}, ${input.body}, ${input.isInternal})
  `;
  await sql`UPDATE support_tickets SET updated_at = now() WHERE id = ${input.ticketId}`;
}

/** Admin: status / priority / resolution note. Values validated by the caller. */
export async function updateTicket(input: {
  ticketId: string;
  status: string;
  priority: string;
  resolutionNote: string | null;
}): Promise<void> {
  await sql`
    UPDATE support_tickets SET
      status = ${input.status},
      priority = ${input.priority},
      resolution_note = ${input.resolutionNote},
      updated_at = now()
    WHERE id = ${input.ticketId} AND deleted_at IS NULL
  `;
}

/** Open-queue badge count for the admin entry point. */
export async function countOpenTickets(): Promise<number> {
  const rows = await sql`
    SELECT count(*)::int AS n FROM support_tickets
    WHERE deleted_at IS NULL AND status IN ('open', 'in_progress', 'waiting')
  `;
  return (rows[0]?.n as number) ?? 0;
}
