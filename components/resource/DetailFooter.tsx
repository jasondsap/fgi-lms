import Link from 'next/link';

/**
 * Slim footer for detail pages. These render outside the (main) route group,
 * so they don't get the Partners + Footer blocks — this stands in for them.
 */
export default function DetailFooter() {
  return (
    <footer style={{
      borderTop: '1px solid #e8e8e8',
      padding: '1.25rem 2rem',
      background: '#ffffff',
      marginTop: '2rem',
    }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* FGI logo + URL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logos/fgi-logo.png"
            alt="Fletcher Group"
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          />
          <Link
            href="https://www.fletchergroup.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '13px', color: 'var(--fgi-blue)', textDecoration: 'none' }}
          >
            www.fletchergroup.org
          </Link>
        </div>

        {/* Support email */}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          For Support Email:{' '}
          <a href="mailto:LC@fletchergroup.org" style={{ color: 'var(--fgi-blue)' }}>
            LC@fletchergroup.org
          </a>
        </div>

        {/* Social icons */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <Link href="https://www.facebook.com/FletcherGroupInc" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#0e72a2">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
            </svg>
          </Link>
          <Link href="https://www.linkedin.com/company/fletcher-group-inc" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#0e72a2">
              <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
              <circle cx="4" cy="4" r="2"/>
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  );
}
