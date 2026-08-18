import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authEnabled, getSession, signIn } from '@/auth';
import CategoryImage from '@/components/library/CategoryImage';
import CourseDetail from '@/components/resource/CourseDetail';
import PdfDetail from '@/components/resource/PdfDetail';
import PdfViewer from '@/components/resource/PdfViewer';
import PodcastDetail from '@/components/resource/PodcastDetail';
import WebinarDetail from '@/components/resource/WebinarDetail';
import { getResourceBySlug } from '@/lib/resources';
import type { Surface } from '@/lib/surface';
import {
  RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS,
  AUDIENCE_TAG_LABELS, TOPIC_TAG_LABELS,
  type ResourceType,
} from '@/types';

// Shell card images — in /public/images/shell-cards/
// Filenames matched exactly to what's on disk
const SHELL_CARD_IMAGE: Record<string, string> = {
  newsletter:    '/images/shell-cards/newletter-shell-card.png',  // matches filename on disk
  toolkit:       '/images/shell-cards/toolkit-shell-card.png',
  handbook:      '/images/shell-cards/handbook-shell-card.png',
  webinar:       '/images/shell-cards/webinar-shell-card.png',
  podcast:       '/images/shell-cards/podcasts-shell-card.png',
  paper:         '/images/shell-cards/paper-shell-card.png',
  infographic:   '/images/shell-cards/infographic-shell-card.png',
  success_story: '/images/shell-cards/success-stories-shell-card.png',
  course:        '/images/shell-cards/toolkit-shell-card.png',
  naadac_ce:     '/images/shell-cards/toolkit-shell-card.png',
  guidebook:     '/images/shell-cards/handbook-shell-card.png',
  whitepaper:    '/images/shell-cards/paper-shell-card.png',
  fgi_service:   '/images/shell-cards/toolkit-shell-card.png',
  non_fgi:       '/images/shell-cards/paper-shell-card.png',
  video:         '/images/shell-cards/webinar-shell-card.png',
};

/**
 * Resource detail page body, shared by the FGI site and both tenant portals.
 * All in-surface links go through `surface.basePath` so a tenant learner stays
 * in tenant chrome all the way to the course player.
 */
