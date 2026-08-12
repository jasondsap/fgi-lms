import Image from 'next/image';

/*
 * Right-hand side of the 8-10-26 homepage hero: the "Who We Are" video sitting
 * on a water-ripple graphic, under an arc of "WHO WE ARE", with two circular
 * photos and three decorative dots floating to its right.
 *
 * Everything is positioned as a percentage of a 470 x 410 box, which is the
 * region the mockup gives this artwork (measured off the PDF in points), so
 * the whole composition scales with the column instead of drifting apart.
 */

const W = 470;
const H = 410;
const pct = (n: number, of: number) => `${(n / of) * 100}%`;

/** Circular photo with a coloured ring, e.g. the key and the mountaintop. */
function PhotoBubble({ src, alt, cx, cy, r, ring, ringWidth }: {
  src: string; alt: string; cx: number; cy: number; r: number;
  ring: string; ringWidth: number;
}) {
  return (
    <div style={{
      position: 'absolute',
      left: pct(cx - r, W),
      top: pct(cy - r, H),
      width: pct(r * 2, W),
      aspectRatio: '1 / 1',
      borderRadius: '50%',
      border: `${ringWidth}px solid ${ring}`,
      overflow: 'hidden',
      boxShadow: '0 3px 10px rgba(22,61,91,0.18)',
    }}>
      <Image
        src={src}
        alt={alt}
        width={360}
        height={360}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}

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

export default function HeroVisual() {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}` }}>

      {/* Water ripple — sits behind everything else. The asset is cropped to
          the swirl's own alpha bounds, so `width` IS the swirl diameter: 350
          units centred at (214, 203), i.e. roughly level with the video rather
          than floating above it. The mockup draws it rotated ~18 degrees
          anticlockwise, which is what gives the rings their sweep. */}
      <Image
        src="/images/home/water-ripple.webp"
        alt=""
        width={880}
        height={857}
        style={{
          position: 'absolute',
          left: pct(214 - 350 / 2, W),
          top: pct(203 - 341 / 2, H),
          width: pct(350, W),
          height: 'auto',
          transform: 'rotate(-18.3deg)',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* "WHO WE ARE" arc. The path is the circle the mockup's letters sit on:
          centre (229, 185), radius 130, in the same 470 x 410 coordinate space. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        aria-hidden
      >
        <path id="whoWeAreArc" d="M 99 185 A 130 130 0 0 1 359 185" fill="none" />
        <text
          fill="var(--fgi-blue)"
          fontSize="31"
          fontFamily="var(--font-sans)"
          letterSpacing="0"
        >
          <textPath href="#whoWeAreArc" startOffset="50%" textAnchor="middle">
            WHO WE ARE
          </textPath>
        </text>
      </svg>

      {/* Who We Are video, in its navy frame */}
      <div style={{
        position: 'absolute',
        left: pct(14, W),
        top: pct(137, H),
        width: pct(288, W),
        border: '5px solid var(--fgi-navy)',
        borderRadius: '14px',
        background: 'var(--fgi-navy)',
        boxShadow: '0 4px 16px rgba(22,61,91,0.20)',
      }}>
        <div style={{
          position: 'relative', paddingTop: '56.25%',
          overflow: 'hidden', background: '#111', borderRadius: '7px',
        }}>
          <iframe
            src="https://player.vimeo.com/video/1181685318?h=3d4673b6ea&badge=0&autopause=0&player_id=0&app_id=58479"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            title="FGI Who We Are"
          />
        </div>
      </div>

      <PhotoBubble
        src="/images/home/hero-key.webp"
        alt="A key with a house keyring in a front door"
        cx={408} cy={92} r={39}
        ring="var(--fgi-teal)" ringWidth={3}
      />
      <PhotoBubble
        src="/images/home/hero-mountaintop.webp"
        alt="One hiker helping another up to a mountaintop"
        cx={400} cy={238} r={50}
        ring="var(--fgi-blue)" ringWidth={4}
      />

      <Dot cx={324} cy={23}  r={10.5} color="#eec87a" />
      <Dot cx={480} cy={116} r={7.2}  color="#eec87a" />
      <Dot cx={452} cy={160} r={18}   color="#4fb8e8" />
    </div>
  );
}
