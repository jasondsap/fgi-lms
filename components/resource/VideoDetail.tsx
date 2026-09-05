import Link from 'next/link';
import PresenterCard from '@/components/resource/PresenterCard';
import ShellRail, { RAIL_LABEL } from '@/components/resource/ShellRail';
import { getRelatedResources, getVideoSeries } from '@/lib/resources';
import type { Surface } from '@/lib/surface';
import Clamp from '@/components/resource/Clamp';
import { ceLabel } from '@/lib/ce';
import { RESOURCE_TYPE_LABELS, type Resource } from '@/types';

/** The video drawing from the 8-11-26 illustration set, as on the cards. */
const VIDEO_ILLUSTRATION = '/images/category-cards/video.webp';

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
 * Video detail page — the webinar shell's layout with the player kept inline
 * (Jason, 8-19). Unlike a webinar there is nothing to launch: the video IS the
 * resource, so the Vimeo window sits in the body where the webinar's
 * no-course fallback player sits, and the rail carries no Start button.
 *
 * Today's video catalog is the 14 CORR/SCARR certification parts plus one
 * shared explainer — no presenters, no CE flags — so the presenter cards and
 * the Certificate/NAADAC panels below are conditional furniture that simply
 * doesn't render yet, kept so a future flagged video lights them up like the
 * webinar shell does.
 */
export default async function VideoDetail(
  { resource, surface }: { resource: Resource; surface: Surface },
) {
  const presenters = resource.presenters ?? [];
  const [related, series] = await Promise.all([
    getRelatedResources(resource, surface.key, 8),
    getVideoSeries(resource.title, surface.key),
  ]);

  const skillGroups: string[] = resource.naadac_skill_groups ?? [];
  const credits = resource.ceu_credits ? Number(resource.ceu_credits) : null;

  // No event dates exist on videos, and published_at is a bulk-load timestamp
  // (docs/CLAUDE.md §6y) — showing it would just mislead. Duration only.
  const facts = [
    resource.duration_minutes ? `⏱ Approx. ${resource.duration_minutes} min.` : '',
  ].filter(Boolean);

  return (
    <div style={{ background: '#ffffff', minHeight: '60vh' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem 2rem 3rem' }}>

        {/* Breadcrumb — not in any mockup, but the only way back into a
            tenant's own portal from here. */}
        <nav style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          <Link href={surface.basePath || '/'} style={{ color: surface.primary }}>Home</Link>
          {' / '}
          <Link href={surface.libraryHref} style={{ color: surface.primary }}>Library</Link>
          {' / '}
          <span>{resource.title}</span>
        </nav>

        {/* ── Title and illustration ── */}
        {/* One grid (8-30-26): title, description and body on the left;
            illustration + action rail on the right, spanning both rows, so the
            rail always starts under the illustration however tall the title
            cell is (citation + abstract on link-only publications). */}
        <div className="shell-grid">
          <div className="shell-grid__title" style={{ paddingTop: '0.75rem' }}>
            <h1 style={{
              fontSize: '36px', lineHeight: 1.15, fontWeight: 700,
              fontStretch: '75%', color: 'var(--text-primary)',
            }}>
              {resource.title}
            </h1>

            <div style={{ fontSize: '17px', color: 'var(--text-secondary)', marginTop: '10px' }}>
              {resource.course_code
                ? `ID: ${resource.course_code}`
                : RESOURCE_TYPE_LABELS.video}
            </div>

            {/* 2rem (Jennifer 8-31): clear air between the ID line and the
                description. */}
            {resource.description && (
              <div style={{ marginTop: '2rem' }}>
                <div style={{ ...PANEL_TITLE }}>Description</div>
                <Clamp text={resource.description} accent={surface.primary} />
              </div>
            )}
          </div>

          <div className="shell-grid__side">

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={VIDEO_ILLUSTRATION}
            alt=""
            style={{ width: '344px', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
          />
          <ShellRail
            slug={resource.slug}
            title={resource.title}
            description={resource.description}
            surface={surface}
            facts={facts}
            presenters={presenters}
            related={related}
            /* The 7-part certification series all share one title, so this
               list is the only in-page way from one part to the next. */
            extras={
              series.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={RAIL_LABEL}>This Series</div>
                  {series.map((item) =>
                    item.slug === resource.slug ? (
                      <span key={item.slug} style={{
                        fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)',
                      }}>
                        {item.label} — Now Playing
                      </span>
                    ) : (
                      <Link
                        key={item.slug}
                        href={`${surface.basePath}/resource/${item.slug}`}
                        style={{ fontSize: '16px', color: surface.primary, fontWeight: 600 }}
                      >
                        {item.label}
                      </Link>
                    ),
                  )}
                </div>
              ) : null
            }
          />
          </div>


        {/* ── Description, player, and the action rail ── */}
          <div className="shell-grid__body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* The video window — same frame as the webinar shell's inline
                player, but here it is permanent: the video is the resource. */}
            {resource.vimeo_id && (
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

            {resource.is_naadac_ce && (
              <div style={PANEL}>
                <div style={PANEL_TITLE}>NAADAC CE Details</div>
                <p style={PANEL_TEXT}>
                  This course has been approved by Fletcher Group, Inc., as a NAADAC Approved
                  Education Provider, for <strong>{ceLabel(credits)}</strong>. NAADAC Provider
                  {' '}#242360, Fletcher Group, Inc., is responsible for all aspects of their
                  programming.
                </p>
                {skillGroups.length > 0 && (
                  <p style={{ ...PANEL_TEXT, marginTop: '1rem' }}>
                    And aligns with NAADAC Skill Group(s):<br />
                    {skillGroups.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
