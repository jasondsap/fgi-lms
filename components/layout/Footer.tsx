import Image from 'next/image';
import Link from 'next/link';
import Partners from './Partners';

/* Circular icon button used in the "Stay Connected" box. */
function IconCircle({ href, label, children }: {
  href: string; label: string; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '38px', height: '38px', borderRadius: '50%',
        background: 'var(--fgi-blue)', color: 'var(--fgi-navy)', flexShrink: 0,
      }}
    >
      {children}
    </Link>
  );
}

/*
 * TODO (Jennifer): real Recovery Ecosystem Radio platform URLs. Until they
 * arrive every podcast icon points at the FGI podcast page.
 */
const PODCAST_URL = 'https://www.fletchergroup.org';

export default function Footer() {
  return (
    <>
      {/* ── Contact / Stay Connected ── */}
      <footer style={{
        backgroundColor: 'var(--fgi-navy)',
        color: '#ffffff',
        borderTop: '6px solid var(--fgi-teal)',
      }}>
        <div style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          padding: '2.5rem 2rem 2rem',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '2.5rem',
            alignItems: 'start',
          }}>

            {/* Col 1 — logo + tagline + site URL */}
            <div>
              <Image
                src="/images/logos/fgi-logo-transparent.png"
                alt="Fletcher Group"
                width={220}
                height={58}
                style={{ objectFit: 'contain', objectPosition: 'left', marginBottom: '6px' }}
              />
              <div style={{
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '1.6px',
                textTransform: 'uppercase',
                marginBottom: '18px',
              }}>
                Building Recovery Ecosystems
              </div>
              <Link
                href="https://www.fletchergroup.org"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#ffffff', fontSize: '15px', textDecoration: 'none' }}
              >
                www.fletchergroup.org
              </Link>
            </div>

            {/* Col 2 — Stay Connected box */}
            <div style={{
              border: '1.5px solid var(--fgi-teal)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem 1.35rem',
            }}>
              <div style={{
                fontSize: '18px', fontWeight: 700, textAlign: 'center', marginBottom: '1rem',
              }}>
                Stay Connected
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem',
                alignItems: 'start', justifyItems: 'center',
              }}>
                {/* Follow Us */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
                    Follow Us
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <IconCircle href="https://www.facebook.com/FletcherGroupInc" label="Facebook">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                      </svg>
                    </IconCircle>
                    <IconCircle href="https://www.linkedin.com/company/fletcher-group-inc" label="LinkedIn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                        <circle cx="4" cy="4" r="2" />
                      </svg>
                    </IconCircle>
                  </div>
                </div>

                {/* Recovery Ecosystem Radio */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', lineHeight: 1.35 }}>
                    Recovery Ecosystem<br />Radio Podcast
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <IconCircle href={PODCAST_URL} label="Listen — audio">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="9" width="2.5" height="6" rx="1.2" />
                        <rect x="8.5" y="5" width="2.5" height="14" rx="1.2" />
                        <rect x="13" y="7" width="2.5" height="10" rx="1.2" />
                        <rect x="17.5" y="10" width="2.5" height="4" rx="1.2" />
                      </svg>
                    </IconCircle>
                    <IconCircle href={PODCAST_URL} label="Listen — podcast app">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 14v-2a8 8 0 0116 0v2" />
                        <rect x="2.5" y="13.5" width="4" height="6.5" rx="2" fill="currentColor" stroke="none" />
                        <rect x="17.5" y="13.5" width="4" height="6.5" rx="2" fill="currentColor" stroke="none" />
                      </svg>
                    </IconCircle>
                    <IconCircle href={PODCAST_URL} label="Listen — music app">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3l-9 2v10.2A3.5 3.5 0 108 18V8.2l9-2z" />
                      </svg>
                    </IconCircle>
                    <IconCircle href={PODCAST_URL} label="Listen — streaming">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="5.5" />
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                      </svg>
                    </IconCircle>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3 — office locations */}
            <div style={{ fontSize: '15px', lineHeight: 1.6, justifySelf: 'end' }}>
              <div style={{ marginBottom: '1.1rem' }}>
                <div>Kentucky Location:</div>
                <div>601 Meyers Baker Road, Suite 238</div>
                <div>London, Kentucky 40741</div>
                <a href="mailto:info@fletchergroup.org" style={{ color: '#ffffff', textDecoration: 'none' }}>
                  info@fletchergroup.org
                </a>
              </div>
              <div>
                <div>Florida Location:</div>
                <div>423 E Macewen Drive</div>
                <div>Osprey, Florida 34229</div>
              </div>
            </div>
          </div>

          {/* Support line */}
          <div style={{
            textAlign: 'center', marginTop: '2rem',
            fontSize: '17px', fontWeight: 700,
          }}>
            For Learning Center Support Contact{' '}
            <a href="mailto:LC@fletchergroup.org" style={{ color: 'var(--fgi-teal)' }}>
              LC@fletchergroup.org
            </a>
          </div>
        </div>
      </footer>

      {/* ── In Partnership With ── */}
      <Partners />

      {/* ── RCORP / HRSA disclaimer ── */}
      <section style={{ background: 'var(--fgi-navy)', color: '#ffffff' }}>
        <div style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          padding: '2.25rem 2rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3rem',
          alignItems: 'start',
        }}>
          <div>
            <p style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Fletcher Group is a RCORP Rural Center of Excellence in Substance Use Disorder Recovery
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
              <Image
                src="/images/logos/rcorp-badge.png"
                alt="RCORP"
                width={104}
                height={104}
                style={{ objectFit: 'contain' }}
              />
              <Link
                href="https://www.hrsa.gov"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#ffffff', fontSize: '16px', textDecoration: 'none' }}
              >
                www.hrsa.org
              </Link>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '15px', marginBottom: '1.25rem' }}>HRSA Disclaimer</div>
            <p style={{ fontSize: '15px', lineHeight: 1.6, textAlign: 'justify' }}>
              This website is supported by the Health Resources and Services Administration (HRSA) of the
              U.S. Department of Health and Human Services (HHS) as part of an award totaling $3.3 million,
              with 0% financed with non-governmental sources. The contents are those of the author(s) and
              do not necessarily represent the official views of, nor an endorsement, by HRSA, HHS, or the
              U.S. Government.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
