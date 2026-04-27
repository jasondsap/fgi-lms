'use client';
import Link from 'next/link';
import type { Resource } from '@/types';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS } from '@/types';

interface Props { resource: Resource; }

// Matches exact filenames in /public/images/category-cards/
const CATEGORY_CARD_IMAGE: Record<string, string> = {
  newsletter:    '/images/category-cards/newsletters.png',
  toolkit:       '/images/category-cards/toolkit.png',
  webinar:       '/images/category-cards/webinar.png',
  podcast:       '/images/category-cards/podcast.png',
  video:         '/images/category-cards/video.png',
  paper:         '/images/category-cards/paper.png',
  infographic:   '/images/category-cards/infographic.png',
  success_story: '/images/category-cards/success-story.png',
  handbook:      '/images/category-cards/handbook.png',
  course:        '/images/category-cards/toolkit.png',
  naadac_ce:     '/images/category-cards/toolkit.png',
  non_fgi:       '/images/category-cards/paper.png',
};

function formatDuration(mins: number | null): string {
  if (!mins) return '';
  if (mins < 60) return `Approx. ${mins} min.`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `Approx. ${h}h ${m}m.` : `Approx. ${h}h.`;
}

export default function ResourceCard({ resource }: Props) {
  const badgeColor   = RESOURCE_TYPE_COLORS[resource.type];
  const typeLabel    = RESOURCE_TYPE_LABELS[resource.type];
  const thumbnailSrc = resource.thumbnail_url || CATEGORY_CARD_IMAGE[resource.type] || null;
  const shortLabel   = typeLabel?.split(' / ')[0] ?? typeLabel;

  return (
    <Link href={`/resource/${resource.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
      <article style={{
        background: 'var(--card-bg)', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)', overflow: 'hidden',
        height: '100%', display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.18s, transform 0.18s',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.13)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        {/* Thumbnail */}
        <div style={{ position: 'relative', height: '160px', flexShrink: 0, background: `${badgeColor}18` }}>
          {thumbnailSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailSrc}
              alt={resource.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          {/* Type badge bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: badgeColor, padding: '5px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
              {shortLabel}
            </span>
            {resource.is_naadac_ce && (
              <span style={{
                background: 'rgba(255,255,255,0.25)', color: '#fff',
                fontSize: '10px', fontWeight: 700,
                padding: '1px 6px', borderRadius: '3px',
              }}>CE</span>
            )}
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{
            fontSize: '14px', fontWeight: 700, lineHeight: 1.35,
            marginBottom: '6px', color: 'var(--text-primary)',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {resource.title}
          </h3>
          <p style={{
            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5,
            flex: 1, display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '8px',
          }}>
            {resource.description}
          </p>
          {resource.duration_minutes && (
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginTop: 'auto' }}>
              {formatDuration(resource.duration_minutes)}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
