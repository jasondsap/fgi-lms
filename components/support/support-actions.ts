'use server';
// =============================================================================
// Server actions for the support-ticket system. Module-level on purpose —
// inline 'use server' closures lose captured bindings in the production build
// (see components/layout/auth-actions.ts). Identity always comes from the
// session; admin-ness from users.role — never from the caller.
// =============================================================================
import { revalidatePath } from 'next/cache';
import { getSession } from '@/auth';
import { notifyNewTicket } from '@/lib/notify';
import {
  TICKET_CATEGORY_VALUES, TICKET_PRIORITY_VALUES, TICKET_STATUS_VALUES,
} from '@/lib/support';
import {
  addTicketComment, createTicket, getTicketForViewer, updateTicket,
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
  if (!description) return { error: 'Please describe what happened.' };
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

  await addTicketComment({
    ticketId,
    authorId: viewer.userId,
    body: text,
    isInternal: isAdmin && Boolean(isInternal),
  });
  revalidatePath(`${safePath(listPath)}/${ticketId}`);
  return { ok: true };
}

/** Admin only: status / priority / resolution note. */
export async function updateTicketAction(
  listPath: string,
  ticketId: string,
  input: { status: string; priority: string; resolutionNote: string },
): Promise<{ ok: true } | { error: string }> {
  const viewer = await getViewer();
  if (viewer.role !== 'admin' || !UUID.test(ticketId)) return { error: 'Not allowed.' };
  if (!TICKET_STATUS_VALUES.has(input.status)) return { error: 'Unknown status.' };
  if (!TICKET_PRIORITY_VALUES.has(input.priority)) return { error: 'Unknown priority.' };

  await updateTicket({
    ticketId,
    status: input.status,
    priority: input.priority,
    resolutionNote: String(input.resolutionNote ?? '').trim().slice(0, 2000) || null,
  });
  revalidatePath(`${safePath(listPath)}/${ticketId}`);
  revalidatePath('/admin/support');
  return { ok: true };
}
