import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authEnabled, getSession } from '@/auth';
import { moodleEnabled } from '@/lib/moodle';
import {
  getBookmarks,
  getRecentlyViewed,
  getUserProgress,
  getViewedSlugs,
  summarizeCe,
  type CourseProgressRow,
} from '@/lib/progress';
import type { Surface } from '@/lib/surface';
import { getTenantConfig } from '@/lib/tenants';
import { getUserById, getUserRoles } from '@/lib/users';
import { RESOURCE_TYPE_LABELS, USER_ROLE_LABELS, US_STATES, type ResourceType } from '@/types';
import ProfileEditor from './ProfileEditor';
import { refreshProgressAction } from './account-actions';

/**
 * My Learning — the signed-in learner's page (8-29-26, docs/CLAUDE.md §6cm).
 * Shared by the FGI site and the tenant portals; all links go through the
 * surface so a Colorado learner never lands in FGI chrome. Data comes from
 * the Neon mirror (lib/progress.ts) — no Moodle call on the page itself, so
 * it renders instantly; "Refresh progress" re-pulls from Moodle on demand.
 */

/** Tenants whose required-video collections roll up into a program card. */
const PROGRAM_TENANTS = ['colorado', 'scarr'];

export default async function AccountView({ surface }: { surface: Surface }) {
  if (!authEnabled) redirect(surface.basePath || '/');
  const session = await getSession();
  if (!session?.user?.id) redirect(surface.basePath || '/');

  const userId = session.user.id;
  const [user, roles, progress, bookmarks, recent, viewed] = await Promise.all([
    getUserById(userId),
    getUserRoles(userId),
    getUserProgress(userId),
    getBookmarks(userId),
    getRecentlyViewed(userId),
    getViewedSlugs(userId, programSlugs()),
  ]);
  if (!user) redirect(surface.basePath || '/');

  const accent = surface.primary;
  const accountPath = `${surface.basePath}/account`;
  const name = [user.given_name, user.family_name].filter(Boolean).join(' ') || user.email;
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const stateName = US_STATES.find((s) => s.code === user.state)?.name ?? user.state;

  const inProgress = progress.filter((r) => !r.completed_at);
  const completed = progress.filter((r) => r.completed_at);
  const ce = summarizeCe(progress);
  const certs = completed.filter((r) => r.cert_earned);
  const evalsOwed = completed.filter((r) => r.eval_cmid && !r.eval_submitted);
  const lastSynced = progress.reduce<string | null>(
    (acc, r) => (!acc || r.synced_at > acc ? r.synced_at : acc), null,
  );

  return (
    <div style={{ background: 'var(--body-bg)', minHeight: '60vh' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '2rem 1.5rem 3.5rem' }}>

        {/* ---------------------------------------------------------------- */}
        {/* Profile                                                           */}
        {/* ---------------------------------------------------------------- */}
        <section style={CARD}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div aria-hidden="true" style={{
              width: '64px', height: '64px', borderRadius: '50%', background: accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 700, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 2px', color: 'var(--text-primary)' }}>
                {name}
              </h1>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {user.email}
                {user.organization && <> · {user.organization}</>}
                {(user.county || stateName) && (
                  <> · {[user.county, stateName].filter(Boolean).join(', ')}</>
                )}
              </div>
              {roles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {roles.map((r) => (
                    <span key={r} style={CHIP(accent)}>
                      {r === 'other' && user.role_other ? user.role_other : USER_ROLE_LABELS[r]}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: '10px' }}>
                Member since {fmtDate(user.created_at)}
                {user.registered_surface && user.registered_surface !== 'fgi' && (
                  <> · via {getTenantConfig(user.registered_surface)?.name ?? user.registered_surface}</>
                )}
              </div>
              <ProfileEditor
                accent={accent}
                initial={{
                  name,
                  organization: user.organization ?? '',
                  state: user.state ?? '',
                  zip: user.zip ?? '',
                  county: user.county ?? '',
                  roles,
                  roleOther: user.role_other ?? '',
                }}
              />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Stats                                                             */}
        {/* ---------------------------------------------------------------- */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px', margin: '16px 0',
        }}>
          <Stat label="Courses completed" value={completed.length} accent={accent} />
          <Stat label="In progress" value={inProgress.length} accent={accent} />
          <Stat label="CE hours earned" value={fmtHours(ce.total)} accent={accent} />
          <Stat label="Certificates" value={certs.length} accent={accent} />
        </div>

        {progress.length === 0 && (
          <section style={{ ...CARD, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <h2 style={{ ...H2, marginBottom: '6px' }}>You haven&rsquo;t started a course yet</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              Courses you open will appear here with your progress, scores, CE hours and certificates.
            </p>
            <Link href={surface.libraryHref} style={BUTTON(accent)}>Browse the library</Link>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Continue learning                                                 */}
        {/* ---------------------------------------------------------------- */}
        {inProgress.length > 0 && (
          <section style={CARD}>
            <h2 style={H2}>Continue learning</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {inProgress.map((r) => (
                <article key={r.resource_id} style={TILE}>
                  <div style={TYPE_LABEL}>{typeLabel(r.type)}{r.ce_hours ? ` · ${fmtHours(r.ce_hours)} CE` : ''}</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px', lineHeight: 1.3 }}>
                    <Link href={courseHref(r)} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{r.title}</Link>
                  </h3>
                  <ProgressBar pct={r.pct} accent={accent} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 10px' }}>
                    <span>{r.pct}% · {r.tracked_done} of {r.tracked_total} items</span>
                    {r.last_activity_at && <span>Last activity {fmtDate(r.last_activity_at)}</span>}
                  </div>
                  {r.next_module_name && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Next: <strong style={{ color: 'var(--text-primary)' }}>{r.next_module_name}</strong>
                    </div>
                  )}
                  <Link href={courseHref(r, r.next_cmid)} style={BUTTON(accent)}>
                    {r.pct > 0 ? 'Resume' : 'Start'}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Programs (tenant required-video series)                           */}
        {/* ---------------------------------------------------------------- */}
        <Programs progress={progress} viewed={viewed} surface={surface} />

        {/* ---------------------------------------------------------------- */}
        {/* Completed                                                         */}
        {/* ---------------------------------------------------------------- */}
        {completed.length > 0 && (
          <section style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={H2}>Completed</h2>
              <a href="/api/account/transcript" style={{ fontSize: '13px', fontWeight: 700, color: accent }}>
                Download CE transcript (CSV)
              </a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={TABLE}>
                <thead>
                  <tr>
                    <th style={TH}>Course</th>
                    <th style={TH}>Completed</th>
                    <th style={TH}>CE hours</th>
                    <th style={TH}>Quiz</th>
                    <th style={TH}>Evaluation</th>
                    <th style={TH}>Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map((r) => (
                    <tr key={r.resource_id}>
                      <td style={TD}>
                        <Link href={courseHref(r)} style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>{r.title}</Link>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {typeLabel(r.type)}{r.course_code ? ` · ${r.course_code}` : ''}
                        </div>
                      </td>
                      <td style={TD}>{fmtDate(r.completed_at!)}</td>
                      <td style={TD}>{r.ce_hours ? `${fmtHours(r.ce_hours)}${r.is_naadac_ce ? ' NAADAC' : ''}` : '—'}</td>
                      <td style={TD}>{quizCell(r)}</td>
                      <td style={TD}>
                        {!r.eval_cmid ? '—' : r.eval_submitted ? 'Submitted' : (
                          <Link href={courseHref(r, r.eval_cmid)} style={{ color: accent, fontWeight: 700 }}>Share feedback</Link>
                        )}
                      </td>
                      <td style={TD}>
                        {!r.cert_cmid ? '—' : r.cert_earned ? (
                          <Link href={courseHref(r, r.cert_cmid)} style={{ color: accent, fontWeight: 700 }}>View certificate</Link>
                        ) : 'Locked'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* CE summary                                                        */}
        {/* ---------------------------------------------------------------- */}
        {ce.years.length > 0 && (
          <section style={CARD}>
            <h2 style={H2}>NAADAC continuing education</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              Hours are recorded at the time you complete each course. NAADAC renews on a two-year cycle,
              so totals are shown by year.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {ce.years.map((y) => (
                <div key={y.year} style={{ ...TILE, minWidth: '160px' }}>
                  <div style={TYPE_LABEL}>{y.year}</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: accent }}>{fmtHours(y.hours)}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {y.courses} course{y.courses === 1 ? '' : 's'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Evaluations owed                                                  */}
        {/* ---------------------------------------------------------------- */}
        {evalsOwed.length > 0 && (
          <section style={{ ...CARD, borderLeft: '4px solid var(--fgi-amber)' }}>
            <h2 style={H2}>Share your feedback</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
              You finished these courses but haven&rsquo;t completed the short Learning Center evaluation yet.
            </p>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '14px', lineHeight: 1.8 }}>
              {evalsOwed.map((r) => (
                <li key={r.resource_id}>
                  <Link href={courseHref(r, r.eval_cmid)} style={{ color: accent, fontWeight: 600 }}>{r.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Saved + recently viewed                                           */}
        {/* ---------------------------------------------------------------- */}
        {(bookmarks.length > 0 || recent.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {bookmarks.length > 0 && (
              <section style={{ ...CARD, margin: 0 }}>
                <h2 style={H2}>Saved resources</h2>
                <ResourceList
                  items={bookmarks.map((b) => ({ key: b.resource_id, slug: b.slug, title: b.title, type: b.type, when: b.created_at }))}
                  basePath={surface.basePath}
                  whenLabel="Saved"
                />
              </section>
            )}
            {recent.length > 0 && (
              <section style={{ ...CARD, margin: 0 }}>
                <h2 style={H2}>Recently viewed</h2>
                <ResourceList
                  items={recent.map((b) => ({ key: b.resource_id, slug: b.slug, title: b.title, type: b.type, when: b.last_seen }))}
                  basePath={surface.basePath}
                  whenLabel="Viewed"
                />
              </section>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Sync footer                                                       */}
        {/* ---------------------------------------------------------------- */}
        {progress.length > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap',
            gap: '10px', marginTop: '18px', fontSize: '13px', color: 'var(--text-muted)',
          }}>
            <span>
              Progress updates each time you open a course.
              {lastSynced && <> Last updated {fmtDateTime(lastSynced)}.</>}
            </span>
            {moodleEnabled && user.moodle_user_id && (
              /* Bound arg, not a closure — see account-actions.ts. */
              <form action={refreshProgressAction.bind(null, accountPath)}>
                <button type="submit" style={{ ...BUTTON(accent), background: 'transparent', color: accent, border: `1.5px solid ${accent}` }}>
                  Refresh progress
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Programs — tenant "Required Videos" series roll-up
// ---------------------------------------------------------------------------

/** Every slug in every tenant's Required Videos series (for the viewed lookup). */
function programSlugs(): string[] {
  return PROGRAM_TENANTS.flatMap(
    (slug) => getTenantConfig(slug)?.v3?.collections?.['required-videos']?.slugs ?? [],
  );
}

function Programs({ progress, viewed, surface }: {
  progress: CourseProgressRow[];
  viewed: Set<string>;
  surface: Surface;
}) {
  const bySlug = new Map(progress.map((r) => [r.slug, r]));
  const cards = PROGRAM_TENANTS.flatMap((slug) => {
    const tenant = getTenantConfig(slug);
    // Collections and the pre-cert button live on the v3 (8-19-26) chrome config.
    const collection = tenant?.v3?.collections?.['required-videos'];
    if (!tenant || !collection) return [];
    // The series are Vimeo video resources, not courses — "done" = opened.
    const done = collection.slugs.filter((s: string) => viewed.has(s)).length;
    // The button links to the resource landing page (8-30); take the slug
    // off the last path segment so either /course/ or /resource/ works.
    const preSlug = tenant.v3?.certButtons?.pre?.href?.split('/').pop();
    const pre = preSlug ? bySlug.get(preSlug) : undefined;
    // Show the card on that tenant's own portal, or anywhere once the learner
    // has touched the program.
    if (surface.key !== slug && done === 0 && !pre) return [];
    return [{ tenant, collection, done, pre }];
  });
  if (cards.length === 0) return null;

  const accent = surface.primary;
  return (
    <section style={CARD}>
      <h2 style={H2}>Certification programs</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
        {cards.map(({ tenant, collection, done, pre }) => (
          <article key={tenant.slug} style={TILE}>
            <div style={TYPE_LABEL}>{tenant.name}</div>
            {pre && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                  <Link href={courseHref(pre, pre.completed_at ? undefined : pre.next_cmid)} style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>
                    {pre.title}
                  </Link>
                  <span style={{ color: 'var(--text-secondary)' }}>{pre.pct}%</span>
                </div>
                <ProgressBar pct={pre.pct} accent={accent} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600 }}>{collection.label}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{done} of {collection.slugs.length} viewed</span>
            </div>
            <ProgressBar pct={Math.round((done / collection.slugs.length) * 100)} accent={accent} />
            <div style={{ marginTop: '12px' }}>
              <Link href={`/${tenant.slug}/library?collection=required-videos`} style={{ fontSize: '13px', fontWeight: 700, color: accent }}>
                View the series
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Stat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div style={{ ...CARD, margin: 0, padding: '16px 20px' }}>
      <div style={{ fontSize: '30px', fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function ProgressBar({ pct, accent }: { pct: number; accent: string }) {
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      style={{ height: '8px', background: '#e3e8ec', borderRadius: '999px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: accent, borderRadius: '999px' }} />
    </div>
  );
}

function ResourceList({ items, basePath, whenLabel }: {
  items: Array<{ key: string; slug: string; title: string; type: string; when: string }>;
  basePath: string;
  whenLabel: string;
}) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((it) => (
        <li key={it.key} style={{ padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
          <Link href={`${basePath}/resource/${it.slug}`} style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none', fontSize: '15px' }}>
            {it.title}
          </Link>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {typeLabel(it.type)} · {whenLabel} {fmtDate(it.when)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function quizCell(r: CourseProgressRow) {
  if (!r.quiz_cmid) return '—';
  const pct = r.quiz_best !== null && r.quiz_max ? `${Math.round((r.quiz_best / r.quiz_max) * 100)}%` : null;
  const result = r.quiz_passed === null ? '' : r.quiz_passed ? 'Pass' : 'Not yet passed';
  if (!pct && !result) return 'Taken';
  return [pct, result].filter(Boolean).join(' · ');
}

/** Course links go to the surface the learner opened the course from. */
function courseHref(r: CourseProgressRow, cmid?: number | null): string {
  const base = r.surface === 'fgi' ? '' : `/${r.surface}`;
  return `${base}/course/${r.slug}${cmid ? `?cm=${cmid}` : ''}`;
}

function typeLabel(type: string): string {
  return RESOURCE_TYPE_LABELS[type as ResourceType] ?? type;
}

function fmtHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(1).replace(/\.0$/, '');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Styles (design tokens from globals.css)
// ---------------------------------------------------------------------------

const CARD = {
  background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)',
  padding: '22px 24px', marginBottom: '16px',
} as const;

const TILE = {
  background: 'var(--fgi-card-face)', border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)', padding: '16px 18px',
} as const;

const H2 = {
  fontSize: '19px', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)',
} as const;

const TYPE_LABEL = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--text-muted)', marginBottom: '6px',
} as const;

const TABLE = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' } as const;
const TH = {
  textAlign: 'left', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
  color: 'var(--text-muted)', padding: '8px 10px', borderBottom: '2px solid var(--border-color)',
} as const;
const TD = { padding: '10px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'top' } as const;

const BUTTON = (accent: string) => ({
  display: 'inline-block', background: accent, color: '#ffffff', fontSize: '13px', fontWeight: 700,
  fontFamily: 'inherit', borderRadius: '999px', padding: '8px 18px', textDecoration: 'none',
  border: 'none', cursor: 'pointer',
}) as const;

const CHIP = (accent: string) => ({
  fontSize: '12px', fontWeight: 600, color: accent, background: 'var(--fgi-blue-light)',
  borderRadius: '999px', padding: '3px 10px',
}) as const;
