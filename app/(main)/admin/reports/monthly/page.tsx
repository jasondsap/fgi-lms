import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BTN, CARD, Empty, NUM, SectionTitle, Stat, TD, TH, fmtDateTime,
} from '@/components/admin/activity-ui';
import { RATING_ITEMS } from '@/lib/evaluation-items';
import { getMonthlyReport, monthOptions, parseMonth, type MonthlyReport } from '@/lib/monthly-report';
import type { DimRow } from '@/lib/vercel-analytics';
import { getViewer } from '@/lib/viewer';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

export const metadata: Metadata = { title: 'Monthly Report — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('en-US');
const typeLabel = (t: string | null) => (t ? RESOURCE_TYPE_LABELS[t as ResourceType] ?? t : '');
const score = (v: number | null) => (v === null ? '—' : v.toFixed(1));

/** Short column heads for the five rating items — the prompts are sentences. */
const RATING_SHORT: Record<(typeof RATING_ITEMS)[number]['key'], string> = {
  made_sense: 'Made sense',
  can_apply: 'Can apply',
  presented_well: 'Presented well',
  overall_impression: 'Overall',
  would_recommend: 'Recommend',
};

function Table({ head, children, minWidth }: { head: React.ReactNode; children: React.ReactNode; minWidth?: string }) {
  return (
    <div style={{ ...CARD, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth }}>
        <thead><tr>{head}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** A count cell with a proportional bar behind it — the one chart the page needs. */
function BarCell({ value, max }: { value: number; max: number }) {
  return (
    <td style={{ ...NUM, position: 'relative', minWidth: '140px' }}>
      <div style={{
        position: 'absolute', left: 0, top: '6px', bottom: '6px',
        width: `${max > 0 ? (value / max) * 100 : 0}%`,
        background: 'var(--fgi-blue)', opacity: 0.12, borderRadius: '3px',
      }} />
      <span style={{ position: 'relative' }}>{nf.format(value)}</span>
    </td>
  );
}

function DimTable({ title, rows, keyLabel }: { title: string; rows: DimRow[]; keyLabel: string }) {
  return (
    <div style={{ flex: '1 1 300px', minWidth: 0 }}>
      <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{title}</h3>
      {rows.length === 0 ? <Empty>Nothing recorded.</Empty> : (
        <Table head={<><th style={TH}>{keyLabel}</th><th style={{ ...TH, textAlign: 'right' }}>Views</th><th style={{ ...TH, textAlign: 'right' }}>Visitors</th></>}>
          {rows.map((r) => (
            <tr key={r.key}>
              <td style={{ ...TD, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.key || '(none)'}</td>
              <td style={NUM}>{nf.format(r.pageviews)}</td>
              <td style={NUM}>{nf.format(r.visitors)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function MonthNav({ r }: { r: MonthlyReport }) {
  const { month } = r;
  const pill = (active: boolean): React.CSSProperties => ({
    ...BTN, padding: '6px 12px', fontSize: '12.5px',
    background: active ? 'var(--fgi-navy)' : '#fff',
    borderColor: active ? 'var(--fgi-navy)' : 'var(--border-color)',
    color: active ? '#fff' : 'var(--text-secondary)',
  });
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      {month.prev !== month.key && (
        <Link href={`/admin/reports/monthly?month=${month.prev}`} style={pill(false)} aria-label="Previous month">←</Link>
      )}
      {monthOptions().slice(0, 6).reverse().map((m) => (
        <Link key={m.key} href={`/admin/reports/monthly?month=${m.key}`} style={pill(m.key === month.key)}>
          {m.label.replace(/ \d{4}$/, '')}
        </Link>
      ))}
      {month.next && (
        <Link href={`/admin/reports/monthly?month=${month.next}`} style={pill(false)} aria-label="Next month">→</Link>
      )}
    </div>
  );
}

/**
 * Monthly report (Jennifer, 10-1-26). Her monthly report to FGI leadership
 * asked for podcast plays, the "I am a…" registration breakdown, and
 * evaluation results; this page hands over one calendar month of all of it
 * plus traffic and the activity log, in the order her report reads, with the
 * same tables as Excel / CSV. Defaults to last month — the one being
 * reported on. Admin only; 404 otherwise, like the rest of /admin.
 */
export default async function MonthlyReportPage({
  searchParams,
}: { searchParams: { month?: string } }) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();

  const month = parseMonth(searchParams.month);
  const r = await getMonthlyReport(month);
  const t = r.traffic && !('error' in r.traffic) ? r.traffic : null;
  const s = r.evaluations.summary;
  const roleMax = Math.max(1, ...r.registrations.byRole.map((x) => x.users));
  const exportHref = (format: 'xlsx' | 'csv') => `/api/admin/reports/monthly/export?month=${month.key}&format=${format}`;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '14px' }}>
        <Link href="/admin" style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>
          ← Admin
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: 0 }}>
            Monthly Report <span style={{ color: 'var(--fgi-blue)' }}>· {month.label}</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
            {month.isCurrent ? 'Month to date. ' : ''}
            Traffic, new registrations, podcast plays, evaluations, and the most-used resources for one calendar month (UTC).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a href={exportHref('xlsx')} style={{ ...BTN, background: 'var(--fgi-blue)', color: '#fff' }}>Download Excel</a>
          <a href={exportHref('csv')} style={BTN}>Download CSV</a>
        </div>
      </div>

      <MonthNav r={r} />

      {/* ── Headline numbers ── */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '18px 0 6px' }}>
        <Stat label="Visitors" value={t ? nf.format(t.visitors) : '—'} />
        <Stat label="Page views" value={t ? nf.format(t.pageviews) : '—'} />
        <Stat label="New registrations" value={nf.format(r.registrations.total)} />
        <Stat label="Active users" value={nf.format(r.activity.activeUsers)} />
        <Stat label="Resource views" value={nf.format(r.activity.views)} />
        <Stat label="Evaluations" value={nf.format(s.responses)} />
      </div>
      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 4px', lineHeight: 1.5 }}>
        Visitors and page views come from Vercel and count browsers, including signed-out visits to the landing pages.
        Everything else counts signed-in accounts.
      </p>

      {/* ── Registrations ── */}
      <SectionTitle aside={<span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
        {r.registrations.excludedStaff > 0 && `${r.registrations.excludedStaff} staff/admin account${r.registrations.excludedStaff === 1 ? '' : 's'} excluded`}
      </span>}>
        New registrations
      </SectionTitle>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 6px' }}>Registered from</h3>
          {r.registrations.bySurface.length === 0 ? <Empty>No registrations this month.</Empty> : (
            <Table head={<><th style={TH}>Site</th><th style={{ ...TH, textAlign: 'right' }}>New learners</th></>}>
              {r.registrations.bySurface.map((x) => (
                <tr key={x.surface}><td style={TD}>{x.label}</td><td style={NUM}>{nf.format(x.count)}</td></tr>
              ))}
              <tr>
                <td style={{ ...TD, fontWeight: 700, borderBottom: 'none' }}>Total</td>
                <td style={{ ...NUM, fontWeight: 700, borderBottom: 'none' }}>{nf.format(r.registrations.total)}</td>
              </tr>
            </Table>
          )}
        </div>
        <div style={{ flex: '2 1 380px', minWidth: 0 }}>
          <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
            &#34;I am a…&#34; <span style={{ fontWeight: 400 }}>— select all that apply, so picks exceed people</span>
          </h3>
          <Table head={<><th style={TH}>Category</th><th style={{ ...TH, textAlign: 'right' }}>New learners</th></>}>
            {r.registrations.byRole.map((x) => (
              <tr key={x.role}><td style={TD}>{x.label}</td><BarCell value={x.users} max={roleMax} /></tr>
            ))}
            <tr>
              <td style={{ ...TD, color: 'var(--text-muted)', borderBottom: 'none' }}>Picked more than one category</td>
              <td style={{ ...NUM, color: 'var(--text-muted)', borderBottom: 'none' }}>{nf.format(r.registrations.multiRole)}</td>
            </tr>
          </Table>
          {r.registrations.otherTexts.length > 0 && (
            <details style={{ marginTop: '8px' }}>
              <summary style={{ fontSize: '13px', color: 'var(--fgi-blue)', cursor: 'pointer' }}>
                &#34;Other&#34; answers in their own words ({r.registrations.otherTexts.length})
              </summary>
              <ul style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--text-secondary)', margin: '8px 0 0', paddingLeft: '20px' }}>
                {r.registrations.otherTexts.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </details>
          )}
        </div>
      </div>

      {/* ── Podcast ── */}
      <SectionTitle>Podcast</SectionTitle>
      {r.podcast.length === 0 ? <Empty>No published podcast episodes.</Empty> : (
        <Table minWidth="560px" head={<>
          <th style={TH}>Episode</th>
          <th style={{ ...TH, textAlign: 'right' }}>Pressed play</th>
          <th style={{ ...TH, textAlign: 'right' }}>Plays</th>
          <th style={{ ...TH, textAlign: 'right' }}>Opened page</th>
          <th style={{ ...TH, textAlign: 'right' }}>Page opens</th>
        </>}>
          {r.podcast.map((p) => (
            <tr key={p.id}>
              <td style={TD}><Link href={`/admin/activity/resource/${p.id}`} style={{ color: 'var(--fgi-blue)' }}>{p.title}</Link></td>
              <td style={{ ...NUM, fontWeight: 700 }}>{nf.format(p.players)}</td>
              <td style={NUM}>{nf.format(p.plays)}</td>
              <td style={NUM}>{nf.format(p.openers)}</td>
              <td style={NUM}>{nf.format(p.opens)}</td>
            </tr>
          ))}
        </Table>
      )}
      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
        &#34;Pressed play&#34; counts unique signed-in users who started the audio, including the Trailer button on episode pages.
        Play tracking began Oct 1, 2026; before that only page opens exist. Plays on Spotify, Apple, and other platforms are not visible here.
      </p>

      {/* ── Evaluations ── */}
      <SectionTitle aside={<span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
        {s.responses > 0 && `${nf.format(s.users)} people · ${nf.format(s.items)} items · ${nf.format(s.may_contact)} may be contacted · ${nf.format(s.with_text)} wrote comments`}
      </span>}>
        Evaluations
      </SectionTitle>
      {s.responses === 0 ? <Empty>No evaluations submitted this month.</Empty> : (
        <>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {RATING_ITEMS.map((i) => (
              <div key={i.key} style={{ ...CARD, padding: '12px 16px', flex: '1 1 150px' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--fgi-navy)', fontVariantNumeric: 'tabular-nums' }}>
                  {score(s[i.key])} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>/ 10</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{i.prompt}</div>
              </div>
            ))}
          </div>
          <Table minWidth="720px" head={<>
            <th style={TH}>Item</th>
            <th style={TH}>Type</th>
            <th style={{ ...TH, textAlign: 'right' }}>Responses</th>
            {RATING_ITEMS.map((i) => <th key={i.key} style={{ ...TH, textAlign: 'right' }} title={i.prompt}>{RATING_SHORT[i.key]}</th>)}
          </>}>
            {r.evaluations.byItem.map((e) => (
              <tr key={e.resource_id ?? e.title}>
                <td style={TD}>
                  {e.resource_id
                    ? <Link href={`/admin/activity/resource/${e.resource_id}`} style={{ color: 'var(--fgi-blue)' }}>{e.title}</Link>
                    : e.title}
                  {e.course_code && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}> · {e.course_code}</span>}
                </td>
                <td style={{ ...TD, whiteSpace: 'nowrap' }}>{typeLabel(e.type)}</td>
                <td style={{ ...NUM, fontWeight: 700 }}>{nf.format(e.responses)}</td>
                {RATING_ITEMS.map((i) => <td key={i.key} style={NUM}>{e[i.key].toFixed(1)}</td>)}
              </tr>
            ))}
          </Table>
          {r.evaluations.comments.length > 0 && (
            <details style={{ marginTop: '8px' }}>
              <summary style={{ fontSize: '13px', color: 'var(--fgi-blue)', cursor: 'pointer' }}>
                Written comments ({r.evaluations.comments.length})
              </summary>
              <div style={{ ...CARD, marginTop: '8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                  <thead><tr>
                    <th style={TH}>Submitted</th><th style={TH}>Item</th>
                    <th style={TH}>Liked</th><th style={TH}>Did not like</th><th style={TH}>Suggestions</th>
                  </tr></thead>
                  <tbody>
                    {r.evaluations.comments.map((c, i) => (
                      <tr key={i}>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDateTime(c.created_at)}</td>
                        <td style={TD}>{c.title}</td>
                        <td style={TD}>{c.liked ?? ''}</td>
                        <td style={TD}>{c.disliked ?? ''}</td>
                        <td style={TD}>{c.future_topics ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}

      {/* ── Activity ── */}
      <SectionTitle aside={<span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
        {nf.format(r.activity.downloads)} downloads · {nf.format(r.activity.shares)} shares · {nf.format(r.activity.completions)} completions
      </span>}>
        Most-used resources
      </SectionTitle>
      {r.activity.topResources.length === 0 ? <Empty>No signed-in activity this month.</Empty> : (
        <Table minWidth="680px" head={<>
          <th style={TH}>Resource</th>
          <th style={TH}>Type</th>
          <th style={{ ...TH, textAlign: 'right' }}>People</th>
          <th style={{ ...TH, textAlign: 'right' }}>Views</th>
          <th style={{ ...TH, textAlign: 'right' }}>Downloads</th>
          <th style={{ ...TH, textAlign: 'right' }}>Shares</th>
          <th style={{ ...TH, textAlign: 'right' }}>Completions</th>
        </>}>
          {r.activity.topResources.map((x) => (
            <tr key={x.id}>
              <td style={TD}>
                <Link href={`/admin/activity/resource/${x.id}`} style={{ color: 'var(--fgi-blue)' }}>{x.title}</Link>
                {x.course_code && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}> · {x.course_code}</span>}
              </td>
              <td style={{ ...TD, whiteSpace: 'nowrap' }}>{typeLabel(x.type)}</td>
              <td style={{ ...NUM, fontWeight: 700 }}>{nf.format(x.viewers)}</td>
              <td style={NUM}>{nf.format(x.views)}</td>
              <td style={NUM}>{nf.format(x.downloads)}</td>
              <td style={NUM}>{nf.format(x.shares)}</td>
              <td style={NUM}>{nf.format(x.completions)}</td>
            </tr>
          ))}
        </Table>
      )}

      {/* ── Traffic ── */}
      <SectionTitle>Site traffic</SectionTitle>
      {r.traffic === null ? (
        <Empty>Vercel Web Analytics is not configured on this deployment — see the Analytics page for setup.</Empty>
      ) : 'error' in r.traffic ? (
        <div role="alert" style={{ ...CARD, padding: '14px 16px', borderLeft: '4px solid #b3261e', fontSize: '14px' }}>{r.traffic.error}</div>
      ) : (
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <DimTable title="Devices" rows={r.traffic.devices} keyLabel="Device" />
          <DimTable title="Top pages" rows={r.traffic.topPages} keyLabel="Path" />
          <DimTable title="Countries" rows={r.traffic.countries} keyLabel="Country" />
        </div>
      )}

      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '22px 0 0', lineHeight: 1.6 }}>
        Signed-in viewing history starts Aug 29, 2026; share and download history starts Sep 17, 2026; podcast play
        history starts Oct 1, 2026. Registrations and evaluations are complete from launch. Moodle lesson-level
        detail stays in Moodle. Generated {fmtDateTime(r.generatedAt)}.
      </p>
    </div>
  );
}
