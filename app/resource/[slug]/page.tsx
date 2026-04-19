import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPE_COLORS,
  AUDIENCE_TAG_LABELS,
  TOPIC_TAG_LABELS,
} from '@/types';

async function getResource(slug: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res  = await fetch(`${base}/api/resources/${slug}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

// Map resource type to the category card image in /public/images/category-cards/
const CATEGORY_CARD_IMAGE: Record<string, string> = {
  newsletter:    '/images/category-cards/newsletter.png',
  toolkit:       '/images/category-cards/toolkit.png',
  webinar:       '/images/category-cards/webinar.png',
  podcast:       '/images/category-cards/podcast.png',
  video:         '/images/category-cards/video.png',
  paper:         '/images/category-cards/paper.png',
  infographic:   '/images/category-cards/infographic.png',
  success_story: '/images/category-cards/success-story.png',
  handbook:      '/images/category-cards/handbook.png',
};

export default async function ResourceDetailPage({ params }: { params: { slug: string } }) {
  const resource = await getResource(params.slug);
  if (!resource) notFound();

  const badgeColor  = RESOURCE_TYPE_COLORS[resource.type];
  const typeLabel   = RESOURCE_TYPE_LABELS[resource.type];
  const cardImage   = resource.thumbnail_url || CATEGORY_CARD_IMAGE[resource.type] || null;
  const isVideo     = resource.type === 'video' || resource.type === 'webinar';
  const isPDF       = !!resource.download_url;
  const isExternal  = !!resource.external_url;

  return (
    <div style={{ background: 'var(--body-bg)', minHeight: '60vh' }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '2rem 2rem 4rem',
      }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
          <Link href="/" style={{ color: 'var(--fgi-blue)' }}>Home</Link>
          {' / '}
          <Link href="/" style={{ color: 'var(--fgi-blue)' }}>Library</Link>
          {' / '}
          <span>{resource.title}</span>
        </nav>

        {/* ── Two-column layout ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '2.5rem',
          alignItems: 'start',
        }}>

          {/* ── LEFT: main content ── */}
          <div>

            {/* Title */}
            <h1 style={{
              fontSize: '26px',
              fontWeight: 700,
              lineHeight: 1.25,
              marginBottom: '1.5rem',
              color: 'var(--text-primary)',
            }}>
              {resource.title}
            </h1>

            {/* Vimeo embed (video/webinar) */}
            {isVideo && resource.vimeo_id && (
              <div style={{
                position: 'relative',
                paddingTop: '56.25%',
                marginBottom: '1.75rem',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#111',
                boxShadow: 'var(--shadow-card)',
              }}>
                <iframe
                  src={`https://player.vimeo.com/video/${resource.vimeo_id}?badge=0&autopause=0`}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  title={resource.title}
                />
              </div>
            )}

            {/* Description section */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--text-muted)',
                marginBottom: '10px',
              }}>
                Description
              </div>
              <p style={{
                fontSize: '15px',
                lineHeight: 1.75,
                color: 'var(--text-secondary)',
              }}>
                {resource.description}
              </p>
            </div>

            {/* Audience + Topic tags */}
            {(resource.audience_tags?.length > 0 || resource.topic_tags?.length > 0) && (
              <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
              }}>
                {resource.audience_tags?.length > 0 && (
                  <div style={{ marginBottom: resource.topic_tags?.length > 0 ? '1rem' : 0 }}>
                    <div style={{
                      fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '8px',
                    }}>
                      Audience
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {resource.audience_tags.map((tag: string) => (
                        <span key={tag} style={{
                          background: 'var(--fgi-blue-light)',
                          color: 'var(--fgi-blue-dark)',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '13px',
                        }}>
                          {AUDIENCE_TAG_LABELS[tag as keyof typeof AUDIENCE_TAG_LABELS] || tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {resource.topic_tags?.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '8px',
                    }}>
                      Topics
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {resource.topic_tags.map((tag: string) => (
                        <span key={tag} style={{
                          background: '#f0f7ef',
                          color: '#2d6a4f',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '13px',
                        }}>
                          {TOPIC_TAG_LABELS[tag as keyof typeof TOPIC_TAG_LABELS] || tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: sidebar actions ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Category card / thumbnail image */}
            {cardImage && !isVideo && (
              <div style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--border-color)',
              }}>
                <Image
                  src={cardImage}
                  alt={resource.title}
                  width={320}
                  height={200}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Open (view in browser) */}
              {isPDF && (
                <a
                  href={resource.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    background: 'var(--fgi-blue)',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '13px 0',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '15px',
                    textDecoration: 'none',
                  }}
                >
                  Open {typeLabel.split(' / ')[0]}
                </a>
              )}

              {/* Download */}
              {isPDF && (
                <a
                  href={resource.download_url}
                  download
                  style={{
                    display: 'block',
                    background: 'var(--fgi-blue)',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '13px 0',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '15px',
                    textDecoration: 'none',
                    opacity: 0.88,
                  }}
                >
                  Download {typeLabel.split(' / ')[0]}
                </a>
              )}

              {/* External link (podcasts, non-FGI) */}
              {isExternal && (
                <a
                  href={resource.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    background: 'var(--fgi-blue)',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '13px 0',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '15px',
                    textDecoration: 'none',
                  }}
                >
                  Open Resource
                </a>
              )}
            </div>

            {/* Type badge + duration meta */}
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.125rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: badgeColor, color: '#fff',
                  fontSize: '12px', fontWeight: 600,
                  padding: '3px 10px', borderRadius: '4px',
                }}>
                  {typeLabel}
                </span>
                {resource.is_naadac_ce && (
                  <span style={{
                    background: '#0e72a2', color: '#fff',
                    fontSize: '11px', fontWeight: 700,
                    padding: '3px 8px', borderRadius: '4px',
                  }}>
                    NAADAC CE
                  </span>
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

            {/* Support link */}
            <div style={{
              background: 'var(--fgi-blue-light)',
              border: '1px solid #cce3f0',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.125rem',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}>
              For support email{' '}
              <a href="mailto:LC@fletchergroup.org" style={{ color: 'var(--fgi-blue)' }}>
                LC@fletchergroup.org
              </a>
            </div>

            {/* Back to library */}
            <Link href="/" style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px 0',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--fgi-blue)',
              color: 'var(--fgi-blue)',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
            }}>
              ← Back to Library
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
