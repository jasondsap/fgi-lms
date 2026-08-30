'use client';
import Link from 'next/link';
import type { Resource } from '@/types';
import { RESOURCE_TYPE_LABELS } from '@/types';

export interface NaadacPillStyle { bg: string; fg: string }

interface Props {
  resource: Resource;
  /** '' on FGI, '/colorado' or '/scarr' — keeps the visitor on their surface. */
  basePath?: string;
  /** Tenant colour for the NAADAC CE overlay (SCARR yellow, Jennifer 8-29). */
  naadacPill?: NaadacPillStyle;
  /** Signed-in learner has completed this course — shows the checkmark badge. */
  completed?: boolean;
}

/*
 * Jennifer's 8-11-26 illustration set — twelve flat, transparent-background
 * drawings on a shared 16:9 canvas, so `contain` places every one of them at
 * the same scale inside the card's illustration band.
 *
 * Three types have no drawing of their own and borrow the nearest one
 * (Jason, 8-11): NAADAC CE reuses the course laptop and Whitepaper reuses the
 * publication stack. FGI Services has no equivalent at all and keeps its
 * 7-22-26 photo, so it is the one card in the grid still using the old style.
 */
const CATEGORY_CARD_IMAGE: Record<string, string> = {
  course:        '/images/category-cards/course.webp',
  naadac_ce:     '/images/category-cards/course.webp',
  toolkit:       '/images/category-cards/learning.webp',
  guidebook:     '/images/category-cards/guidebook.webp',
  handbook:      '/images/category-cards/certification.webp',
  webinar:       '/images/category-cards/webinar.webp',
  newsletter:    '/images/category-cards/newsletter.webp',
  video:         '/images/category-cards/video.webp',
  podcast:       '/images/category-cards/podcast.webp',
  paper:         '/images/category-cards/publication.webp',
  whitepaper:    '/images/category-cards/publication.webp',
  infographic:   '/images/category-cards/infographic.webp',
  success_story: '/images/category-cards/success-story.webp',
  non_fgi:       '/images/category-cards/recommendations.webp',
  fgi_service:   '/images/category-cards/fgi-services.png',
};

/** Types still on a photo rather than a transparent illustration. */
const PHOTO_TYPES = new Set(['fgi_service']);

export default function ResourceCard({ resource, basePath = '', naadacPill, completed }: Props) {
  const typeLabel    = RESOURCE_TYPE_LABELS[resource.type] ?? resource.type;
  const thumbnailSrc = resource.thumbnail_url || CATEGORY_CARD_IMAGE[resource.type] || null;

  // Illustrations are drawn to fit their canvas, so they must not be cropped;
  // an editor-supplied photo still fills the band edge to edge.
  const fitsBand = Boolean(resource.thumbnail_url) || PHOTO_TYPES.has(resource.type);

  return (
    <Link
      href={`${basePath}/resource/${resource.slug}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <article
        style={{
          background: 'var(--fgi-band)',
          borderRadius: '14px',
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'box-shadow 0.18s, transform 0.18s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 22px rgba(22,61,91,0.14)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        {/* Illustration band — shorter than the source 16:9 canvas, which is
            what centres each drawing with air around it (8-10-26 mockup) */}
        <div style={{
          position: 'relative',
          aspectRatio: '16 / 7',
          flexShrink: 0,
          background: 'var(--fgi-card-face)',
          overflow: 'hidden',
        }}>
          {thumbnailSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailSrc}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: fitsBand ? 'cover' : 'contain',
                display: 'block',
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null}

          {/* NAADAC CE overlay — top-right of the illustration; tenants can
              recolour it (SCARR yellow) */}
          {resource.is_naadac_ce && (
            <span style={{
              position: 'absolute', top: '10px', right: '10px',
              // 8-30-26 (Jason): amber #f2b134 everywhere, navy text
              background: naadacPill?.bg ?? 'var(--fgi-amber)', color: naadacPill?.fg ?? 'var(--fgi-navy)',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
              padding: '3px 8px', borderRadius: '20px',
            }}>
              NAADAC CE
            </span>
          )}

          {/* Completed checkmark — top-left, from the learner's My Learning
              progress (Jennifer 8-29: "see on the face card what they have
              completed") */}
          {completed && (
            <span
              title="Completed"
              aria-label="Completed"
              style={{
                position: 'absolute', top: '10px', left: '10px',
                width: '26px', height: '26px', borderRadius: '50%',
                background: '#1e8e3e', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: 700, lineHeight: 1,
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }}
            >
              ✓
            </span>
          )}
        </div>

        {/* Card body */}
        <div style={{ padding: '14px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Type pill — navy for every type (8-10-26 mockup replaced the
              per-type brand colour bar with a single pill) */}
          <span style={{
            alignSelf: 'flex-start',
            background: 'var(--fgi-navy)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            lineHeight: 1.2,
            padding: '6px 15px',
            borderRadius: '999px',
            marginBottom: '12px',
          }}>
            {typeLabel}
          </span>
          {resource.internal && (
            <span title="Visible to administrators only" style={{
              alignSelf: 'flex-start', marginTop: '-6px', marginBottom: '12px',
              background: '#b13f08', color: '#ffffff', fontSize: '12px', fontWeight: 700,
              lineHeight: 1.2, padding: '4px 11px', borderRadius: '999px', letterSpacing: '0.03em',
            }}>
              INTERNAL
            </span>
          )}

          {/* Title */}
          <h3 style={{
            fontSize: '17px',
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: '10px',
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
            fontSize: '14px',
            color: 'var(--text-body-dark)',
            lineHeight: 1.55,
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '8px',
          }}>
            {resource.description}
          </p>

          {/* Duration line removed from every card (Jennifer 8-30, consistency
              across items with and without a duration); the shells still show
              "Approx. N min." in their facts box. */}
        </div>
      </article>
    </Link>
  );
}
