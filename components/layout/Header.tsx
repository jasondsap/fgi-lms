import Link from 'next/link';
import Image from 'next/image';
import AuthNav from './AuthNav';
import NavLinks from './NavLinks';

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
        justifyContent: 'flex-start',
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

        <NavLinks />

        {/* Help + account area (help "?" icon: Jason, 8-31-26) */}
        <div style={{ flexShrink: 0, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '18px' }}>
          <Link
            href="/help"
            aria-label="Help Center"
            title="Help Center"
            style={{
              width: '27px', height: '27px', borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.85)', color: '#ffffff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, textDecoration: 'none', lineHeight: 1,
            }}
          >
            ?
          </Link>
          <AuthNav />
        </div>

      </div>
    </header>
  );
}
