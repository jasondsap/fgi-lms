import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--fgi-blue)', color: '#ffffff' }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '1.75rem 2rem',   /* slimmer than before */
        display: 'grid',
        gridTemplateColumns: '240px 1fr 200px',
        gap: '2rem',
        alignItems: 'center',
      }}>

        {/* Col 1 — FGI logo + URL + social icons */}
        <div>
          <Image
            src="/images/logos/fgi-logo.png"
            alt="Fletcher Group"
            width={160}
            height={56}
            style={{ objectFit: 'contain', objectPosition: 'left', marginBottom: '8px' }}
          />
          <Link
            href="https://www.fletchergroup.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              color: 'rgba(255,255,255,0.82)',
              fontSize: '13px',
              marginBottom: '14px',
              textDecoration: 'none',
            }}
          >
            www.fletchergroup.org
          </Link>

          {/* Social icons — white SVG, no box, FB + LinkedIn only */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link
              href="https://www.facebook.com/FletcherGroupInc"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
                fill="white">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
              </svg>
            </Link>
            <Link
              href="https://www.linkedin.com/company/fletcher-group-inc"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
                fill="white">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </Link>
          </div>
        </div>

        {/* Col 2 — HRSA Disclaimer centered */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
            HRSA Disclaimer
          </div>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.82)',
            lineHeight: 1.65,
            maxWidth: '560px',
            margin: '0 auto',
          }}>
            This website is supported by the Health Resources and Services Administration (HRSA) of the
            U.S. Department of Health and Human Services (HHS) as part of an award totaling $3.3 million,
            with 0% financed with non-governmental sources. The contents are those of the author(s) and
            do not necessarily represent the official views of, nor an endorsement, by HRSA, HHS, or the
            U.S. Government.
          </p>
        </div>

        {/* Col 3 — RCORP badge + HRSA URL (moved right) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Image
            src="/images/logos/rcorp-badge.png"
            alt="RCORP"
            width={88}
            height={88}
            style={{ objectFit: 'contain', opacity: 0.9 }}
          />
          <Link
            href="https://www.hrsa.gov"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.82)', fontSize: '13px', textDecoration: 'none' }}
          >
            www.hrsa.gov
          </Link>
        </div>

      </div>
    </footer>
  );
}
