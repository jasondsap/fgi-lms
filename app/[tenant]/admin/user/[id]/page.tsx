import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BTN, CARD, Empty, NUM, SectionTitle, Stat, TD, TH, fmtDate, fmtDateTime,
} from '@/components/admin/activity-ui';
import EvaluationsView from '@/components/portal-admin/EvaluationsView';
import PrintButton from '@/components/portal-admin/PrintButton';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { requireSignIn } from '@/lib/lockdown';
import {
  EMPTY_FILTERS, getPortalUser, getPortalUserProgress, listPortalEvaluations, roleLabels, statusLabel,
} from '@/lib/portal-admin';
import { getTenantConfig } from '@/lib/tenants';
import { canAdminPortal, getViewer } from '@/lib/viewer';
import { RESOURCE_TYPE_LABELS, US_STATES, type ResourceType } from '@/types';

export const metadata: Metadata = { title: 'Portal Admin — User', robots: { index: false } };
export const dynamic = 'force-dynamic';

const typeLabel = (t: string | null) => (t ? RESOURCE_TYPE_LABELS[t as ResourceType] ?? t : '');

/**
 * One portal user (9-19-26): everything registration captured plus every item
 * they have touched. getPortalUser() only resolves ids that belong to THIS
 * portal, so a Portal Admin pasting another surface's user id gets a 404.
 */
export default async function PortalAdminUserPage({ params }: { params: { tenant: string; id: string } }) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) notFound();
  const base = `/${tenant.slug}/admin`;
  await requireSignIn(`/${tenant.slug}`, `${base}/user/${params.id}`);
  const viewer = await getViewer();
  if (!canAdminPortal(viewer, tenant.slug)) notFound();

  const user = await getPortalUser(tenant.slug, params.id);
  if (!user) notFound();
  const [items, evaluations] = await Promise.all([
    getPortalUserProgress(tenant.slug, user.id),
    listPortalEvaluations(tenant.slug, EMPTY_FILTERS, 500, user.id),
  ]);

  const accent = tenant.primary;
  const name = [user.given_name, user.family_name].filter(Boolean).join(' ') || user.email;
  const state = US_STATES.find((s) => s.code === user.state)?.name ?? user.state;
  const ceHours = items.reduce((t, r) => t + (r.completed_at && r.ce_hours ? r.ce_hours : 0), 0);
  const exportHref = (format: 'csv' | 'xlsx', report: 'progress' | 'evaluations' = 'progress') =>
    `/api/portal-admin/export?${new URLSearchParams({
      portal: tenant.slug, report, format, user: user.id,
    }).toString()}`;

  const facts: Array<[string, React.ReactNode]> = [
    ['Email', user.email],
    ['Organization', user.organization],
    ['State', state],
    ['County', user.county],
    ['Zip', user.zip],
    ['I am a…', roleLabels(user.roles, user.role_other)],
    ['Account created', fmtDateTime(user.created_at)],
    ['Registration completed', fmtDateTime(user.registration_completed_at)],
    ['Last sign-in', user.last_login_at ? fmtDateTime(user.last_login_at) : 'None since tracking began (Sep 19, 2026)'],
    ['Last accessed', fmtDateTime(user.last_active)],
  ];

  return (
    <>
      <div className="portal-admin-page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <div className="no-print" style={{ marginBottom: '14px' }}>
          <Link href={base} style={{ fontSize: '13.5px', color: accent, textDecoration: 'underline' }}>
            ← Portal Admin
          </Link>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: accent, margin: '0 0 16px' }}>{name}</h1>

        <div style={{ ...CARD, padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px 24px' }}>
          {facts.map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                {label}
              </div>
              <div style={{ fontSize: '14px', marginTop: '2px', wordBreak: 'break-word' }}>
                {value || <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '16px 0 0' }}>
          <Stat label="Items accessed" value={user.items} />
          <Stat label="In progress" value={user.in_progress} />
          <Stat label="Completed" value={user.completed} />
          <Stat label="CE hours" value={ceHours} />
          <Stat label="Evaluations" value={evaluations.length} />
        </div>

        <SectionTitle
          aside={items.length > 0 ? (
            <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a href={exportHref('csv')} style={{ ...BTN, borderColor: accent, color: accent }}>Export CSV</a>
              <a href={exportHref('xlsx')} style={{ ...BTN, borderColor: accent, color: accent }}>Export Excel</a>
              <PrintButton style={{ ...BTN, borderColor: accent, color: accent }} />
            </div>
          ) : undefined}
        >
          Progress through items
        </SectionTitle>
        {items.length === 0 ? (
          <Empty>No activity recorded for this person yet.</Empty>
        ) : (
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Item</th>
                  <th style={TH}>ID</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>First accessed</th>
                  <th style={TH}>Last accessed</th>
                  <th style={TH}>Completed</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Views</th>
                  <th style={TH}>Quiz</th>
                  <th style={TH}>Evaluation</th>
                  <th style={TH}>Certificate</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.resource_id}>
                    <td style={TD}>
                      {r.title ?? '(item removed)'}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {typeLabel(r.type)}{r.on_portal ? '' : ' · Fletcher Group Library'}
                      </div>
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{r.course_code ?? '—'}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      {statusLabel(r)}
                      {r.is_course && !r.completed_at && r.tracked_total ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {r.tracked_done} of {r.tracked_total} items
                        </div>
                      ) : null}
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(r.first_at)}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(r.last_at)}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(r.completed_at)}</td>
                    <td style={NUM}>{r.views}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      {r.quiz_passed === null ? '—' : r.quiz_passed ? 'Passed' : 'Not passed'}
                      {r.quiz_best !== null && r.quiz_max ? ` (${Math.round(r.quiz_best)}/${Math.round(r.quiz_max)})` : ''}
                    </td>
                    <td style={TD}>{r.is_course ? (r.eval_submitted ? 'Submitted' : 'Not yet') : '—'}</td>
                    <td style={TD}>{r.is_course ? (r.cert_earned ? 'Earned' : 'Not yet') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {evaluations.length > 0 && (
          <>
            <SectionTitle
              aside={(
                <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={exportHref('csv', 'evaluations')} style={{ ...BTN, borderColor: accent, color: accent }}>Export CSV</a>
                  <a href={exportHref('xlsx', 'evaluations')} style={{ ...BTN, borderColor: accent, color: accent }}>Export Excel</a>
                </div>
              )}
            >
              Evaluations submitted
            </SectionTitle>
            <EvaluationsView rows={evaluations} base={base} accent={accent} showPerson={false} />
          </>
        )}
      </div>
      <div className="no-print"><TenantShellFooter tenant={tenant} /></div>
    </>
  );
}
