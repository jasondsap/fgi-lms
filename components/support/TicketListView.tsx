import Link from 'next/link';
import {
  CATEGORY_LABEL, PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL,
  type SupportTicket,
} from '@/lib/support';

/** Deterministic date text — same output on server and client. */
export function ticketDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TicketPill({ kind, value }: { kind: 'status' | 'priority'; value: string }) {
  const map = kind === 'status' ? STATUS_COLOR : PRIORITY_COLOR;
  const label = kind === 'status' ? STATUS_LABEL[value] : PRIORITY_LABEL[value];
  const c = map[value] ?? { bg: '#eef1f3', fg: '#5f6e7c' };
  return (
    <span style={{
      background: c.bg, color: c.fg, fontSize: '11.5px', fontWeight: 700,
      padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap',
    }}>
      {label ?? value}
    </span>
  );
}

/**
 * Ticket list rows — shared by My Tickets (both chromes) and the admin queue
 * (which turns on the submitter column). Server-renderable; rows are plain
 * links to the detail page.
 */
export default function TicketListView({
  tickets, basePath = '', showSubmitter = false,
}: {
  tickets: SupportTicket[];
  /** '' on FGI, '/scarr' etc. on a tenant. */
  basePath?: string;
  showSubmitter?: boolean;
}) {
  if (tickets.length === 0) {
    return (
      <div style={{
        background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', padding: '3rem 1.5rem', textAlign: 'center',
      }}>
        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>No tickets yet</p>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
          When something isn&#39;t working, report it and we&#39;ll follow up here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {tickets.map((t) => (
        <Link
          key={t.id}
          href={`${basePath}/support/${t.id}`}
          style={{
            display: 'block', textDecoration: 'none', color: 'inherit',
            background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', padding: '13px 17px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '5px' }}>
            <TicketPill kind="status" value={t.status} />
            <TicketPill kind="priority" value={t.priority} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {CATEGORY_LABEL[t.category] ?? t.category}
            </span>
            {typeof t.comment_count === 'number' && t.comment_count > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                · {t.comment_count} comment{t.comment_count === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: '15px', lineHeight: 1.35 }}>{t.title}</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
            {showSubmitter && (t.submitted_by_name || t.submitted_by_email) && (
              <>From {t.submitted_by_name || t.submitted_by_email} · </>
            )}
            Opened {ticketDate(t.created_at)} · Updated {ticketDate(t.updated_at)}
          </div>
        </Link>
      ))}
    </div>
  );
}
