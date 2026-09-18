// =============================================================================
// Shared pieces for the admin Activity pages (9-17-26). Server-safe: no hooks.
// The search form and range pills are plain GET navigation so the pages stay
// server-rendered like the rest of /admin.
// =============================================================================
import Link from 'next/link';
import { RANGE_DAYS, RANGE_LABEL, type RangeDays } from '@/lib/admin-activity';

export const CARD: React.CSSProperties = {
  background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
};

export const TH: React.CSSProperties = {
  textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '8px 10px',
  borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap',
};

export const TD: React.CSSProperties = {
  fontSize: '13.5px', padding: '8px 10px', borderBottom: '1px solid var(--border-color)',
  verticalAlign: 'top',
};

export const NUM: React.CSSProperties = { ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export const BTN: React.CSSProperties = {
  display: 'inline-block', padding: '7px 14px', fontSize: '13px', fontWeight: 700,
  fontFamily: 'inherit', borderRadius: '999px', textDecoration: 'none', cursor: 'pointer',
  border: '1.5px solid var(--fgi-blue)', color: 'var(--fgi-blue)', background: '#fff',
};

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** Window pills — every other query param is kept so the search survives a range change. */
export function RangePills({ href, days, params }: { href: string; days: RangeDays; params?: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {RANGE_DAYS.map((d) => {
        const qs = new URLSearchParams({ ...(params ?? {}), days: String(d) }).toString();
        const active = d === days;
        return (
          <Link
            key={d}
            href={`${href}?${qs}`}
            style={{
              ...BTN, padding: '6px 12px', fontSize: '12.5px',
              background: active ? 'var(--fgi-navy)' : '#fff',
              borderColor: active ? 'var(--fgi-navy)' : 'var(--border-color)',
              color: active ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {RANGE_LABEL[d]}
          </Link>
        );
      })}
    </div>
  );
}

export function SearchForm({ q, days, placeholder }: { q: string; days: RangeDays; placeholder: string }) {
  return (
    <form method="get" action="/admin/activity" style={{ display: 'flex', gap: '8px', flex: '1 1 320px' }}>
      <input type="hidden" name="days" value={days} />
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label="Search activity"
        style={{
          flex: 1, padding: '9px 14px', fontSize: '13.5px', fontFamily: 'inherit',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
          background: '#fff', color: 'var(--text-primary)',
        }}
      />
      <button type="submit" style={{ ...BTN, background: 'var(--fgi-blue)', color: '#fff' }}>Search</button>
    </form>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...CARD, padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', margin: '22px 0 10px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fgi-navy)', margin: 0 }}>{children}</h2>
      {aside}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ ...CARD, padding: '12px 16px', minWidth: '120px', flex: '1 1 120px' }}>
      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--fgi-navy)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</div>
    </div>
  );
}
