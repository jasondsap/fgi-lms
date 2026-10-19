import Image from 'next/image';
import Link from 'next/link';

// Nine logos + the CTA on one 1320px line (Jason, 8-31) — widths shaved ~10%
// from the six-logo era and the gaps tightened below to make room.
// Each logo links out to the partner's site in a new tab (Jennifer's
// burn-down row "link to all partners when click logo"; URLs sent 10-19-26).
// HRSA is on her list but has no logo on the strip — the footer disclaimer
// covers it.
const PARTNERS = [
  { file: 'partner-naadac',     alt: 'NAADAC Approved Education Provider', width: 76,  height: 76,  href: 'https://www.naadac.org/' },
  { file: 'partner-elevenlabs', alt: 'IIElevenLabs',                       width: 115, height: 42,  href: 'https://elevenlabs.io/' },
  { file: 'partner-par',        alt: 'PAR — People Advocating Recovery',   width: 100, height: 51,  href: 'https://peopleadvocatingrecovery.org/' },
  { file: 'partner-marr',       alt: 'MARR — Maine Association of Recovery Residences', width: 100, height: 51, href: 'https://www.mainerecoveryresidences.com/' },
  { file: 'partner-ohio-rh',    alt: 'ORH-CO — Recovery Housing Colorado', width: 92,  height: 66,  href: 'https://corecoveryhousing.org/' },
  { file: 'partner-scarr',      alt: 'SCARR — South Carolina Alliance for Recovery Residences', width: 92, height: 66, href: 'https://scarronline.org/' },
  { file: 'partner-marshall',   alt: 'Marshall Health',                    width: 75,  height: 50,  href: 'https://www.marshallhealth.org/' },
  { file: 'partner-webberized', alt: 'Webberized',                         width: 56,  height: 60,  href: 'https://webberized.com/' },
  { file: 'partner-made180',    alt: 'MADE180 Digital Solutions',          width: 130, height: 29,  href: 'https://www.made180.com/' },
];

export default function Partners() {
  return (
    <section className="gutter" style={{
      background: '#ffffff',
      paddingTop: '2.75rem', paddingBottom: '3rem',
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
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {PARTNERS.map(({ file, alt, width, height, href }) => (
              <a
                key={file}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={alt}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', lineHeight: 0 }}
              >
                <Image
                  src={`/images/logos/${file}.png`}
                  alt={alt}
                  width={width}
                  height={height}
                  style={{ objectFit: 'contain' }}
                />
              </a>
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
