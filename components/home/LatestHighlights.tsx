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
}

export default function LatestHighlights({
  tiles,
  tileBg = 'var(--fgi-tile)',
  tileBorder = 'rgba(37, 126, 164, 0.18)',
  tileBorderHover = 'rgba(37, 126, 164, 0.28)',
  accent = 'var(--fgi-gold)',
}: Props) {
  if (!tiles.length) return null;

  return (
    <div style={{
      position: 'relative',
      zIndex: 2,
      maxWidth: '1060px',
      margin: '-95px auto 0',
      padding: '0 2rem',
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

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${tiles.length}, 1fr)`,
          gap: '1.25rem',
        }}>
          {tiles.map(tile => (
            <Link
              key={tile.label}
              href={tile.href}
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
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.75)',
                boxShadow: '0 2px 6px rgba(30,70,90,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Image
                  src={tile.icon}
                  alt=""
                  width={800}
                  height={450}
                  style={{ width: '54px', height: 'auto' }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '12.5px', fontWeight: 600, color: accent,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  lineHeight: 1.2, marginBottom: '4px',
                  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                }}>
                  <span>{tile.label}</span>
                  {tile.naadac && (
                    // Same pill as the library card's illustration overlay
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
                      color: '#ffffff', background: 'var(--fgi-blue)',
                      borderRadius: '999px', padding: '2px 8px', lineHeight: 1.4,
                    }}>
                      NAADAC CE
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1.3,
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
