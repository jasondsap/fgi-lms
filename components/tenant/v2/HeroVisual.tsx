import Image from 'next/image';
import type { TenantConfig } from '@/lib/tenants';

/*
 * Right-hand side of the v2 tenant hero: a framed photo or video sitting on a
 * halftone dot ring, with three accent dots floating to its right. SCARR also
 * carries a heading above the frame ("Why Certification").
 *
 * Same coordinate trick as the FGI HeroVisual — everything is a percentage of
 * the 470 x 410 box the mockup gives this artwork (measured off the PDF in
 * points, with the hero band's top-left as the origin) — so the composition
 * scales with the column instead of drifting apart. The per-tenant numbers live
 * in `v2.heroLayout`, because Colorado's photo and SCARR's video sit at
 * different heights and the ring follows the frame.
 */

const W = 470;
const H = 410;
const pct = (n: number, of: number) => `${(n / of) * 100}%`;

/** The mockups frame the hero media in FGI's slate navy, not the tenant's own. */
const FRAME = '#163d5b';

function Dot({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <span aria-hidden style={{
      position: 'absolute',
      left: pct(cx - r, W),
      top: pct(cy - r, H),
      width: pct(r * 2, W),
      aspectRatio: '1 / 1',
      borderRadius: '50%',
      background: color,
    }} />
  );
}

export default function TenantHeroVisual({ tenant }: { tenant: TenantConfig }) {
  const v2 = tenant.v2!;
  const { media, ring } = v2.heroLayout;

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}` }}>

      {/* Halftone dot ring, faded so it reads as texture behind the frame */}
      <Image
        src={v2.heroDots}
        alt=""
        width={900}
        height={894}
        style={{
          position: 'absolute',
          left: pct(ring.cx - ring.d / 2, W),
          top: pct(ring.cy - ring.d / 2, H),
          width: pct(ring.d, W),
          height: 'auto',
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />

      {/* Optional heading, centred over the frame */}
      {v2.heroHeading && (
        <h2 style={{
          position: 'absolute',
          left: pct(media.left, W),
          top: pct(Math.max(0, media.top - 62), H),
          width: pct(media.width, W),
          textAlign: 'center',
          fontSize: '43px',
          fontWeight: 400,
          color: tenant.primary,
          lineHeight: 1.1,
          margin: 0,
        }}>
          {v2.heroHeading}
        </h2>
      )}

      {/* Framed photo or video */}
      <div style={{
        position: 'absolute',
        left: pct(media.left, W),
        top: pct(media.top, H),
        width: pct(media.width, W),
        border: `6px solid ${FRAME}`,
        borderRadius: '16px',
        overflow: 'hidden',
        lineHeight: 0,
        background: FRAME,
        boxShadow: '0 4px 16px rgba(0,25,112,0.18)',
      }}>
        {v2.heroMedia.kind === 'photo' ? (
          <Image
            src={v2.heroMedia.src}
            alt={v2.heroMedia.alt}
            width={v2.heroMedia.width}
            height={v2.heroMedia.height}
            style={{ width: '100%', height: 'auto' }}
            priority
          />
        ) : (
          <div style={{ position: 'relative', paddingTop: '56.25%', background: '#111' }}>
            <iframe
              src={v2.heroMedia.embedUrl}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              title={v2.heroMedia.title}
            />
          </div>
        )}
      </div>

      <Dot cx={348}   cy={97}    r={10.6} color={tenant.accent} />
      <Dot cx={415.7} cy={184.6} r={7.2}  color={tenant.accent} />
      <Dot cx={365.1} cy={278.4} r={16.4} color={tenant.primary} />
    </div>
  );
}
