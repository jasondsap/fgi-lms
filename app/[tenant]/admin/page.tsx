import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BTN, CARD, Empty, NUM, SectionTitle, Stat, TD, TH, fmtDate,
} from '@/components/admin/activity-ui';
import { roleConfig, SURFACE_OPTIONS } from '@/components/admin/roles';
import EvaluationsView from '@/components/portal-admin/EvaluationsView';
import FilterBar from '@/components/portal-admin/FilterBar';
import PrintButton from '@/components/portal-admin/PrintButton';
import SavedReports, { SaveBar } from '@/components/portal-admin/SavedReports';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { requireSignIn } from '@/lib/lockdown';
import {
  filterQuery, getPortalStats, hasFilters, listItemOptions, listPortalEvaluations,
  listPortalProgress, listPortalUsers, listZipOptions, parseFilters, roleLabels, statusLabel,
} from '@/lib/portal-admin';
import { listSavedReports } from '@/lib/portal-reports';
import { TENANT_SLUGS, getTenantConfig } from '@/lib/tenants';
import { getUserById } from '@/lib/users';
import { canAdminPortal, getViewer } from '@/lib/viewer';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/types';

export const metadata: Metadata = { title: 'Portal Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

const TABS = [
  { value: 'users', label: 'Users' },
  { value: 'progress', label: 'Progress' },
  { value: 'evaluations', label: 'Evaluations' },
  { value: 'saved', label: 'Saved reports' },
] as const;
type Tab = (typeof TABS)[number]['value'];

/** Rows rendered on the page; the exports carry everything. */
const PAGE_ROWS = 500;

const personName = (p: { given_name: string | null; family_name: string | null; email: string }) =>
  [p.given_name, p.family_name].filter(Boolean).join(' ') || p.email;
const typeLabel = (t: string | null) => (t ? RESOURCE_TYPE_LABELS[t as ResourceType] ?? t : '');
const dash = <span style={{ color: 'var(--text-muted)' }}>—</span>;

/**
 * Portal Admin (Jennifer, 9-19-26) — read-only reporting on ONE portal's
 * people, in that portal's chrome: everything registration captured, progress
 * through items, evaluation answers by item, the filter set from her doc, CSV / Excel / print exports.
 * Nothing on this page writes portal data — the only writes are the viewer's
 * own saved reports and their email schedules (phase 3). Portal Admins (users.role 'tenant_admin') see
 * only the portal they are bound to; FGI admins get a portal switcher.
 * Every query is scoped inside lib/portal-admin.ts by the route's slug, and
 * only after canAdminPortal() passes.
 */
export default async function PortalAdminPage({
  params, searchParams,
}: {
  params: { tenant: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) notFound();
  const base = `/${tenant.slug}/admin`;
  await requireSignIn(`/${tenant.slug}`, base);
  const viewer = await getViewer();
  if (!canAdminPortal(viewer, tenant.slug)) notFound();

  const tab: Tab = TABS.find((t) => t.value === searchParams.tab)?.value ?? 'users';
  const filters = parseFilters(searchParams);
  const accent = tenant.primary;

  const [stats, items, zips, users, progress, evaluations, saved] = await Promise.all([
    getPortalStats(tenant.slug),
    listItemOptions(tenant.slug),
    listZipOptions(tenant.slug),
    tab === 'users' ? listPortalUsers(tenant.slug, filters) : Promise.resolve([]),
    tab === 'progress' ? listPortalProgress(tenant.slug, filters) : Promise.resolve([]),
    tab === 'evaluations' ? listPortalEvaluations(tenant.slug, filters) : Promise.resolve([]),
    listSavedReports(tenant.slug, viewer.userId as string),
  ]);
  const note = typeof searchParams.note === 'string' ? searchParams.note.slice(0, 200) : '';

  const count = tab === 'users' ? users.length : tab === 'progress' ? progress.length : evaluations.length;
  const exportHref = (format: 'csv' | 'xlsx') =>
    `/api/portal-admin/export?${filterQuery(filters, { portal: tenant.slug, report: tab, format })}`;

  return (
    <>
      <div className="portal-admin-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: accent, margin: '0 0 4px' }}>
              Portal Admin
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, maxWidth: '70ch' }}>
              {tenant.name} — everyone registered on this portal and what they have accessed and completed.
              View and export only; nothing here can be changed. Activity is recorded for signed-in users
              from Aug 29, 2026; course progress updates each time a person opens the course.
            </p>
          </div>

          {/* FGI admins move between portals; a Portal Admin has exactly one. */}
          {viewer.role === 'admin' && (
            <div className="no-print" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Portal
              </span>
              {TENANT_SLUGS.map((slug) => {
                const t = getTenantConfig(slug)!;
                const active = slug === tenant.slug;
                return (
                  <Link
                    key={slug}
                    href={`/${slug}/admin?tab=${tab}`}
                    style={{
                      ...BTN, padding: '6px 14px', fontSize: '12.5px',
                      background: active ? accent : '#fff',
                      borderColor: active ? accent : 'var(--border-color)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {SURFACE_OPTIONS.find((o) => o.value === slug)?.label ?? t.name}
                  </Link>
                );
              })}
              <Link href="/admin" style={{ fontSize: '13px', color: accent, textDecoration: 'underline', marginLeft: '6px' }}>
                FGI Admin
              </Link>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '20px 0 22px' }}>
          <Stat label="Users" value={stats.users} />
          <Stat label="New · 30 days" value={stats.new_30} />
          <Stat label="Active · 30 days" value={stats.active_30} />
          <Stat label="In progress" value={stats.in_progress} />
          <Stat label="Completions" value={stats.completions} />
          <Stat label="Certificates" value={stats.certificates} />
          <Stat label="Evaluations" value={stats.evaluations} />
        </div>

        {/* Tabs keep the filters, so the same selection reads as people or as items. */}
        <div className="no-print" style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)', marginBottom: '14px' }}>
          {TABS.map((t) => {
            const active = t.value === tab;
            return (
              <Link
                key={t.value}
                href={t.value === 'saved' ? `${base}?tab=saved` : `${base}?${filterQuery(filters, { tab: t.value })}`}
                style={{
                  padding: '9px 18px', fontSize: '14.5px', fontWeight: 700, textDecoration: 'none',
                  color: active ? accent : 'var(--text-secondary)',
                  borderBottom: `3px solid ${active ? accent : 'transparent'}`, marginBottom: '-1px',
                }}
              >
                {t.label}{t.value === 'saved' && saved.length ? ` (${saved.length})` : ''}
              </Link>
            );
          })}
        </div>

        {tab === 'saved' ? (
          <>
            {note && (
              <div role="status" style={{
                fontSize: '13.5px', background: '#eef6ee', border: '1px solid #cfe6cf', color: '#1e5a2a',
                borderRadius: 'var(--radius-md)', padding: '9px 12px', marginBottom: '12px',
              }}>
                {note}
              </div>
            )}
            <SavedReports
              portal={tenant.slug} base={base} saved={saved} accent={accent}
              ownerEmail={(await getUserById(viewer.userId as string))?.email ?? 'your account email'}
            />
          </>
        ) : (
        <>
        <FilterBar
          action={base} tab={tab} filters={filters} items={items} zips={zips}
          accent={accent} portalName={tenant.name}
        />
        <SaveBar
          portal={tenant.slug} base={base} report={tab} query={filterQuery(filters)}
          saved={saved} accent={accent}
        />

        <SectionTitle
          aside={(
            <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a href={exportHref('csv')} style={{ ...BTN, borderColor: accent, color: accent }}>Export CSV</a>
              <a href={exportHref('xlsx')} style={{ ...BTN, borderColor: accent, color: accent }}>Export Excel</a>
              <PrintButton style={{ ...BTN, borderColor: accent, color: accent }} />
            </div>
          )}
        >
          {tab === 'users'
            ? `${count} user${count === 1 ? '' : 's'}`
            : tab === 'progress'
              ? `${count} item record${count === 1 ? '' : 's'}`
              : `${count} evaluation${count === 1 ? '' : 's'}`}
          {hasFilters(filters) ? ' matching the filters' : ''}
        </SectionTitle>

        {count === 0 ? (
          <Empty>
            {hasFilters(filters) ? 'Nothing matches these filters.'
              : tab === 'evaluations' ? 'No one on this portal has submitted an evaluation yet.'
              : 'No one has registered on this portal yet.'}
          </Empty>
        ) : tab === 'evaluations' ? (
          <EvaluationsView rows={evaluations} base={base} accent={accent} pageRows={PAGE_ROWS} />
        ) : tab === 'users' ? (
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Person</th>
                  <th style={TH}>Organization</th>
                  <th style={TH}>County · Zip</th>
                  <th style={TH}>I am a…</th>
                  <th style={TH}>Created</th>
                  <th style={TH}>Last accessed</th>
                  <th style={{ ...TH, textAlign: 'right' }}>In progress</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, PAGE_ROWS).map((u) => (
                  <tr key={u.id}>
                    <td style={TD}>
                      <Link href={`${base}/user/${u.id}`} style={{ color: accent, fontWeight: 700, textDecoration: 'none' }}>
                        {personName(u)}
                      </Link>
                      {/* Staff and admins whose home portal is this one are in the roster too — say so. */}
                      {u.role !== 'learner' && (
                        <span style={{
                          marginLeft: '8px', background: roleConfig(u.role).bg, color: roleConfig(u.role).fg,
                          fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', verticalAlign: 'middle',
                        }}>
                          {roleConfig(u.role).label}
                        </span>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{u.email}</div>
                    </td>
                    <td style={TD}>{u.organization || dash}</td>
                    <td style={TD}>{[u.county, u.zip].filter(Boolean).join(' · ') || dash}</td>
                    <td style={{ ...TD, fontSize: '12.5px', maxWidth: '240px' }}>{roleLabels(u.roles, u.role_other) || dash}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(u.last_active)}</td>
                    <td style={NUM}>{u.in_progress}</td>
                    <td style={NUM}>{u.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ ...CARD, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Person</th>
                  <th style={TH}>Item</th>
                  <th style={TH}>ID</th>
                  <th style={TH}>Status</th>
                  <th style={TH}>First accessed</th>
                  <th style={TH}>Last accessed</th>
                  <th style={TH}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {progress.slice(0, PAGE_ROWS).map((r) => (
                  <tr key={`${r.user_id}:${r.resource_id}`}>
                    <td style={TD}>
                      <Link href={`${base}/user/${r.user_id}`} style={{ color: accent, fontWeight: 700, textDecoration: 'none' }}>
                        {personName(r)}
                      </Link>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.organization || r.email}</div>
                    </td>
                    <td style={TD}>
                      {r.title ?? '(item removed)'}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {typeLabel(r.type)}{r.on_portal ? '' : ' · Fletcher Group Library'}
                      </div>
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{r.course_code ?? '—'}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}><StatusPill row={r} /></td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(r.first_at)}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(r.last_at)}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(r.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {count > PAGE_ROWS && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '10px' }}>
            Showing the first {PAGE_ROWS} of {count}. Narrow the filters, or export for the full list.
          </p>
        )}
        </>
        )}
      </div>
      <div className="no-print"><TenantShellFooter tenant={tenant} /></div>
    </>
  );
}

function StatusPill({ row }: { row: Parameters<typeof statusLabel>[0] }) {
  const done = Boolean(row.completed_at);
  const tone = done
    ? { bg: '#e6f4ea', fg: '#1e6b34' }
    : row.is_course ? { bg: '#fdf3dd', fg: '#8a6410' } : { bg: '#eef1f3', fg: '#5f6e7c' };
  return (
    <span style={{
      background: tone.bg, color: tone.fg, fontSize: '11.5px', fontWeight: 700,
      padding: '3px 10px', borderRadius: '999px',
    }}>
      {statusLabel(row)}
    </span>
  );
}
