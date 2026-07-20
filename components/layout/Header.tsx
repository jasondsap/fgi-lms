import Link from 'next/link';
import Image from 'next/image';
import AuthNav from './AuthNav';

export default function Header() {
  return (
    <header style={{
      backgroundColor: 'var(--fgi-navy)',
      color: '#ffffff',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
      borderBottom: '6px solid var(--fgi-teal)',
    }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '92px',
      }}>

        {/* FGI logo — 7-18-26 brand mark (cyan flag + white wordmark) */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Image
            src="/images/logos/fgi-logo-transparent.png"
            alt="Fletcher Group"
            width={244}
            height={64}
            style={{ objectFit: 'contain', objectPosition: 'left center' }}
            priority
          />
        </Link>

        {/* Nav links */}
        <nav aria-label="Main navigation" style={{ marginLeft: 'auto' }}>
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

        {/* Account area — hidden until Cognito is configured */}
        <div style={{ flexShrink: 0, marginLeft: '2.25rem' }}>
          <AuthNav />
        </div>

      </div>
    </header>
  );
}
