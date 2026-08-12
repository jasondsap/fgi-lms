import Image from 'next/image';
import Link from 'next/link';

export interface HighlightTile {
  label: string;
  title: string;
  href: string;
  icon: string;
}

/*
 * The white "Latest Highlights" panel from the 8-10-26 mockup. It deliberately
 * overlaps the bottom of the blue hero band, so it is rendered as a sibling of
 * the hero with a negative top margin rather than inside it.
 */
export default function LatestHighlights({ tiles }: { tiles: HighlightTile[] }) {
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
            width: '4px', height: '22px', background: 'var(--fgi-gold)',
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
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'var(--fgi-tile)',
                border: '1px solid #dcedf7',
                borderRadius: '10px',
                padding: '10px 16px 10px 8px',
                textDecoration: 'none',
                minHeight: '92px',
              }}
            >
              <Image
                src={tile.icon}
                alt=""
                width={800}
                height={450}
                style={{ width: '96px', height: 'auto', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)',
                  lineHeight: 1.25, marginBottom: '4px',
                }}>
                  {tile.label}
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
