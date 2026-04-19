import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header style={{
      backgroundColor: 'var(--fgi-blue)',
      color: '#ffffff',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
    }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '80px',
      }}>

        {/* FGI Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Image
            src="/images/logos/fgi-logo.png"
            alt="Fletcher Group — Building Recovery Ecosystems"
            width={170}
            height={64}
            style={{ objectFit: 'contain', objectPosition: 'left center' }}
            priority
          />
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation">
          <ul style={{
            display: 'flex',
            gap: '2.25rem',
            listStyle: 'none',
            alignItems: 'center',
            margin: 0,
            padding: 0,
          }}>
            {[
              { label: 'Home',         href: '/' },
              { label: 'Library',      href: '/library' },
              { label: 'FGI Website',  href: 'https://www.fletchergroup.org', external: true },
              { label: 'TA Request',   href: 'https://airtable.com/appDb16SxhhHo4TeX/page3ondJkFAWb73q/form', external: true },
              { label: 'Mailing List', href: 'https://fletchergroup.us10.list-manage.com/subscribe?u=920c4fe7f0dead37ebaa7057b&id=342805a659', external: true },
            ].map(({ label, href, external }) => (
              <li key={label}>
                <Link
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  style={{
                    color: 'rgba(255,255,255,0.92)',
                    fontSize: '15px',
                    fontWeight: 400,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* RCORP Badge */}
        <Link
          href="https://www.hrsa.gov"
          target="_blank"
          rel="noopener noreferrer"
          style={{ flexShrink: 0, marginLeft: '1.5rem' }}
          aria-label="RCORP — visit HRSA"
        >
          <Image
            src="/images/logos/rcorp-badge.png"
            alt="RCORP"
            width={62}
            height={62}
            style={{ objectFit: 'contain', opacity: 0.9 }}
            priority
          />
        </Link>

      </div>
    </header>
  );
}
