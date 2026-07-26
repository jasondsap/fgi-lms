import Link from 'next/link';
import Image from 'next/image';
import PresenterBio from '@/components/resource/PresenterBio';
import { getRelatedWebinars } from '@/lib/resources';
import type { Surface } from '@/lib/surface';
import {
  AUDIENCE_TAG_LABELS, TOPIC_TAG_LABELS, MATERIAL_KIND_LABELS,
  RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS,
  type MaterialKind, type Presenter, type Resource, type ResourceMaterial,
} from '@/types';

// The Fletcher Group webinar series card, per the 4-21-26 mockup. Webinars
// don't carry a per-episode still, so every one shows the series artwork.
const SERIES_IMAGE = '/images/category-cards/webinar.png';

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

const SECTION_LABEL = {
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '10px',
};

const PANEL = {
  border: '1px solid var(--border-color)', borderRadius: '8px',
  padding: '1.25rem 1.5rem', marginBottom: '1.25rem',
};

/**
 * Webinar detail page — the richer layout Jennifer specced in the 4-21-26
 * mockup: video, description, downloadable materials, and a presenter band with
 * headshot and bio.
 *
 * Every block is conditional on its data existing, because coverage across the
 * catalog is uneven: some webinars ship a transcript, slides and two presenters,
 * others only a recording. Blocks the source material never supplies (learning
 * objectives, CEU credits, knowledge check) are deliberately absent rather than
 * invented — the mockup's versions of those are PsychArmor filler text.
 */
