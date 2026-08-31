import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { countOpenTickets } from '@/lib/support-db';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Admin — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

/**
 * Admin landing (Jason, 8-31-26) — reached from the "Admin" item in the
 * account menu. users.role = 'admin' only; everyone else 404s. One card per
 * admin tool; the support queue is the first, more land here as they're built.
 */
export default async function AdminPage() {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();

  const openTickets = await countOpenTickets();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 4px' }}>
        Admin
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 22px' }}>
        Learning Resource Center administration.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
        <Link
          href="/admin/support"
          style={{
            display: 'block', textDecoration: 'none', color: 'inherit',
            background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
            borderLeft: '4px solid var(--fgi-blue)', borderRadius: 'var(--radius-md)',
            padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '16px' }}>Support Queue</span>
            <span style={{
              background: openTickets > 0 ? '#fdf3dd' : '#eef1f3',
              color: openTickets > 0 ? '#8a6410' : '#5f6e7c',
              fontSize: '12.5px', fontWeight: 700, padding: '3px 11px', borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}>
              {openTickets} open
            </span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Every reported problem — triage status, priority, and replies.
          </p>
        </Link>
      </div>
    </div>
  );
}
