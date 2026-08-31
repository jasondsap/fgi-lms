import type { Metadata } from 'next';
import { getSession } from '@/auth';
import { requireSignIn } from '@/lib/lockdown';
import { ReportProblemButton } from '@/components/support/ReportProblemModal';
import TicketListView from '@/components/support/TicketListView';
import { getMyTickets } from '@/lib/support-db';

export const metadata: Metadata = { title: 'My Tickets — FGI Learning Resource Center' };

// Per-user page: never cached.
export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  await requireSignIn('/');
  const session = await getSession();
  const userId = session?.user?.id;
  const tickets = userId ? await getMyTickets(userId) : [];

  return (
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
        {userId && <ReportProblemButton />}
      </div>

      {userId ? (
        <TicketListView tickets={tickets} />
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
  );
}
