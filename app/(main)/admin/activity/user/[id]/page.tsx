import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BTN, CARD, Empty, NUM, RangePills, SectionTitle, Stat, TD, TH, fmtDate, fmtDateTime,
} from '@/components/admin/activity-ui';
import { roleConfig } from '@/components/admin/roles';
import { EVENT_LABEL, getUserEvents, parseRange, personName, RANGE_LABEL } from '@/lib/admin-activity';
import { getBookmarks, getUserProgress } from '@/lib/progress';
import { getUserById } from '@/lib/users';
import { getViewer } from '@/lib/viewer';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

export const metadata: Metadata = { title: 'Learner activity — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/i;
const typeLabel = (t: string | null) => (t ? RESOURCE_TYPE_LABELS[t as ResourceType] ?? t : '');

function courseStatus(p: { completed_at: string | null; pct: number }): string {
  if (p.completed_at) return 'Completed';
  return p.pct > 0 ? `In progress · ${Math.round(p.pct)}%` : 'Started';
}

/**
 * One person's full activity (Jennifer, 9-17-26): course status from the
 * Moodle mirror, the event log (views, shares, downloads), and favorites.
 * The CSV export carries the same rows for audits and grant reports.
 */
export default async function AdminUserActivityPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { days?: string } }) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();
  if (!UUID.test(params.id)) notFound();

  const days = parseRange(searchParams.days);
  const user = await getUserById(params.id);
  if (!user) notFound();

  const [events, progress, bookmarks] = await Promise.all([
    getUserEvents(user.id, days),
    getUserProgress(user.id),
    getBookmarks(user.id),
  ]);
  const rc = roleConfig(user.role);
  const count = (ev: string) => events.filter((e) => e.event === ev).length;
  const distinctViewed = new Set(events.filter((e) => e.event === 'view' && e.resource_id).map((e) => e.resource_id)).size;
  const completed = progress.filter((p) => p.completed_at).length;
  const self = `/admin/activity/user/${user.id}`;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '14px' }}>
        <Link href={`/admin/activity?days=${days}`} style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>
          ← Activity
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 2px' }}>
            {personName(user)}
            <span style={{
              marginLeft: '10px', background: rc.bg, color: rc.fg, fontSize: '11.5px',
              fontWeight: 700, padding: '3px 10px', borderRadius: '999px', verticalAlign: 'middle',
            }}>
              {rc.label}
            </span>
          </h1>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {user.email}
            {user.organization ? ` · ${user.organization}` : ''}
            {user.state ? ` · ${user.state}` : ''}
            {' · Joined '}{fmtDate(user.created_at)}
          </div>
        </div>
        <a href={`/api/admin/activity/export?user=${user.id}&days=${days}`} style={BTN}>
          Download CSV
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: '16px 0' }}>
        <RangePills href={self} days={days} />
        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          Window applies to the activity log; course status and favorites are always current.
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Stat label="Resources viewed" value={distinctViewed} />
        <Stat label="Views" value={count('view')} />
        <Stat label="Shares" value={count('share')} />
        <Stat label="Downloads" value={count('download')} />
        <Stat label="Courses completed" value={completed} />
        <Stat label="Favorites" value={bookmarks.length} />
      </div>

      {/* Courses */}
      <SectionTitle>Courses</SectionTitle>
      {progress.length === 0 ? (
        <Empty>No courses started.</Empty>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Course</th>
                <th style={TH}>ID</th>
                <th style={TH}>Status</th>
                <th style={TH}>Started</th>
                <th style={TH}>Completed</th>
                <th style={{ ...TH, textAlign: 'right' }}>CE hours</th>
                <th style={TH}>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((p) => (
                <tr key={p.resource_id}>
                  <td style={TD}>
                    <Link href={`/admin/activity/resource/${p.resource_id}?days=${days}`} style={{ color: 'var(--fgi-blue)', fontWeight: 700, textDecoration: 'none' }}>
                      {p.title}
                    </Link>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.surface}</div>
                  </td>
                  <td style={{ ...TD, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{p.course_code ?? '—'}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{courseStatus(p)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(p.started_at)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(p.completed_at)}</td>
                  <td style={NUM}>{p.completed_at && p.ce_hours ? `${p.ce_hours}${p.is_naadac_ce ? ' NAADAC' : ''}` : '—'}</td>
                  <td style={TD}>{p.cert_earned ? (p.cert_code ? `Earned · ${p.cert_code}` : 'Earned') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Event log */}
      <SectionTitle
        aside={<span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{events.length} events · {RANGE_LABEL[days]}</span>}
      >
        Activity log
      </SectionTitle>
      {events.length === 0 ? (
        <Empty>No activity in this window.</Empty>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>When</th>
                <th style={TH}>Action</th>
                <th style={TH}>Resource</th>
                <th style={TH}>ID</th>
                <th style={TH}>Site</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDateTime(e.created_at)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap', fontWeight: 600 }}>{EVENT_LABEL[e.event] ?? e.event}</td>
                  <td style={TD}>
                    {e.resource_id && e.title ? (
                      <>
                        <Link href={`/admin/activity/resource/${e.resource_id}?days=${days}`} style={{ color: 'var(--fgi-blue)', textDecoration: 'none', fontWeight: 600 }}>
                          {e.title}
                        </Link>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{typeLabel(e.type)}</div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>(resource removed)</span>
                    )}
                  </td>
                  <td style={{ ...TD, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{e.course_code ?? '—'}</td>
                  <td style={TD}>{e.surface}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Favorites */}
      <SectionTitle>Favorites</SectionTitle>
      {bookmarks.length === 0 ? (
        <Empty>Nothing saved to Favorites.</Empty>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Resource</th>
                <th style={TH}>Type</th>
                <th style={TH}>Saved</th>
              </tr>
            </thead>
            <tbody>
              {bookmarks.map((b) => (
                <tr key={b.resource_id}>
                  <td style={TD}>
                    <Link href={`/admin/activity/resource/${b.resource_id}?days=${days}`} style={{ color: 'var(--fgi-blue)', textDecoration: 'none', fontWeight: 600 }}>
                      {b.title}
                    </Link>
                  </td>
                  <td style={TD}>{typeLabel(b.type)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
