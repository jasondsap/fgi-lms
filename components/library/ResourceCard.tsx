'use client';
import Link from 'next/link';
import type { Resource } from '@/types';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS } from '@/types';

interface Props { resource: Resource; }

const CATEGORY_CARD_IMAGE: Record<string, string> = {
  newsletter:    '/images/category-cards/newsletters.png',
  toolkit:       '/images/category-cards/toolkit.png',
  handbook:      '/images/category-cards/handbook.png',
  webinar:       '/images/category-cards/webinar.png',
  podcast:       '/images/category-cards/podcast.png',
  paper:         '/images/category-cards/paper.png',
  infographic:   '/images/category-cards/infographic.png',
  success_story: '/images/category-cards/success-story.png',
  course:        '/images/category-cards/toolkit.png',
  naadac_ce:     '/images/category-cards/toolkit.png',
  non_fgi:       '/images/category-cards/paper.png',
  video:         '/images/category-cards/video.png',
};

function formatDuration(mins: number | null): string {
  if (!mins) return '';
  if (mins < 60) return `Approx. ${mins} min.`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `Approx. ${h}h ${m}m.` : `Approx. ${h}h.`;
}

export default function ResourceCard({ resource }: Props) {
  const badgeColor   = RESOURCE_TYPE_COLORS[resource.type] ?? '#0e72a2';
  const typeLabel    = RESOURCE_TYPE_LABELS[resource.type] ?? resource.type;
  const thumbnailSrc = resource.thumbnail_url || CATEGORY_CARD_IMAGE[resource.type] || null;
  const shortLabel   = typeLabel.split(' / ')[0];

  return (
    <Link
      href={`/resource/${resource.slug}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <article
        style={{
          background: 'var(--card-bg)',
          borderRadius: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'box-shadow 0.18s, transform 0.18s',
          border: '1px solid #ebebeb',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.11)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        {/* Thumbnail — fully rounded top corners, contain so full image shows */}
        <div style={{
          height: '180px',
          flexShrink: 0,
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {thumbnailSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailSrc}
              alt={resource.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `${badgeColor}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px', opacity: 0.3,
            }}>📄</div>
          )}
        </div>

        {/* Card body */}
        <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Type badge pill + CE badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{
              background: badgeColor,
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              letterSpacing: '0.02em',
              display: 'inline-block',
            }}>
              {shortLabel}
            </span>
            {resource.is_naadac_ce && (
              <span style={{
                background: '#0e72a2',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '20px',
                letterSpacing: '0.03em',
              }}>
                NAADAC CE
              </span>
            )}
          </div>

          {/* Title */}
          <h3 style={{
            fontSize: '14px',
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: '6px',
            color: 'var(--text-primary)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {resource.title}
          </h3>

          {/* Description */}
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '8px',
          }}>
            {resource.description}
          </p>

          {/* Duration */}
          {resource.duration_minutes && (
            <p style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginTop: 'auto',
            }}>
              {formatDuration(resource.duration_minutes)}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