export default async function WebinarDetail(
  { resource, surface }: { resource: Resource; surface: Surface },
) {
  const presenters = resource.presenters ?? [];
  const materials  = resource.materials ?? [];
  const eventDate  = formatEventDate(resource.event_date ?? resource.published_at);
  const related    = await getRelatedWebinars(resource.id, surface.key, 3);

  return (
    <div style={{ background: '#ffffff', minHeight: '60vh' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '2rem 2rem 3rem' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
          <Link href={surface.basePath || '/'} style={{ color: surface.primary }}>Home</Link>
          {' / '}
          <Link href={surface.libraryHref} style={{ color: surface.primary }}>Library</Link>
          {' / '}
          <span>{resource.title}</span>
        </nav>

        <h1 style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.2, marginBottom: '1.75rem' }}>
          {resource.title}
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2.5rem', alignItems: 'start' }}>

          {/* ── LEFT ── */}
          <div>
            {resource.vimeo_id && (
              <div style={{
                position: 'relative', paddingTop: '56.25%', marginBottom: '1.75rem',
                borderRadius: '8px', overflow: 'hidden', background: '#111',
              }}>
                <iframe
                  src={`https://player.vimeo.com/video/${resource.vimeo_id}?badge=0&autopause=0`}
                  frameBorder="0" allow="autoplay; fullscreen; picture-in-picture"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  title={resource.title}
                />
              </div>
            )}

            <div style={PANEL}>
              <div style={SECTION_LABEL}>Description</div>
              <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--text-secondary)', margin: 0 }}>
                {resource.description}
              </p>
            </div>

            {materials.length > 0 && (
              <div style={PANEL}>
                <div style={SECTION_LABEL}>Materials</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {materials.map((m) => (
                    <MaterialLink key={m.id} material={m} accent={surface.primary} />
                  ))}
                </div>
              </div>
            )}

            {resource.audience_tags?.length > 0 && (
              <div style={PANEL}>
                <div style={SECTION_LABEL}>Audience</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {resource.audience_tags.map((tag) => (
                    <span key={tag} style={{
                      background: 'var(--fgi-blue-light)', color: 'var(--fgi-blue-dark)',
                      padding: '4px 12px', borderRadius: '20px', fontSize: '13px',
                    }}>
                      {AUDIENCE_TAG_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {resource.topic_tags?.length > 0 && (
              <div style={{ ...PANEL, marginBottom: 0 }}>
                <div style={SECTION_LABEL}>Topics</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {resource.topic_tags.map((tag) => (
                    <span key={tag} style={{
                      background: '#f0f7ef', color: '#2d6a4f',
                      padding: '4px 12px', borderRadius: '20px', fontSize: '13px',
                    }}>
                      {TOPIC_TAG_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)',
              lineHeight: 0,
            }}>
              <Image
                src={SERIES_IMAGE} alt="" width={640} height={360}
                style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
              />
            </div>

            <div style={{
              border: '1px solid var(--border-color)', borderRadius: '8px',
              padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: RESOURCE_TYPE_COLORS.webinar, color: '#fff', fontSize: '12px',
                  fontWeight: 600, padding: '3px 10px', borderRadius: '4px',
                }}>{RESOURCE_TYPE_LABELS.webinar}</span>
                {resource.is_naadac_ce && (
                  <span style={{
                    background: '#0e72a2', color: '#fff', fontSize: '11px',
                    fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                  }}>NAADAC CE</span>
                )}
              </div>
              {resource.duration_minutes && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  ⏱ Approx. {resource.duration_minutes} min.
                </div>
              )}
              {eventDate && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Presented {eventDate}
                </div>
              )}
            </div>

            {materials.length > 0 && (
              <div style={{
                border: '1px solid var(--border-color)', borderRadius: '8px',
                padding: '1rem 1.125rem',
              }}>
                <div style={{ ...SECTION_LABEL, marginBottom: '8px' }}>This webinar also includes</div>
                {materials.map((m) => (
                  <div key={m.id} style={{
                    fontSize: '13px', color: 'var(--text-secondary)',
                    display: 'flex', gap: '8px', alignItems: 'baseline',
                  }}>
                    <span style={{ color: surface.primary, fontWeight: 700 }}>✓</span>
                    <span>{m.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              background: 'var(--fgi-blue-light)', border: '1px solid #cce3f0',
              borderRadius: '8px', padding: '1rem 1.125rem',
              fontSize: '13px', color: 'var(--text-secondary)',
            }}>
              For support email{' '}
              <a href="mailto:LC@fletchergroup.org" style={{ color: 'var(--fgi-blue)' }}>
                LC@fletchergroup.org
              </a>
            </div>

            {related.length > 0 && (
              <div style={{
                border: '1px solid var(--border-color)', borderRadius: '8px',
                padding: '1rem 1.125rem',
              }}>
                <div style={{ ...SECTION_LABEL, marginBottom: '10px' }}>
                  You might also be interested in
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      href={`${surface.basePath}/resource/${r.slug}`}
                      style={{
                        fontSize: '14px', lineHeight: 1.4, fontWeight: 600,
                        color: surface.primary, textDecoration: 'none',
                      }}
                    >
                      {r.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link href={surface.libraryHref} style={{
              display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: '8px',
              border: `1.5px solid ${surface.primary}`, color: surface.primary,
              fontWeight: 600, fontSize: '14px', textDecoration: 'none',
            }}>← Back to Library</Link>
          </div>
        </div>
      </div>

      {/* ── Presenter band (full-bleed) ── */}
      {presenters.length > 0 && (
        <section style={{ background: 'var(--body-bg)', padding: '2.5rem 2rem' }}>
          <div style={{
            maxWidth: 'var(--max-width)', margin: '0 auto',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}>
            {presenters.map((p) => (
              <PresenterCard key={p.id} presenter={p} accent={surface.primary} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PresenterCard({ presenter: p, accent }: { presenter: Presenter; accent: string }) {
  return (
    <div style={{
      background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px',
      padding: '1.5rem', display: 'grid',
      gridTemplateColumns: p.org_logo_url ? '140px 1fr 180px' : '140px 1fr',
      gap: '1.75rem', alignItems: 'start',
    }}>
      <div>
        {p.photo_url ? (
          <Image
            src={p.photo_url} alt={p.name} width={140} height={140}
            style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '4px' }}
          />
        ) : (
          <div style={{
            width: '140px', height: '140px', borderRadius: '4px',
            background: 'var(--body-bg)', border: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 700, color: 'var(--text-muted)',
          }}>
            {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-body-dark)' }}>
          {p.name}{p.credentials ? `, ${p.credentials}` : ''}
        </div>
        {p.title && (
          <div style={{ fontSize: '14px', fontWeight: 600, color: accent, margin: '2px 0 10px' }}>
            {p.title}
          </div>
        )}
        {p.bio && <PresenterBio bio={p.bio} accent={accent} />}
      </div>

      {p.org_logo_url && (
        <div style={{ textAlign: 'center' }}>
          <Image
            src={p.org_logo_url} alt={p.org_name ?? ''} width={180} height={90}
            style={{ width: '100%', maxWidth: '180px', height: 'auto', objectFit: 'contain' }}
          />
          {p.org_url && (
            <a
              href={p.org_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', marginTop: '8px', fontSize: '13px', color: accent }}
            >
              {p.org_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function MaterialLink({ material: m, accent }: { material: ResourceMaterial; accent: string }) {
  // Most labels already name the kind ("Presentation Slides"); only append the
  // kind when it adds something the label doesn't already say.
  const kindLabel = MATERIAL_KIND_LABELS[m.kind as MaterialKind];
  const suffix = kindLabel && kindLabel.toLowerCase() !== m.label.toLowerCase() ? kindLabel : null;

  return (
    <a
      href={m.download_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        fontSize: '14px', color: accent, fontWeight: 600, textDecoration: 'none',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span>{m.label}</span>
      {suffix && (
        <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>
          ({suffix})
        </span>
      )}
    </a>
  );
}
