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
      padding: '2.5rem 2rem 3rem',
    }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
        <h2 style={{
          fontSize: '30px',
          fontWeight: 700,
          color: 'var(--fgi-navy)',
          marginBottom: '2rem',
        }}>
          In Partnership With
        </h2>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
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

          <Link
            href="mailto:LC@fletchergroup.org"
            style={{
              color: 'var(--fgi-navy)',
              fontSize: '19px',
              fontWeight: 700,
              textDecoration: 'underline',
              marginLeft: 'auto',
            }}
          >
            Interested in Partnering with us?
          </Link>
        </div>
      </div>
    </section>
  );
}
