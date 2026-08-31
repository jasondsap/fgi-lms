import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TicketListView from '@/components/support/TicketListView';
import { STATUS_LABEL, TICKET_STATUSES } from '@/lib/support';
import { getAllTickets } from '@/lib/support-db';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Support Queue — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

/**
 * The full triage queue — the LRC's first admin page (8-31-26). users.role =
 * 'admin' only; everyone else 404s so the URL leaks nothing. Active tickets
 * first; ?status=<x> filters. Rows open the shared /support/<id> detail,
 * where the admin controls live.
 */
export default async function AdminSupportPage({
  searchParams,
}: { searchParams: { status?: string } }) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();

  const statusFilter = TICKET_STATUSES.includes(searchParams.status as never)
    ? searchParams.status
    : undefined;
  const tickets = await getAllTickets(statusFilter);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 4px' }}>
        Support Queue
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 18px' }}>
        Every ticket in the Learning Resource Center — worked by Learning Center Support.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <Link
          href="/admin/support"
          style={{
            fontSize: '13px', fontWeight: 600, padding: '6px 14px', borderRadius: '999px',
            textDecoration: 'none',
            background: !statusFilter ? 'var(--fgi-navy)' : '#fff',
            color: !statusFilter ? '#fff' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          All
        </Link>
        {TICKET_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/support?status=${s}`}
            style={{
              fontSize: '13px', fontWeight: 600, padding: '6px 14px', borderRadius: '999px',
              textDecoration: 'none',
              background: statusFilter === s ? 'var(--fgi-navy)' : '#fff',
              color: statusFilter === s ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <TicketListView tickets={tickets} showSubmitter />
    </div>
  );
}
