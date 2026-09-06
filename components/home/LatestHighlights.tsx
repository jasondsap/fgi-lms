import Image from 'next/image';
import Link from 'next/link';

export interface HighlightTile {
  label: string;
  title: string;
  href: string;
  icon: string;
  /** Show the NAADAC CE badge beside the category label (8-29-26, Jennifer). */
  naadac?: boolean;
}

/*
 * The white "Latest Highlights" panel from the 8-10-26 mockup. It deliberately
 * overlaps the bottom of the blue hero band, so it is rendered as a sibling of
 * the hero with a negative top margin rather than inside it.
 */
interface Props {
  tiles: HighlightTile[];
  /** Tile fill — cream on the Colorado portal, pale blue on FGI. */
  tileBg?: string;
  tileBorder?: string;
  tileBorderHover?: string;
  /** Colour of the rule beside the heading (and the tile category labels). */
  accent?: string;
  /** Open tiles in a new tab — tenant portals link to FGI resources and must
      not navigate the portal away (Jason 8-31-26). */
  newTab?: boolean;
}

export default function LatestHighlights({
  tiles,
  tileBg = 'var(--fgi-tile)',
  tileBorder = 'rgba(37, 126, 164, 0.18)',
  tileBorderHover = 'rgba(37, 126, 164, 0.28)',
  accent = 'var(--fgi-gold)',
  newTab = false,
}: Props) {
  if (!tiles.length) return null;

  return (
    <div className="highlights gutter" style={{
      position: 'relative',
      zIndex: 2,
      // Full page width (Jennifer 8-30: "expand it to the left") — wider tiles
      // wrap less, so the panel is shorter. The hero overlap (margin) and the
      // phone stacking live in globals.css.
      maxWidth: 'var(--max-width)',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 6px 24px rgba(22,61,91,0.10)',
        padding: '1.35rem 1.75rem 1.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.1rem' }}>
          <span style={{
            width: '4px', height: '22px', background: accent,
            borderRadius: '2px', flexShrink: 0,
          }} />
          <h2 style={{
            fontSize: '24px', fontWeight: 700, fontStyle: 'italic',
            color: 'var(--text-primary)', lineHeight: 1.1,
          }}>
            Latest Highlights
          </h2>
        </div>

        <div className="highlights-grid" style={{ '--cols': tiles.length } as React.CSSProperties}>
          {tiles.map(tile => (
            <Link
              key={tile.label}
              href={tile.href}
              {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="highlight-tile"
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                background: tileBg,
                borderRadius: '10px',
                padding: '12px 16px',
                textDecoration: 'none',
                minHeight: '92px',
                '--tile-border': tileBorder,
                '--tile-border-hover': tileBorderHover,
              } as React.CSSProperties}
            >
              {/* Same illustration box as the SCARR/CO portal card (Jennifer 8-30:
                  "images a bit larger… text like the portals") */}
              <div style={{
                width: '96px', height: '84px', borderRadius: '12px',
                background: '#ffffff', border: '1px solid rgba(37,126,164,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Image
                  src={tile.icon}
                  alt=""
                  width={800}
                  height={450}
                  style={{ width: '92px', height: 'auto' }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                {/* Portal card typography: dark condensed label + smaller title */}
                <div style={{
                  fontSize: '17px', fontWeight: 700, color: '#111111', fontStretch: '75%',
                  lineHeight: 1.2, marginBottom: '3px',
                  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                }}>
                  <span>{tile.label}</span>
                  {tile.naadac && (
                    // Same pill as the library card's illustration overlay
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
                      color: 'var(--fgi-navy)', background: 'var(--fgi-amber)',
                      borderRadius: '999px', padding: '2px 8px', lineHeight: 1.4,
                    }}>
                      NAADAC CE
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '15px', fontStretch: '75%', color: '#222222', lineHeight: 1.3,
                }}>
                  {tile.title}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
