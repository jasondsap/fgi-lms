// =============================================================================
// Support tickets — queries. SERVER-ONLY: imports lib/db. Constants, types
// and row shapes live in lib/support.ts (pure, client-safe).
// =============================================================================
import { sql } from '@/lib/db';
import type { SupportTicket, SupportTicketComment } from '@/lib/support';

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
