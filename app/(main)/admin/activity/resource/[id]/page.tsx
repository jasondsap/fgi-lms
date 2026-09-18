import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BTN, CARD, Empty, NUM, RangePills, SectionTitle, Stat, TD, TH, fmtDate,
} from '@/components/admin/activity-ui';
import { getResourceUsers, parseRange, personName, RANGE_LABEL } from '@/lib/admin-activity';
import { sql } from '@/lib/db';
import { getViewer } from '@/lib/viewer';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

export const metadata: Metadata = { title: 'Resource activity — FGI Learning Resource Center' };
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Who touched one resource (Jennifer, 9-17-26): every signed-in person with
 * a view, share, or download in the window, plus course status for courses.
 * Deliberately reads only id/title/type/code — never s3_key.
 */
export default async function AdminResourceActivityPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { days?: string } }) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') notFound();
  if (!UUID.test(params.id)) notFound();

  const days = parseRange(searchParams.days);
  const [resource] = await sql`
    SELECT id, slug, title, type, course_code, published FROM resources WHERE id = ${params.id}
  `;
  if (!resource) notFound();

  const people = await getResourceUsers(resource.id as string, days);
  const sum = (k: 'views' | 'shares' | 'downloads') => people.reduce((t, p) => t + p[k], 0);
  const completions = people.filter((p) => p.completed_at).length;
  const isCourse = resource.type === 'course' || resource.type === 'naadac_ce';
  const self = `/admin/activity/resource/${resource.id}`;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={{ marginBottom: '14px' }}>
        <Link href={`/admin/activity?days=${days}`} style={{ fontSize: '13.5px', color: 'var(--fgi-blue)', textDecoration: 'underline' }}>
          ← Activity
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--fgi-navy)', margin: '0 0 2px', lineHeight: 1.2 }}>
            {resource.title as string}
          </h1>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {RESOURCE_TYPE_LABELS[resource.type as ResourceType] ?? (resource.type as string)}
            {resource.course_code ? ` · ID: ${resource.course_code}` : ''}
            {!resource.published ? ' · Unpublished' : ''}
            {' · '}
            <Link href={`/resource/${resource.slug}`} style={{ color: 'var(--fgi-blue)' }}>View page</Link>
          </div>
        </div>
        <a href={`/api/admin/activity/export?resource=${resource.id}&days=${days}`} style={BTN}>
          Download CSV
        </a>
      </div>

      <div style={{ margin: '16px 0' }}>
        <RangePills href={self} days={days} />
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Stat label="People" value={people.length} />
        <Stat label="Views" value={sum('views')} />
        <Stat label="Shares" value={sum('shares')} />
        <Stat label="Downloads" value={sum('downloads')} />
        {isCourse && <Stat label="Completed" value={completions} />}
      </div>

      <SectionTitle
        aside={<span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{RANGE_LABEL[days]}</span>}
      >
        Who accessed it
      </SectionTitle>
      {people.length === 0 ? (
        <Empty>No signed-in activity on this resource in the window.</Empty>
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
                <th style={TH}>First</th>
                <th style={TH}>Last</th>
                {isCourse && <th style={TH}>Course</th>}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.user_id}>
                  <td style={TD}>
                    <Link href={`/admin/activity/user/${p.user_id}?days=${days}`} style={{ color: 'var(--fgi-blue)', fontWeight: 700, textDecoration: 'none' }}>
                      {personName(p)}
                    </Link>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{p.email}</div>
                  </td>
                  <td style={TD}>{p.organization || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={NUM}>{p.views}</td>
                  <td style={NUM}>{p.shares}</td>
                  <td style={NUM}>{p.downloads}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(p.first_seen ?? p.started_at)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(p.last_seen ?? p.completed_at ?? p.started_at)}</td>
                  {isCourse && (
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      {p.completed_at
                        ? `Completed ${fmtDate(p.completed_at)}`
                        : p.started_at
                          ? (p.pct && p.pct > 0 ? `In progress · ${Math.round(p.pct)}%` : 'Started')
                          : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
