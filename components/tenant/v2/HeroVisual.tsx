import Image from 'next/image';
import type { TenantConfig } from '@/lib/tenants';

/*
 * Right-hand side of the v2 tenant hero: a framed photo sitting on a halftone
 * dot ring, with three accent dots floating to its right.
 *
 * Same coordinate trick as the FGI HeroVisual — everything is a percentage of
 * the 470 x 410 box the mockup gives this artwork (measured off the PDF in
 * points, with the hero band's top-left as the origin) — so the composition
 * scales with the column instead of drifting apart.
 */

const W = 470;
const H = 410;
const pct = (n: number, of: number) => `${(n / of) * 100}%`;

/** The mockup frames the photo in FGI's slate navy, not the tenant's own. */
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
  const photo = v2.heroPhoto;

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}` }}>

      {/* Halftone dot ring — centred at (209, 178), 287 units across */}
      <Image
        src={v2.heroDots}
        alt=""
        width={900}
        height={894}
        style={{
          position: 'absolute',
          left: pct(209 - 287 / 2, W),
          top: pct(178 - 285 / 2, H),
          width: pct(287, W),
          height: 'auto',
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />

      {/* Framed photo */}
      <div style={{
        position: 'absolute',
        left: pct(21.8, W),
        top: pct(108.1, H),
        width: pct(277.5, W),
        border: `6px solid ${FRAME}`,
        borderRadius: '16px',
        overflow: 'hidden',
        lineHeight: 0,
        boxShadow: '0 4px 16px rgba(0,25,112,0.18)',
      }}>
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          style={{ width: '100%', height: 'auto' }}
          priority
        />
      </div>

      <Dot cx={348}   cy={97}    r={10.6} color={tenant.accent} />
      <Dot cx={415.7} cy={184.6} r={7.2}  color={tenant.accent} />
      <Dot cx={365.1} cy={278.4} r={16.4} color={tenant.primary} />
    </div>
  );
}
