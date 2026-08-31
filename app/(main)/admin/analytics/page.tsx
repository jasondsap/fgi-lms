import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getDailyTraffic, getTopBy, vercelAnalyticsEnabled,
  type DayPoint, type DimRow,
} from '@/lib/vercel-analytics';
import { getViewer } from '@/lib/viewer';

export const metadata: Metadata = { title: 'Analytics — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

const CARD: React.CSSProperties = {
  background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)', padding: '16px 18px',
};

const RANGES = [7, 30, 90] as const;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const nf = new Intl.NumberFormat('en-US');

/** Server-rendered bar chart — pageviews per day, no client JS. */
function TrafficChart({ days }: { days: DayPoint[] }) {
  if (days.length === 0) {
    return <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>No traffic recorded in this range yet.</p>;
  }
  const W = 800; const H = 180; const PAD = 4;
  const max = Math.max(...days.map((d) => d.pageviews), 1);
  const bw = (W - PAD * 2) / days.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Daily page views">
      {days.map((d, i) => {
        const h = Math.max((d.pageviews / max) * H, d.pageviews > 0 ? 2 : 0);
        return (
          <g key={d.timestamp}>
            <rect
              x={PAD + i * bw + bw * 0.12} y={H - h}
              width={bw * 0.76} height={h}
              rx={2} fill="var(--fgi-blue)"
            >
              <title>{`${d.timestamp.slice(0, 10)}: ${nf.format(d.pageviews)} views · ${nf.format(d.visitors)} visitors`}</title>
            </rect>
          </g>
        );
      })}
      <text x={PAD} y={H + 15} fontSize="11" fill="var(--text-muted, #5f6e7c)">{days[0].timestamp.slice(0, 10)}</text>
      <text x={W - PAD} y={H + 15} fontSize="11" textAnchor="end" fill="var(--text-muted, #5f6e7c)">{days[days.length - 1].timestamp.slice(0, 10)}</text>
    </svg>
  );
}

function TopTable({ title, rows, keyLabel }: { title: string; rows: DimRow[]; keyLabel: string }) {
  const max = Math.max(...rows.map((r) => r.pageviews), 1);
  return (
    <div style={{ ...CARD, flex: '1 1 340px', minWidth: 0 }}>
      <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 10px' }}>{title}</h2>
      {rows.length === 0 ? (
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>Nothing in this range yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ textAlign: 'left', fontWeight: 700, paddingBottom: '6px' }}>{keyLabel}</th>
              <th style={{ textAlign: 'right', fontWeight: 700, paddingBottom: '6px' }}>Views</th>
              <th style={{ textAlign: 'right', fontWeight: 700, paddingBottom: '6px' }}>Visitors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td style={{ padding: '4px 8px 4px 0', maxWidth: '260px' }}>
                  <div style={{ position: 'relative', padding: '2px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{
                      position: 'absolute', inset: 0, width: `${(r.pageviews / max) * 100}%`,
                      background: 'var(--fgi-blue)', opacity: 0.12, borderRadius: '3px',
                    }} />
                    {r.key || '(none)'}
                  </div>
                </td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{nf.format(r.pageviews)}</td>
                <td style={{ textAlign: 'right', padding: '4px 0 4px 12px', color: 'var(--text-secondary)' }}>{nf.format(r.visitors)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * Traffic analytics inside the admin panel (Jennifer's ask, 8-31-26), fed by
 * the Vercel Web Analytics API — same numbers as the Vercel dashboard,
 * rendered here so admins never need a Vercel seat.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: { searchParams: { days?: string } }) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();

  const days = RANGES.includes(Number(searchParams.days) as never) ? Number(searchParams.days) : 30;
  const until = new Date();
  const since = new Date(until.getTime() - (days - 1) * 86400_000);

  let error: string | null = null;
  let daily: DayPoint[] = [];
  let pages: DimRow[] = [];
  let countries: DimRow[] = [];
  let referrers: DimRow[] = [];
  let devices: DimRow[] = [];

  if (vercelAnalyticsEnabled) {
    try {
      [daily, pages, countries, referrers, devices] = await Promise.all([
        getDailyTraffic(iso(since), iso(until)),
        getTopBy('requestPath', iso(since), iso(until), 12),
        getTopBy('country', iso(since), iso(until), 8),
        getTopBy('referrerHostname', iso(since), iso(until), 8),
        getTopBy('deviceType', iso(since), iso(until), 4),
      ]);
    } catch (err) {
      console.error('[admin/analytics]', err);
      error = 'Could not load analytics from Vercel — the token may be invalid or expired, or Web Analytics may not be enabled yet on the project.';
    }
  }

  const totalViews = daily.reduce((s, d) => s + d.pageviews, 0);
  const totalVisitors = daily.reduce((s, d) => s + d.visitors, 0);

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '14px' }}>
        <Link href="/admin" style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>
          ← Admin
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: 0 }}>Analytics</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Site traffic across every page, from Vercel Web Analytics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics?days=${r}`}
              style={{
                fontSize: '13px', fontWeight: 600, padding: '6px 14px', borderRadius: '999px',
                textDecoration: 'none', border: '1px solid var(--border-color)',
                background: days === r ? 'var(--fgi-navy)' : '#fff',
                color: days === r ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {r} days
            </Link>
          ))}
        </div>
      </div>

      {!vercelAnalyticsEnabled ? (
        <div style={{ ...CARD, borderLeft: '4px solid var(--fgi-amber, #f2b134)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>Almost there — connect Vercel</h2>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            This page reads the Vercel Web Analytics API and needs three environment variables
            (in <code>.env.local</code> and the Vercel project settings):{' '}
            <code>VERCEL_TOKEN</code> (Account Settings → Tokens),{' '}
            <code>VERCEL_PROJECT_ID</code> (Project Settings → General), and{' '}
            <code>VERCEL_TEAM_ID</code> (Team Settings → General; omit for a personal project).
            Web Analytics must also be enabled on the project&#39;s Analytics tab.
          </p>
        </div>
      ) : error ? (
        <div role="alert" style={{ ...CARD, borderLeft: '4px solid #b3261e' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ ...CARD, flex: '1 1 180px' }}>
              <div style={{ fontSize: '30px', fontWeight: 700, color: 'var(--fgi-navy)', fontVariantNumeric: 'tabular-nums' }}>{nf.format(totalViews)}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>page views · last {days} days</div>
            </div>
            <div style={{ ...CARD, flex: '1 1 180px' }}>
              <div style={{ fontSize: '30px', fontWeight: 700, color: 'var(--fgi-navy)', fontVariantNumeric: 'tabular-nums' }}>{nf.format(totalVisitors)}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>visitors · last {days} days</div>
            </div>
          </div>

          <div style={CARD}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 12px' }}>Daily page views</h2>
            <TrafficChart days={daily} />
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <TopTable title="Top pages" rows={pages} keyLabel="Path" />
            <TopTable title="Referrers" rows={referrers} keyLabel="Source" />
          </div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <TopTable title="Countries" rows={countries} keyLabel="Country" />
            <TopTable title="Devices" rows={devices} keyLabel="Device" />
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Figures refresh every few minutes and match the Vercel dashboard. Collection began when
            Web Analytics was enabled — history before that doesn&#39;t exist.
          </p>
        </div>
      )}
    </div>
  );
}
