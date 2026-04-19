import Image from 'next/image';
import Link from 'next/link';

const PARTNERS = [
  { file: 'partner-naadac',     alt: 'NAADAC Approved Education Provider', width: 80,  height: 80  },
  { file: 'partner-elevenlabs', alt: 'IIElevenLabs',                       width: 130, height: 48  },
  { file: 'partner-par',        alt: 'PAR — People Advocating Recovery',   width: 110, height: 56  },
  { file: 'partner-marr',       alt: 'MARR — Michigan Association of Recovery Resources', width: 110, height: 56 },
  { file: 'partner-ohio-rh',    alt: 'Ohio Recovery Housing Colorado',     width: 100, height: 72  },
  { file: 'partner-scarr',      alt: 'SCARR — South Carolina Alliance for Recovery Residences', width: 100, height: 72 },
];

export default function Partners() {
  return (
    <section style={{
      background: '#ffffff',
      borderTop: '1px solid #e8e8e8',
      padding: '2.5rem 2rem',
    }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '0',
      }}>

        {/* Left: heading + logos */}
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '1.5rem',
          }}>
            Working Together With
          </h2>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2.5rem',
            flexWrap: 'wrap',
          }}>
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
        </div>

        {/* Right: Collaborate CTA button */}
        <div style={{ flexShrink: 0, marginLeft: '2rem' }}>
          <Link
            href="mailto:LC@fletchergroup.org"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--fgi-blue)',
              color: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              width: '130px',
              height: '130px',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: 1.4,
              textDecoration: 'none',
              padding: '1rem',
            }}
          >
            Collaborate With Us? Click here to send us an email
          </Link>
        </div>

      </div>
    </section>
  );
}
