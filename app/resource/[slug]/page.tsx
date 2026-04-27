import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CategoryImage from '@/components/library/CategoryImage';
import {
  RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS,
  AUDIENCE_TAG_LABELS, TOPIC_TAG_LABELS,
  type ResourceType,
} from '@/types';

async function getResource(slug: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res  = await fetch(`${base}/api/resources/${slug}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

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
  non_fgi:       '/images/shell-cards/paper-shell-card.png',
  video:         '/images/shell-cards/webinar-shell-card.png',
};

export default async function ResourceDetailPage({ params }: { params: { slug: string } }) {
  const resource = await getResource(params.slug);
  if (!resource) notFound();

  const type       = resource.type as ResourceType;
  const badgeColor = RESOURCE_TYPE_COLORS[type] ?? '#0e72a2';
  const typeLabel  = RESOURCE_TYPE_LABELS[type] ?? type;
  const cardImage  = resource.thumbnail_url || SHELL_CARD_IMAGE[type] || null;
  const isVideo    = type === 'video' || type === 'webinar';
  const isPDF      = !!resource.download_url;
  const isExternal = !!resource.external_url;
  const shortLabel = typeLabel.split(' / ')[0];

  return (
    <div style={{ background: '#ffffff', minHeight: '60vh' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '2rem 2rem 3rem' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
          <Link href="/" style={{ color: 'var(--fgi-blue)' }}>Home</Link>
          {' / '}
          <Link href="/" style={{ color: 'var(--fgi-blue)' }}>Library</Link>
          {' / '}
          <span>{resource.title}</span>
        </nav>

        {/* Title */}
        <h1 style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.2, marginBottom: '1.75rem' }}>
          {resource.title}
        </h1>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2.5rem', alignItems: 'start' }}>

          {/* LEFT */}
          <div>
            {/* Vimeo embed for video/webinar */}
            {isVideo && resource.vimeo_id && (
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

            {/* Description */}
            <div style={{
              border: '1px solid var(--border-color)', borderRadius: '8px',
              padding: '1.25rem 1.5rem', marginBottom: '1.25rem',
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
                padding: '1.25rem 1.5rem', marginBottom: '1.25rem',
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
          </div>

          {/* RIGHT sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Shell card image */}
            {cardImage && !isVideo && (
              <CategoryImage src={cardImage} alt={resource.title} badgeColor={badgeColor} />
            )}

            {/* Action buttons */}
            {isPDF && (
              <a href={resource.download_url} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', background: 'var(--fgi-blue)', color: '#fff',
                textAlign: 'center', padding: '13px 0', borderRadius: '8px',
                fontWeight: 600, fontSize: '15px', textDecoration: 'none',
              }}>Open {shortLabel}</a>
            )}
            {isPDF && (
              <a href={resource.download_url} download style={{
                display: 'block', background: 'var(--fgi-blue)', color: '#fff',
                textAlign: 'center', padding: '13px 0', borderRadius: '8px',
                fontWeight: 600, fontSize: '15px', textDecoration: 'none', opacity: 0.85,
              }}>Download {shortLabel}</a>
            )}
            {isExternal && (
              <a href={resource.external_url} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', background: 'var(--fgi-blue)', color: '#fff',
                textAlign: 'center', padding: '13px 0', borderRadius: '8px',
                fontWeight: 600, fontSize: '15px', textDecoration: 'none',
              }}>Open Resource</a>
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
            <Link href="/" style={{
              display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: '8px',
              border: '1.5px solid var(--fgi-blue)', color: 'var(--fgi-blue)',
              fontWeight: 600, fontSize: '14px', textDecoration: 'none',
            }}>← Back to Library</Link>
          </div>
        </div>
      </div>

      {/* ── Detail page slim footer ── */}
      <footer style={{
        borderTop: '1px solid #e8e8e8',
        padding: '1.25rem 2rem',
        background: '#ffffff',
        marginTop: '2rem',
      }}>
        <div style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* FGI logo + URL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logos/fgi-logo.png"
              alt="Fletcher Group"
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
            />
            <Link
              href="https://www.fletchergroup.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '13px', color: 'var(--fgi-blue)', textDecoration: 'none' }}
            >
              www.fletchergroup.org
            </Link>
          </div>

          {/* Support email */}
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            For Support Email:{' '}
            <a href="mailto:LC@fletchergroup.org" style={{ color: 'var(--fgi-blue)' }}>
              LC@fletchergroup.org
            </a>
          </div>

          {/* Social icons */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <Link href="https://www.facebook.com/FletcherGroupInc" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#0e72a2">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
              </svg>
            </Link>
            <Link href="https://www.linkedin.com/company/fletcher-group-inc" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#0e72a2">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
