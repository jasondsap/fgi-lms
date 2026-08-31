import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TicketDetailView from '@/components/support/TicketDetailView';
import { requireSignIn } from '@/lib/lockdown';
import { getTicketAssignees, getTicketComments, getTicketForViewer } from '@/lib/support-db';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Support Ticket — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

export default async function TicketPage({ params }: { params: { id: string } }) {
  await requireSignIn('/');
  const viewer = await getViewer();
  if (!viewer.userId || !/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const isAdmin = viewer.role === 'admin';

  const ticket = await getTicketForViewer(params.id, { userId: viewer.userId, isAdmin });
  if (!ticket) notFound();
  const comments = await getTicketComments(ticket.id, isAdmin);
  const assignees = isAdmin ? await getTicketAssignees() : [];

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '14px', display: 'flex', gap: '14px' }}>
        <Link href="/support" style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>
          ← My Tickets
        </Link>
        {isAdmin && (
          <Link href="/admin/support" style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>
            Support queue
          </Link>
        )}
      </div>
      <TicketDetailView ticket={ticket} comments={comments} isAdmin={isAdmin} listPath="/support" assignees={assignees} />
    </div>
  );
}
