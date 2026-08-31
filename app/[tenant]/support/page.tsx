import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '@/auth';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { ReportProblemButton } from '@/components/support/ReportProblemModal';
import TicketListView from '@/components/support/TicketListView';
import { requireSignIn } from '@/lib/lockdown';
import { getMyTickets } from '@/lib/support-db';
import { getTenantConfig } from '@/lib/tenants';

export const metadata: Metadata = { title: 'My Tickets — Learning Resource Center' };
export const dynamic = 'force-dynamic';

/** Tenant-chromed My Tickets — same list, portal header/footer. */
export default async function TenantSupportPage({ params }: { params: { tenant: string } }) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) notFound();
  const basePath = `/${tenant.slug}`;
  await requireSignIn(basePath);

  const session = await getSession();
  const userId = session?.user?.id;
  const tickets = userId ? await getMyTickets(userId) : [];

  return (
    <>
      <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: '12px', flexWrap: 'wrap', marginBottom: '1.5rem',
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: 0 }}>
              My Tickets
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Problems you&#39;ve reported and their status.
            </p>
          </div>
          {userId && <ReportProblemButton basePath={basePath} accent={tenant.primary} />}
        </div>

        {userId ? (
          <TicketListView tickets={tickets} basePath={basePath} />
        ) : (
          <div style={{
            background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', padding: '3rem 1.5rem', textAlign: 'center',
          }}>
            <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Please sign in</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              Use the Sign In button at the top right to see and report support tickets.
            </p>
          </div>
        )}
      </div>
      <TenantShellFooter tenant={tenant} />
    </>
  );
}
