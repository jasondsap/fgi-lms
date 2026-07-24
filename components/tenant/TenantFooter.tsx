import Image from 'next/image';
import Link from 'next/link';
import type { TenantConfig, TenantSocialPlatform } from '@/lib/tenants';

const SOCIAL_PATHS: Record<TenantSocialPlatform, React.ReactNode> = {
  facebook: <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />,
  linkedin: (
    <>
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.4" />
    </>
  ),
};

export default function TenantFooter({ tenant }: { tenant: TenantConfig }) {
  const f = tenant.footer;
  return (
    <footer style={{
      background: f.bg,
      color: '#ffffff',
      borderTop: `5px solid ${tenant.accent}`,
    }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '2.5rem 2rem 2rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr 1.2fr',
          gap: '2rem',
          alignItems: 'start',
        }}>
          {/* Col 1 — logo + website */}
          <div>
            <Image
              src={tenant.logoWhite}
              alt={tenant.logoAlt}
              width={170}
              height={110}
              style={{ objectFit: 'contain', objectPosition: 'left top', width: 'auto', height: 'auto', maxHeight: '110px', marginBottom: '14px' }}
            />
            <div>
              <Link href={f.websiteUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: '#ffffff', fontSize: '15px', textDecoration: 'none' }}>
                {f.websiteLabel}
              </Link>
            </div>
          </div>

          {/* Col 2 — Stay Connected */}
          <div style={{
            border: `1.5px solid ${tenant.accent}`,
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem 1.35rem',
            justifySelf: 'center',
            minWidth: '190px',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', marginBottom: '0.85rem' }}>
              Stay Connected
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, textAlign: 'center', marginBottom: '10px' }}>
              Follow Us
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {f.socials.map((s) => (
                <Link
                  key={s.platform}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.platform}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: tenant.accent, color: tenant.primary, flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    {SOCIAL_PATHS[s.platform]}
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3 — contact block */}
          <div
            style={{ fontSize: '15px', lineHeight: 1.6, justifySelf: 'end' }}
            className="tenant-contact"
          >
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>{f.orgName}</div>
            <div dangerouslySetInnerHTML={{ __html: f.contactHtml }} />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '17px', fontWeight: 700 }}>
          For Learning Center Support Contact{' '}
          <a href="mailto:LC@fletchergroup.org" style={{ color: tenant.accent }}>
            LC@fletchergroup.org
          </a>
        </div>
      </div>
    </footer>
  );
}
