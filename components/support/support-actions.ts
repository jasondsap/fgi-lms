'use server';
// =============================================================================
// Server actions for the support-ticket system. Module-level on purpose —
// inline 'use server' closures lose captured bindings in the production build
// (see components/layout/auth-actions.ts). Identity always comes from the
// session; admin-ness from users.role — never from the caller.
// =============================================================================
import { revalidatePath } from 'next/cache';
import { getSession } from '@/auth';
import { notifyNewTicket, notifyTicketReply, notifyTicketResolved } from '@/lib/notify';
import {
  TICKET_CATEGORY_VALUES, TICKET_PRIORITY_VALUES, TICKET_STATUS_VALUES,
} from '@/lib/support';
import {
  addTicketComment, createTicket, getTicketForViewer, softDeleteTicket, updateTicket,
} from '@/lib/support-db';
import { getViewer } from '@/lib/viewer';

const UUID = /^[0-9a-f-]{36}$/i;

/** Bound args round-trip through the client — only accept same-site paths. */
function safePath(p: string): string {
  return /^\/[a-z0-9/[\]-]*$/i.test(p) ? p : '/support';
}

export async function createTicketAction(input: {
  title: string;
  category: string;
  priority: string;
  description: string;
  pageUrl: string | null;
  browserInfo: string | null;
}): Promise<{ id: string } | { error: string }> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Please sign in to report a problem.' };

  const title = String(input.title ?? '').trim().slice(0, 300);
  const description = String(input.description ?? '').trim().slice(0, 5000);
  if (!title) return { error: 'Please add a short title.' };
  if (!description) return { error: 'Please add your question or describe what happened.' };
  if (!TICKET_CATEGORY_VALUES.has(input.category)) return { error: 'Please choose a category.' };
  const priority = TICKET_PRIORITY_VALUES.has(input.priority) ? input.priority : 'normal';

  const id = await createTicket({
    userId,
    title,
    description,
    category: input.category,
    priority,
    pageUrl: input.pageUrl ? String(input.pageUrl).slice(0, 1000) : null,
    browserInfo: input.browserInfo ? String(input.browserInfo).slice(0, 500) : null,
  });

  // Email the queue owners (8-31-26) — best-effort: a mail failure never
  // costs the ticket, which is already saved above.
  try {
    await notifyNewTicket({
      ticketId: id,
      title,
      category: input.category,
      priority,
      description,
      submitterName: session.user.givenName ?? null,
      submitterEmail: session.user.email ?? null,
    });
  } catch (err) {
    console.error('[support] ticket saved but notification failed:', err);
  }

  return { id };
}

/**
 * Comment on a ticket the caller may see (submitter or admin). Internal notes
 * are an admin-only flag; a non-admin request silently drops it.
 */
export async function addCommentAction(
  listPath: string,
  ticketId: string,
  body: string,
  isInternal: boolean,
): Promise<{ ok: true } | { error: string }> {
  const viewer = await getViewer();
  if (!viewer.userId || !UUID.test(ticketId)) return { error: 'Please sign in.' };
  const isAdmin = viewer.role === 'admin';

  const ticket = await getTicketForViewer(ticketId, { userId: viewer.userId, isAdmin });
  if (!ticket) return { error: 'Ticket not found.' };

  const text = String(body ?? '').trim().slice(0, 5000);
  if (!text) return { error: 'Comment is empty.' };

  const internal = isAdmin && Boolean(isInternal);
  await addTicketComment({
    ticketId,
    authorId: viewer.userId,
    body: text,
    isInternal: internal,
  });

  // A public admin reply emails the submitter (8-31-26). Best-effort — the
  // comment above is already saved.
  if (isAdmin && !internal && ticket.submitted_by !== viewer.userId && ticket.submitted_by_email) {
    try {
      await notifyTicketReply({
        ticketId,
        title: ticket.title,
        body: text,
        toEmail: ticket.submitted_by_email,
        surface: ticket.submitted_by_surface,
      });
    } catch (err) {
      console.error('[support] comment saved but reply notification failed:', err);
    }
  }

  revalidatePath(`${safePath(listPath)}/${ticketId}`);
  return { ok: true };
}

/** Admin only: status / priority / assignee / resolution note. */
export async function updateTicketAction(
  listPath: string,
  ticketId: string,
  input: { status: string; priority: string; assignedTo: string | null; resolutionNote: string },
): Promise<{ ok: true } | { error: string }> {
  const viewer = await getViewer();
  if (viewer.role !== 'admin' || !viewer.userId || !UUID.test(ticketId)) return { error: 'Not allowed.' };
  if (!TICKET_STATUS_VALUES.has(input.status)) return { error: 'Unknown status.' };
  if (!TICKET_PRIORITY_VALUES.has(input.priority)) return { error: 'Unknown priority.' };
  const assignedTo = input.assignedTo && UUID.test(input.assignedTo) ? input.assignedTo : null;

  // Read the ticket first so we can see the status transition below.
  const before = await getTicketForViewer(ticketId, { userId: viewer.userId, isAdmin: true });
  if (!before) return { error: 'Ticket not found.' };

  const resolutionNote = String(input.resolutionNote ?? '').trim().slice(0, 2000) || null;
  await updateTicket({
    ticketId,
    status: input.status,
    priority: input.priority,
    assignedTo,
    resolutionNote,
  });

  // Entering resolved/closed emails the submitter (8-31-26). Only on the
  // transition — re-saving an already-resolved ticket stays quiet. Best-effort.
  const DONE = new Set(['resolved', 'closed']);
  if (
    DONE.has(input.status) && !DONE.has(before.status)
    && before.submitted_by !== viewer.userId && before.submitted_by_email
  ) {
    try {
      await notifyTicketResolved({
        ticketId,
        title: before.title,
        status: input.status,
        resolutionNote,
        toEmail: before.submitted_by_email,
        surface: before.submitted_by_surface,
      });
    } catch (err) {
      console.error('[support] ticket updated but resolution notification failed:', err);
    }
  }

  revalidatePath(`${safePath(listPath)}/${ticketId}`);
  revalidatePath('/admin/support');
  return { ok: true };
}

/**
 * Admin only: soft delete (deleted_at + deleted_by). The row survives in the
 * database for the audit trail, but disappears from every queue and from the
 * submitter's My Tickets.
 */
export async function deleteTicketAction(
  ticketId: string,
): Promise<{ ok: true } | { error: string }> {
  const viewer = await getViewer();
  if (viewer.role !== 'admin' || !viewer.userId || !UUID.test(ticketId)) {
    return { error: 'Not allowed.' };
  }
  await softDeleteTicket(ticketId, viewer.userId);
  revalidatePath('/admin/support');
  return { ok: true };
}
