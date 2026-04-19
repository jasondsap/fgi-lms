import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: 'var(--fgi-blue)',
      color: '#ffffff',
    }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '2.5rem 2rem',
        display: 'grid',
        gridTemplateColumns: '220px 160px 1fr',
        gap: '2.5rem',
        alignItems: 'start',
      }}>

        {/* Col 1 — FGI logo + URL + social icons */}
        <div>
          <Image
            src="/images/logos/fgi-logo.png"
            alt="Fletcher Group"
            width={160}
            height={60}
            style={{ objectFit: 'contain', objectPosition: 'left', marginBottom: '10px' }}
          />
          <Link
            href="https://www.fletchergroup.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '13px',
              marginBottom: '16px',
              textDecoration: 'none',
            }}
          >
            www.fletchergroup.org
          </Link>

          {/* Social icons row */}
          <div style={{
            display: 'flex',
            gap: '2px',
            background: '#ffffff',
            borderRadius: '6px',
            padding: '6px 10px',
            width: 'fit-content',
          }}>
            {[
              { href: 'https://www.facebook.com/fletchergroup', label: 'Facebook',  svg: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
              { href: 'https://twitter.com/fletchergroup',      label: 'Twitter/X', svg: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
              { href: 'https://www.linkedin.com/company/fletcher-group', label: 'LinkedIn', svg: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z' },
              { href: 'https://wa.me/1fletchergroup',           label: 'WhatsApp',  svg: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
            ].map(({ href, label, svg }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  color: 'var(--fgi-blue)',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width={18}
                  height={18}
                >
                  <path d={svg} />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Col 2 — RCORP badge + HRSA URL */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4px' }}>
          <Image
            src="/images/logos/rcorp-badge.png"
            alt="RCORP"
            width={80}
            height={80}
            style={{ objectFit: 'contain', opacity: 0.9, marginBottom: '10px' }}
          />
          <Link
            href="https://www.hrsa.gov"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            www.hrsa.gov
          </Link>
        </div>

        {/* Col 3 — HRSA Disclaimer */}
        <div>
          <div style={{
            fontWeight: 700,
            fontSize: '15px',
            marginBottom: '10px',
            color: '#ffffff',
          }}>
            HRSA Disclaimer
          </div>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.7,
            textAlign: 'justify',
          }}>
            This website is supported by the Health Resources and Services Administration (HRSA) of the
            U.S. Department of Health and Human Services (HHS) as part of an award totaling $3.3 million,
            with 0% financed with non-governmental sources. The contents are those of the author(s) and do
            not necessarily represent the official views of, nor an endorsement, by HRSA, HHS, or the
            U.S. Government.
          </p>
        </div>

      </div>
    </footer>
  );
}