export default async function ResourceDetail(
  { slug, surface, searchParams }: {
    slug: string;
    surface: Surface;
    searchParams?: Record<string, string | string[] | undefined>;
  },
) {
  // Query the DB directly — a server component must never fetch its own API
  // route at runtime (see docs/CLAUDE.md architecture notes).
  const resource: any = await getResourceBySlug(slug);
  if (!resource) notFound();

  // Webinars get their own richer layout (presenters, materials, related) per
  // the 4-21-26 mockup. Everything else keeps the generic template below.
  if (resource.type === 'webinar') {
    return (
      <>
        <WebinarDetail resource={resource} surface={surface} />
      </>
    );
  }

  // Podcast episodes get the Recovery Ecosystem Radio shell (8-12-26 mockup):
  // show masthead, inline audio player, guest and host bands.
  if (resource.type === 'podcast') {
    return (
      <>
        <PodcastDetail resource={resource} surface={surface} searchParams={searchParams} />
      </>
    );
  }

  // Courses get the 8-11-26 course shell — the launcher for the Moodle player.
  if (resource.type === 'course' || resource.type === 'naadac_ce') {
    return (
      <>
        <CourseDetail resource={resource} surface={surface} />
      </>
    );
  }

  const type       = resource.type as ResourceType;
  const badgeColor = RESOURCE_TYPE_COLORS[type] ?? '#0e72a2';
  const typeLabel  = RESOURCE_TYPE_LABELS[type] ?? type;
  const cardImage  = resource.thumbnail_url || SHELL_CARD_IMAGE[type] || null;
  const isVideo    = type === 'video' || type === 'webinar';
  const isPDF      = !!resource.download_url;
  const isExternal = !!resource.external_url;
  const shortLabel = typeLabel.split(' / ')[0];

  // Courses require a signed-in user (no-op until Cognito env vars exist)
  const isCourse    = type === 'course' || type === 'naadac_ce';
  const courseGated = isCourse && authEnabled && !(await getSession());

  // Anything whose substance is a document — Learning Brief, Newsletter,
  // Publication, Success Story, Guide, Cert. Document, Infographic — gets the
  // 8-11-26 PDF shell. Courses open in Moodle and videos play inline, so both
  // stay on the generic template below even when a PDF hangs off them.
  //
  // Note this is not conditioned on there *being* a PDF: most peer-reviewed
  // publications may not be hosted (the publisher's terms decide), and those
  // pages are the citation, the abstract and a DOI link. Sending them to the
  // legacy template instead cost them the citation and mis-rendered their year.
  if (!isCourse && !isVideo) {
    return (
      <>
        <PdfDetail resource={resource} surface={surface} />
      </>
    );
  }

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

        {/* Title */}
        <h1 style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.2, marginBottom: '1.75rem' }}>
          {resource.title}
        </h1>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2.5rem', alignItems: 'start' }}>

          {/* LEFT — a flex column so each card is separated by one gap, with no
              trailing margin when the last optional card is absent. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Vimeo embed for video/webinar */}
            {isVideo && resource.vimeo_id && (
              <div style={{
                position: 'relative', paddingTop: '56.25%',
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

            {/* Description */}
            <div style={{
              border: '1px solid var(--border-color)', borderRadius: '8px',
              padding: '1.25rem 1.5rem',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '10px',
              }}>Description</div>
              <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--text-secondary)', margin: 0 }}>
                {resource.description}
              </p>
            </div>

            {/* Audience tags */}
            {resource.audience_tags?.length > 0 && (
              <div style={{
                border: '1px solid var(--border-color)', borderRadius: '8px',
                padding: '1.25rem 1.5rem',
              }}>
                <div style={{
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '10px',
                }}>Audience</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {resource.audience_tags.map((tag: string) => (
                    <span key={tag} style={{
                      background: 'var(--fgi-blue-light)', color: 'var(--fgi-blue-dark)',
                      padding: '4px 12px', borderRadius: '20px', fontSize: '13px',
                    }}>
                      {AUDIENCE_TAG_LABELS[tag as keyof typeof AUDIENCE_TAG_LABELS] || tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Topic tags */}
            {resource.topic_tags?.length > 0 && (
              <div style={{
                border: '1px solid var(--border-color)', borderRadius: '8px',
                padding: '1.25rem 1.5rem',
              }}>
                <div style={{
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '10px',
                }}>Topics</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {resource.topic_tags.map((tag: string) => (
                    <span key={tag} style={{
                      background: '#f0f7ef', color: '#2d6a4f',
                      padding: '4px 12px', borderRadius: '20px', fontSize: '13px',
                    }}>
                      {TOPIC_TAG_LABELS[tag as keyof typeof TOPIC_TAG_LABELS] || tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Inline PDF viewer. Renders on desktop widths only — see the
                component for why phones are excluded. */}
            {isPDF && (
              <PdfViewer
                url={resource.download_url}
                title={resource.title}
                label={shortLabel}
                accent={surface.primary}
              />
            )}
          </div>

          {/* RIGHT sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Shell card image */}
            {cardImage && !isVideo && (
              <CategoryImage src={cardImage} alt={resource.title} badgeColor={badgeColor} />
            )}

            {/* Action buttons */}
            {/* The document itself is read in the inline viewer, so the sidebar
                only needs the download. `attachment_url` is signed with an
                attachment disposition — a plain `download` attribute would be
                ignored here, S3 being cross-origin. */}
            {isPDF && (
              <a href={resource.attachment_url ?? resource.download_url} style={{
                display: 'block', background: surface.primary, color: '#fff',
                textAlign: 'center', padding: '13px 0', borderRadius: '8px',
                fontWeight: 600, fontSize: '15px', textDecoration: 'none',
              }}>Download {shortLabel}</a>
            )}
            {isCourse && !courseGated && (
              <Link href={`${surface.basePath}/course/${slug}`} style={{
                display: 'block', background: surface.primary, color: '#fff',
                textAlign: 'center', padding: '13px 0', borderRadius: '8px',
                fontWeight: 600, fontSize: '15px', textDecoration: 'none',
              }}>Start Course</Link>
            )}
            {isExternal && !isCourse && (
              <a href={resource.external_url} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', background: surface.primary, color: '#fff',
                textAlign: 'center', padding: '13px 0', borderRadius: '8px',
                fontWeight: 600, fontSize: '15px', textDecoration: 'none',
              }}>Open Resource</a>
            )}
            {courseGated && (
              <form
                action={async () => {
                  'use server';
                  await signIn('cognito', { redirectTo: `${surface.basePath}/course/${slug}` });
                }}
              >
                <button type="submit" style={{
                  display: 'block', width: '100%', background: surface.primary, color: '#fff',
                  textAlign: 'center', padding: '13px 0', borderRadius: '8px', border: 'none',
                  fontWeight: 600, fontSize: '15px', fontFamily: 'inherit', cursor: 'pointer',
                }}>Sign In to Start Course</button>
                <p style={{
                  fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center',
                  marginTop: '8px', lineHeight: 1.5,
                }}>Courses require a free account so your progress and CE credit can be tracked.</p>
              </form>
            )}

            {/* Meta card */}
            <div style={{
              border: '1px solid var(--border-color)', borderRadius: '8px',
              padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: badgeColor, color: '#fff', fontSize: '12px',
                  fontWeight: 600, padding: '3px 10px', borderRadius: '4px',
                }}>{typeLabel}</span>
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
              {resource.published_at && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {new Date(resource.published_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long',
                  })}
                </div>
              )}
            </div>

            {/* Support */}
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

            {/* Back to library */}
            <Link href={surface.libraryHref} style={{
              display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: '8px',
              border: `1.5px solid ${surface.primary}`, color: surface.primary,
              fontWeight: 600, fontSize: '14px', textDecoration: 'none',
            }}>← Back to Library</Link>
          </div>
        </div>
      </div>

    </div>
  );
}
