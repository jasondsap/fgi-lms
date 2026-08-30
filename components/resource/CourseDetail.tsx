import Link from 'next/link';
import Image from 'next/image';
import { authEnabled, getSession, signIn } from '@/auth';
import PresenterCard from '@/components/resource/PresenterCard';
import ShellRail, { RAIL_BUTTON } from '@/components/resource/ShellRail';
import { getRelatedResources } from '@/lib/resources';
import type { Surface } from '@/lib/surface';
import { ceLabel } from '@/lib/ce';
import { RESOURCE_TYPE_LABELS, type Resource } from '@/types';

/** The e-learning laptop drawing from the 8-11-26 illustration set. */
const COURSE_ILLUSTRATION = '/images/category-cards/course.webp';

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
 * Course landing page — Jennifer's 8-11-26 course shell. Same family as the
 * webinar shell: a launcher, not a player. "Start Course" opens the Moodle
 * course player, which is where lessons, knowledge checks, the evaluation and
 * (later) the certificate live.
 *
 * Every block below the description is data-conditional, because coverage is
 * uneven across the ~76 courses: presenter rows exist only where a course has
 * a named presenter, the sponsor block only on the Marshall Health series, and
 * the NAADAC panel only where Jennifer's chart marks the course CE-approved.
 */
export default async function CourseDetail(
  { resource, surface }: { resource: Resource; surface: Surface },
) {
  const presenters = resource.presenters ?? [];
  const related    = await getRelatedResources(resource, surface.key, 3);

  const inMoodle = Boolean(resource.has_moodle_course);
  // Moodle needs a real user to enrol and to record completion, so the course
  // player is sign-in only — same gate the webinar shell uses.
  const gated = inMoodle && authEnabled && !(await getSession());

  const skillGroups: string[] = resource.naadac_skill_groups ?? [];
  const credits = resource.ceu_credits ? Number(resource.ceu_credits) : null;

  const facts = [
    resource.duration_minutes ? `⏱ Approx. ${resource.duration_minutes} min.` : '',
  ].filter(Boolean);

  const typeLabel = RESOURCE_TYPE_LABELS[resource.type] ?? 'Course';
  const sponsorSite = resource.sponsor_url
    ? resource.sponsor_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

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
              {resource.course_code ? `ID: ${resource.course_code}` : typeLabel}
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={COURSE_ILLUSTRATION}
            alt=""
            style={{ width: '454px', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
          />
        </div>

        {/* ── Description, presenters, sponsor, CE panels, action rail ── */}
        <div className="pdf-shell-grid pdf-shell-grid--body" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {resource.description && (
              <div>
                <div style={{ ...PANEL_TITLE }}>Description</div>
                <p style={{ ...PANEL_TEXT, maxWidth: '62ch' }}>{resource.description}</p>
              </div>
            )}

            {presenters.map((p) => (
              <PresenterCard key={p.id} presenter={p} accent={surface.primary} />
            ))}

            {/* Sponsor card — mirrors the mockup's Marshall Health block. In
                the mockup it sits inside the presenter card, but most courses
                have a sponsor or a presenter, not both, so it stands alone. */}
            {resource.sponsor_text && (
              <div style={{
                background: '#ffffff', border: '1px solid var(--border-color)',
                borderRadius: '8px', padding: '1.5rem', display: 'grid',
                gridTemplateColumns: resource.sponsor_logo_url ? '1fr 200px' : '1fr',
                gap: '1.75rem', alignItems: 'center',
              }}>
                <div style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-body-dark)' }}>
                  <strong>This Course is sponsored by:</strong><br />
                  {resource.sponsor_text}
                </div>
                {resource.sponsor_logo_url && (
                  <div style={{ textAlign: 'center' }}>
                    <Image
                      src={resource.sponsor_logo_url} alt="" width={200} height={60}
                      style={{ width: '100%', maxWidth: '200px', height: 'auto', objectFit: 'contain' }}
                    />
                    {resource.sponsor_url && (
                      <a
                        href={resource.sponsor_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'block', marginTop: '8px', fontSize: '13px', color: surface.primary }}
                      >
                        {sponsorSite}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Certificate panel. The mockup also promises an emailed
                certificate and a download link; neither exists yet
                (docs/CLAUDE.md §6ab), so that paragraph is held back rather
                than shipped as a promise we can't keep. */}
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
                  Education Provider, for <strong>{ceLabel(credits)}</strong>.
                  NAADAC Provider #242360, Fletcher Group, Inc., is responsible for all aspects
                  of their programming.
                </p>
                {skillGroups.length > 0 && (
                  <p style={{ ...PANEL_TEXT, marginTop: '1rem' }}>
                    This course aligns with NAADAC Skill Group(s):<br />
                    {skillGroups.join('; ')}
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
            extras={
              sponsorSite ? (
                <div>
                  {presenters.length === 0 && (
                    <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>
                      Presenter Information:
                    </div>
                  )}
                  <a
                    href={resource.sponsor_url!} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      fontSize: '15px', color: surface.primary,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.7" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20M12 2a15 15 0 010 20a15 15 0 010-20" />
                    </svg>
                    <span>{sponsorSite}</span>
                  </a>
                </div>
              ) : null
            }
            action={
              inMoodle && !gated ? (
                <Link
                  href={`${surface.basePath}/course/${resource.slug}`}
                  style={{ ...RAIL_BUTTON, background: surface.primary }}
                >
                  Start Course
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
                    Sign In to Start Course
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
