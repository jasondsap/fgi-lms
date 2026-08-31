import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import TicketDetailView from '@/components/support/TicketDetailView';
import { requireSignIn } from '@/lib/lockdown';
import { getTicketAssignees, getTicketComments, getTicketForViewer } from '@/lib/support-db';
import { getTenantConfig } from '@/lib/tenants';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Support Ticket — Learning Resource Center' };
export const dynamic = 'force-dynamic';

export default async function TenantTicketPage({
  params,
}: { params: { tenant: string; id: string } }) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) notFound();
  const basePath = `/${tenant.slug}`;
  await requireSignIn(basePath);

  const viewer = await getViewer();
  if (!viewer.userId || !/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const isAdmin = viewer.role === 'admin';

  const ticket = await getTicketForViewer(params.id, { userId: viewer.userId, isAdmin });
  if (!ticket) notFound();
  const comments = await getTicketComments(ticket.id, isAdmin);
  const assignees = isAdmin ? await getTicketAssignees() : [];

  return (
    <>
      <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{ marginBottom: '14px' }}>
          <Link
            href={`${basePath}/support`}
            style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}
          >
            ← My Tickets
          </Link>
        </div>
        <TicketDetailView
          ticket={ticket}
          comments={comments}
          isAdmin={isAdmin}
          listPath={`${basePath}/support`}
          assignees={assignees}
          accent={tenant.primary}
        />
      </div>
      <TenantShellFooter tenant={tenant} />
    </>
  );
}
