import Image from 'next/image';
import Link from 'next/link';

const PARTNERS = [
  { file: 'partner-naadac',     alt: 'NAADAC Approved Education Provider', width: 80,  height: 80  },
  { file: 'partner-elevenlabs', alt: 'IIElevenLabs',                       width: 130, height: 48  },
  { file: 'partner-par',        alt: 'PAR — People Advocating Recovery',   width: 110, height: 56  },
  { file: 'partner-marr',       alt: 'MARR — Michigan Association of Recovery Resources', width: 110, height: 56 },
  { file: 'partner-ohio-rh',    alt: 'Ohio Recovery Housing Colorado',     width: 100, height: 72  },
  { file: 'partner-scarr',      alt: 'SCARR — South Carolina Alliance for Recovery Residences', width: 100, height: 72 },
  // TODO (Jason): the 8-10-26 mockup adds a seventh logo, Webberized. No
  // artwork for it was supplied in the drop, so the row is still six wide.
];

export default function Partners() {
  return (
    <section style={{
      background: '#ffffff',
      padding: '2.75rem 2rem 3rem',
    }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--fgi-navy)',
          marginBottom: '1.75rem',
        }}>
          In Partnership With
        </h2>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {PARTNERS.map(({ file, alt, width, height }) => (
              <div key={file} style={{ flexShrink: 0 }}>
                <Image
                  src={`/images/logos/${file}.png`}
                  alt={alt}
                  width={width}
                  height={height}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>

          {/* Partner-with-us call to action (8-10-26 mockup) */}
          <div style={{ marginLeft: 'auto', textAlign: 'left' }}>
            <div style={{
              fontSize: '19px', fontWeight: 700, color: 'var(--fgi-navy)',
              lineHeight: 1.35, marginBottom: '0.9rem', maxWidth: '20ch',
            }}>
              Interested in Partnering or Have an Idea to Share?
            </div>
            <Link
              href="mailto:LC@fletchergroup.org"
              style={{
                display: 'inline-block',
                background: 'var(--fgi-blue)',
                color: '#ffffff',
                fontSize: '18px',
                textDecoration: 'none',
                padding: '10px 26px',
                borderRadius: '999px',
              }}
            >
              Get in Touch!
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
