import Image from 'next/image';
import Link from 'next/link';
import Partners from './Partners';
import ContactButton from './ContactButton';
import { AmazonIcon, AppleIcon, AudibleIcon, SpotifyIcon } from '@/components/BrandIcons';
import { PODCAST_FALLBACK_URL, PODCAST_PLATFORMS } from '@/lib/podcast';

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
        background: 'var(--fgi-gold)', color: 'var(--fgi-navy)', flexShrink: 0,
      }}
    >
      {children}
    </Link>
  );
}

/* Small inline glyphs (web / location / email) — per Jennifer, these replace
   the underlines that used to mark the contact details as links. */
function InlineGlyph({ path, size = 16 }: { path: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }} aria-hidden="true"
    >
      {path}
    </svg>
  );
}

const GLOBE = (
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </>
);

const MAP_PIN = (
  <>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </>
);

const MAIL = (
  <>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </>
);

/*
 * Recovery Ecosystem Radio platform URLs live in lib/podcast.ts (one edit
 * updates the footer and the podcast shell together). Until Jennifer supplies
 * a listing, its icon points at the podcast section of our own library.
 */
const podcastHref = (key: string) =>
  PODCAST_PLATFORMS.find((p) => p.key === key)?.url ?? PODCAST_FALLBACK_URL;

export default function Footer() {
  return (
    <>
      {/* ── In Partnership With — above the navy block in the 8-10-26 mockup ── */}
      <Partners />

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
            gridTemplateColumns: '0.8fr 1.7fr 1.1fr',
            gap: '2rem',
            alignItems: 'start',
          }}>

            {/* Col 1 — logo + tagline + site URL */}
            <div>
              <Image
                src="/images/logos/fgi-logo-transparent.png"
                alt="Fletcher Group"
                width={190}
                height={50}
                style={{ objectFit: 'contain', objectPosition: 'left', marginBottom: '6px' }}
              />
              <Link
                href="https://www.fletchergroup.org"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#ffffff', fontSize: '16px', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  marginTop: '1.25rem', marginBottom: '2rem',
                }}
              >
                <InlineGlyph path={GLOBE} />
                www.fletchergroup.org
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px' }}>Need Platform Help?</span>
                <ContactButton fontSize="16px" />
              </div>
            </div>

            {/* Col 2 — Follow Us stacked over the podcast platforms; the
                outline hugs the content per Jennifer's 8-17-26 feedback. */}
            <div style={{
              border: '1.5px solid #ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.75rem 1.35rem',
              justifySelf: 'center',
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
              alignItems: 'center',
            }}>
              {/* Follow Us */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', whiteSpace: 'nowrap' }}>
                  Follow Us
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
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
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', whiteSpace: 'nowrap' }}>
                  Recovery Ecosystem Radio Podcast
                </div>
                {/* Real brand marks from Jennifer's LMS Icons drop —
                    shared with the podcast shell via BrandIcons.tsx. */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <IconCircle href={podcastHref('spotify')} label="Listen on Spotify">
                    <SpotifyIcon size={22} />
                  </IconCircle>
                  <IconCircle href={podcastHref('apple')} label="Listen on Apple Podcasts">
                    <AppleIcon size={22} />
                  </IconCircle>
                  <IconCircle href={podcastHref('amazon')} label="Listen on Amazon Music">
                    <AmazonIcon size={22} />
                  </IconCircle>
                  <IconCircle href={podcastHref('audible')} label="Listen on Audible">
                    <AudibleIcon size={22} />
                  </IconCircle>
                </div>
              </div>
            </div>

            {/* Col 3 — office locations */}
            <div style={{ fontSize: '16px', lineHeight: 1.7, justifySelf: 'end' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <InlineGlyph path={MAP_PIN} />
                  <span>Kentucky Location:</span>
                </div>
                <div style={{ paddingLeft: '24px' }}>
                  <div>601 Meyers Baker Road, Suite 238</div>
                  <div>London, Kentucky 40741</div>
                </div>
                <a
                  href="mailto:info@fletchergroup.org"
                  style={{
                    color: '#ffffff', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    marginTop: '2px',
                  }}
                >
                  <InlineGlyph path={MAIL} />
                  info@fletchergroup.org
                </a>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <InlineGlyph path={MAP_PIN} />
                  <span>Florida Location:</span>
                </div>
                <div style={{ paddingLeft: '24px' }}>
                  <div>423 E Macewen Drive</div>
                  <div>Osprey, Florida 34229</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </footer>

      {/* ── RCORP / HRSA disclaimer ── */}
      <section style={{ background: '#ffffff', color: 'var(--text-primary)' }}>
        <div style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          padding: '1.5rem 2rem 1.75rem',
        }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            gap: '2rem', flexWrap: 'wrap', marginBottom: '0.9rem',
          }}>
            <p style={{ fontSize: '17px' }}>
              Fletcher Group is a RCORP Rural Center of Excellence in Substance Use Disorder Recovery
            </p>
            <Link
              href="https://www.hrsa.gov"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-primary)', fontSize: '18px', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              <InlineGlyph path={GLOBE} />
              www.hrsa.org
            </Link>
          </div>

          <p style={{ fontSize: '14px', lineHeight: 1.55 }}>
            The Learning Center is supported by the Health Resources and Services Administration
            (HRSA) of the U.S. Department of Health and Human Services (HHS) as part of an award
            totaling $3.3 million, with 0% financed with non-governmental sources. The contents are
            those of the author(s) and do not necessarily represent the official views of, nor an
            endorsement, by HRSA, HHS, or the U.S. Government.
          </p>
        </div>
      </section>
    </>
  );
}
