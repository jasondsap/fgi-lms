import Link from 'next/link';
import { authEnabled, getSession, signIn } from '@/auth';
import PresenterCard from '@/components/resource/PresenterCard';
import ShellRail, { RAIL_BUTTON, RAIL_LABEL } from '@/components/resource/ShellRail';
import { getRelatedResources } from '@/lib/resources';
import type { Surface } from '@/lib/surface';
import { ceLabel } from '@/lib/ce';
import { RESOURCE_TYPE_LABELS, type Resource } from '@/types';

/** The webinar drawing from the 8-11-26 illustration set, as on the cards. */
const WEBINAR_ILLUSTRATION = '/images/category-cards/webinar.webp';

/**
 * A date column comes back as either a Date or a 'YYYY-MM-DD' string depending
 * on the driver path. Formatting it through `new Date()` would shift it a day
 * in any timezone west of UTC, so the parts are read off the string directly.
 */
function formatEventDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const iso = (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const PANEL = {
  background: 'var(--body-bg)', borderRadius: 'var(--radius-lg)',
  padding: '1.5rem 1.75rem',
};

const PANEL_TITLE = {
  fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px',
};

const PANEL_TEXT = {
  fontSize: '17px', lineHeight: 1.5, color: 'var(--text-primary)',
};

/**
 * Webinar detail page — Jennifer's 8-11-26 webinar shell.
 *
 * The shell is a *launcher*, not a player: the recording lives in a Moodle
 * course (video page + knowledge check + evaluation), which is what earns the
 * CE credit and the certificate, so "Start Webinar" opens the course player
 * rather than embedding Vimeo here (Jason, 8-12).
 *
 * Three of the twelve webinars have a Moodle course today; the other nine are
 * queued behind their question banks. Until one is built its page keeps the
 * inline player it has always had, so no webinar is left with a button that
 * goes nowhere — each swaps over on its own as its course lands.
 */
export default async function WebinarDetail(
  { resource, surface }: { resource: Resource; surface: Surface },
) {
  const presenters = resource.presenters ?? [];
  const materials  = resource.materials ?? [];
  const eventDate  = formatEventDate(resource.event_date ?? resource.published_at);
  const related    = await getRelatedResources(resource, surface.key, 3);

  const inMoodle = Boolean(resource.has_moodle_course);
  // Moodle needs a real user to enrol and to record completion, so the course
  // player is sign-in only — same gate the courses use.
  const gated = inMoodle && authEnabled && !(await getSession());

  const skillGroups: string[] = resource.naadac_skill_groups ?? [];
  const credits = resource.ceu_credits ? Number(resource.ceu_credits) : null;

  const facts = [
    resource.duration_minutes ? `⏱ Approx. ${resource.duration_minutes} min.` : '',
    eventDate ? `Presented ${eventDate}` : '',
  ].filter(Boolean);

  return (
    <div style={{ background: '#ffffff', minHeight: '60vh' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem 2rem 3rem' }}>

        {/* Breadcrumb — not in the mockup, but the only way back into a
            tenant's own portal from here. */}
        <nav style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          <Link href={surface.basePath || '/'} style={{ color: surface.primary }}>Home</Link>
          {' / '}
          <Link href={surface.libraryHref} style={{ color: surface.primary }}>Library</Link>
          {' / '}
          <span>{resource.title}</span>
        </nav>

        {/* ── Title and illustration ── */}
        <div className="pdf-shell-grid">
          <div>
            <h1 style={{
              fontSize: '45px', lineHeight: 1.1, fontWeight: 700,
              fontStretch: '75%', color: 'var(--text-primary)',
            }}>
              {resource.title}
            </h1>

            <div style={{ fontSize: '17px', color: 'var(--text-secondary)', marginTop: '10px' }}>
              {resource.course_code
                ? `ID: ${resource.course_code}`
                : RESOURCE_TYPE_LABELS.webinar}
              {eventDate && <span style={{ color: 'var(--text-muted)' }}> · {eventDate}</span>}
            </div>

          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WEBINAR_ILLUSTRATION}
            alt=""
            style={{ width: '454px', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
          />
        </div>

        {/* ── Presenters, CE panels, and the action rail ── */}
        <div className="pdf-shell-grid pdf-shell-grid--body" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {resource.description && (
              <div>
                <div style={{ ...PANEL_TITLE }}>Description</div>
                <p style={{ ...PANEL_TEXT, maxWidth: '62ch' }}>{resource.description}</p>
              </div>
            )}

            {/* Until this webinar has a Moodle course, the recording still
                plays here — see the component note. */}
            {!inMoodle && resource.vimeo_id && (
              <div style={{
                position: 'relative', paddingTop: '56.25%',
                borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#111',
              }}>
                <iframe
                  src={`https://player.vimeo.com/video/${resource.vimeo_id}?badge=0&autopause=0`}
                  frameBorder="0" allow="autoplay; fullscreen; picture-in-picture"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  title={resource.title}
                />
              </div>
            )}

            {presenters.map((p) => (
              <PresenterCard key={p.id} presenter={p} accent={surface.primary} />
            ))}

            {/* Certificate panel. The mockup also promises an emailed
                certificate and a download link; neither exists yet
                (docs/CLAUDE.md §6ab — customcert isn't installed and the
                per-brand template decision is open), so that paragraph is held
                back rather than shipped as a promise we can't keep. */}
            {inMoodle && (
              <div style={PANEL}>
                <div style={PANEL_TITLE}>Certificate of Completion Details</div>
                <p style={PANEL_TEXT}>
                  To earn a Certificate of Completion, all required activities need to be
                  completed successfully, including any knowledge checks and evaluations.
                </p>
              </div>
            )}

            {resource.is_naadac_ce && (
              <div style={PANEL}>
                <div style={PANEL_TITLE}>NAADAC CE Details</div>
                <p style={PANEL_TEXT}>
                  This course has been approved by Fletcher Group, Inc., as a NAADAC Approved
                  Education Provider, for <strong>{ceLabel(credits)}</strong>. NAADAC Provider
                  {' '}#242360, Fletcher Group, Inc., is responsible for all aspects of their
                  programming.
                </p>
                {/* Per-webinar wording Jennifer owes us; the line stays off
                    until naadac_skill_groups is populated. */}
                {skillGroups.length > 0 && (
                  <p style={{ ...PANEL_TEXT, marginTop: '1rem' }}>
                    This course aligns with NAADAC Skill Group(s):<br />
                    {skillGroups.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          <ShellRail
            slug={resource.slug}
            surface={surface}
            facts={facts}
            presenters={presenters}
            related={related}
            /* Transcripts and slide decks belong in the Moodle course now
               (Jason, 8-12). They stay listed here only while this webinar has
               no course to hold them, so nothing goes missing mid-migration. */
            extras={
              !inMoodle && materials.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={RAIL_LABEL}>Also included</div>
                  {materials.map((m) => (
                    <a
                      key={m.id} href={m.download_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '17px', color: surface.primary, fontWeight: 600 }}
                    >
                      {m.label}
                    </a>
                  ))}
                </div>
              ) : null
            }
            action={
              inMoodle && !gated ? (
                <Link
                  href={`${surface.basePath}/course/${resource.slug}`}
                  style={{ ...RAIL_BUTTON, background: surface.primary }}
                >
                  Start Webinar
                </Link>
              ) : gated ? (
                <form
                  action={async () => {
                    'use server';
                    await signIn('cognito', {
                      redirectTo: `${surface.basePath}/course/${resource.slug}`,
                    });
                  }}
                >
                  <button type="submit" style={{ ...RAIL_BUTTON, background: surface.primary }}>
                    Sign In to Start
                  </button>
                  <p style={{
                    fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center',
                    marginTop: '8px', lineHeight: 1.5,
                  }}>
                    A free account lets us track your progress and issue your CE certificate.
                  </p>
                </form>
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
}
