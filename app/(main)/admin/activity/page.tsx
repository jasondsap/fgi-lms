import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  CARD, Empty, NUM, RangePills, SearchForm, SectionTitle, TD, TH, fmtDate,
} from '@/components/admin/activity-ui';
import { roleConfig } from '@/components/admin/roles';
import {
  parseRange, personName, searchPeople, searchResources, RANGE_LABEL,
} from '@/lib/admin-activity';
import { getViewer } from '@/lib/viewer';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

export const metadata: Metadata = { title: 'Activity — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

const typeLabel = (t: string) => RESOURCE_TYPE_LABELS[t as ResourceType] ?? t;

/**
 * Admin activity report (Jennifer, 9-17-26): one search box answers both
 * "what has this person / organization accessed?" and "who accessed this
 * resource?". People match on name, email, or organization; resources on
 * title or ID. Each row drills into a full log with CSV export. With no
 * search the page shows the most active people and resources in the window.
 */
export default async function AdminActivityPage({
  searchParams,
}: { searchParams: { q?: string; days?: string } }) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();

  const q = (searchParams.q ?? '').trim().slice(0, 100);
  const days = parseRange(searchParams.days);
  const limit = q ? 200 : 25;

  const [people, resources] = await Promise.all([
    searchPeople(q, days, limit),
    searchResources(q, days, limit),
  ]);
  const activePeople = q ? people : people.filter((p) => p.last_seen);
  const activeResources = q ? resources : resources.filter((r) => r.last_seen);

  // Organization roll-up: when every matched person shares one organization
  // (or the search is an org name), the totals line is that org's activity.
  const orgTotals = activePeople.reduce(
    (t, p) => ({
      views: t.views + p.views, shares: t.shares + p.shares,
      downloads: t.downloads + p.downloads, completions: t.completions + p.completions,
    }),
    { views: 0, shares: 0, downloads: 0, completions: 0 },
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '14px' }}>
        <Link href="/admin" style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>
          ← Admin
        </Link>
      </div>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 4px' }}>
        Activity
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 18px', lineHeight: 1.5 }}>
        What signed-in learners viewed, shared, downloaded, and completed. Search a person, an email,
        an organization, or a resource title or ID. Signed-out browsing is not attributed; viewing
        history starts Aug 29, 2026 and share/download history starts Sep 17, 2026.
      </p>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
        <SearchForm q={q} days={days} placeholder="Name, email, organization, resource title, or ID…" />
        <RangePills href="/admin/activity" days={days} params={q ? { q } : undefined} />
      </div>

      {/* People */}
      <SectionTitle
        aside={q && activePeople.length > 1 ? (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {activePeople.length} people · {orgTotals.views} views · {orgTotals.shares} shares ·{' '}
            {orgTotals.downloads} downloads · {orgTotals.completions} completions
          </span>
        ) : undefined}
      >
        {q ? `People matching “${q}”` : `Most active people · ${RANGE_LABEL[days]}`}
      </SectionTitle>
      {activePeople.length === 0 ? (
        <Empty>{q ? 'No accounts match.' : 'No learner activity in this window yet.'}</Empty>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Person</th>
                <th style={TH}>Organization</th>
                <th style={{ ...TH, textAlign: 'right' }}>Views</th>
                <th style={{ ...TH, textAlign: 'right' }}>Shares</th>
                <th style={{ ...TH, textAlign: 'right' }}>Downloads</th>
                <th style={{ ...TH, textAlign: 'right' }}>Completed</th>
                <th style={TH}>Last active</th>
              </tr>
            </thead>
            <tbody>
              {activePeople.map((p) => {
                const rc = roleConfig(p.role);
                return (
                  <tr key={p.id}>
                    <td style={TD}>
                      <Link
                        href={`/admin/activity/user/${p.id}?days=${days}`}
                        style={{ color: 'var(--fgi-blue)', fontWeight: 700, textDecoration: 'none' }}
                      >
                        {personName(p)}
                      </Link>
                      {p.role !== 'learner' && (
                        <span style={{
                          marginLeft: '8px', background: rc.bg, color: rc.fg, fontSize: '10.5px',
                          fontWeight: 700, padding: '2px 8px', borderRadius: '999px', verticalAlign: 'middle',
                        }}>
                          {rc.label}
                        </span>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{p.email}</div>
                    </td>
                    <td style={TD}>{p.organization || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={NUM}>{p.views}</td>
                    <td style={NUM}>{p.shares}</td>
                    <td style={NUM}>{p.downloads}</td>
                    <td style={NUM}>{p.completions}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(p.last_seen)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resources */}
      <SectionTitle>
        {q ? `Resources matching “${q}”` : `Most viewed resources · ${RANGE_LABEL[days]}`}
      </SectionTitle>
      {activeResources.length === 0 ? (
        <Empty>{q ? 'No resources match.' : 'No resource activity in this window yet.'}</Empty>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Resource</th>
                <th style={TH}>ID</th>
                <th style={{ ...TH, textAlign: 'right' }}>Views</th>
                <th style={{ ...TH, textAlign: 'right' }}>People</th>
                <th style={{ ...TH, textAlign: 'right' }}>Shares</th>
                <th style={{ ...TH, textAlign: 'right' }}>Downloads</th>
                <th style={{ ...TH, textAlign: 'right' }}>Completed</th>
                <th style={TH}>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {activeResources.map((r) => (
                <tr key={r.id}>
                  <td style={TD}>
                    <Link
                      href={`/admin/activity/resource/${r.id}?days=${days}`}
                      style={{ color: 'var(--fgi-blue)', fontWeight: 700, textDecoration: 'none' }}
                    >
                      {r.title}
                    </Link>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{typeLabel(r.type)}</div>
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{r.course_code ?? '—'}</td>
                  <td style={NUM}>{r.views}</td>
                  <td style={NUM}>{r.viewers}</td>
                  <td style={NUM}>{r.shares}</td>
                  <td style={NUM}>{r.downloads}</td>
                  <td style={NUM}>{r.completions}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(r.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
