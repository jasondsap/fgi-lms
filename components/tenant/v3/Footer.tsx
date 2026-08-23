import Image from 'next/image';
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

/*
 * v3 tenant footer (8-19-26 SCARR mockup): brand navy; the horizontal lockup
 * and site link on the left with the Learning Center Support pill beneath,
 * the contact block and the outlined Follow Us box on the right.
 */
export default function TenantFooterV3({ tenant }: { tenant: TenantConfig }) {
  const f = tenant.v3!.footer;
  const link = { color: '#ffffff', textDecoration: 'underline' } as const;

  return (
    <footer style={{ background: tenant.primary, color: '#ffffff', padding: '2.5rem 2rem 2.25rem' }}>
      <div style={{
        maxWidth: 'var(--max-width)', margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem',
        alignItems: 'start',
      }}>
        {/* Left: lockup, site link, support pill */}
        <div>
          <Image
            src={f.lockup.src}
            alt={tenant.logoAlt}
            width={f.lockup.width}
            height={f.lockup.height}
            style={{ width: f.lockup.displayWidth, height: 'auto' }}
          />
          <a
            href={f.siteUrl} target="_blank" rel="noopener noreferrer"
            style={{ ...link, display: 'inline-block', fontSize: '15px', margin: '1.4rem 0 0 4px' }}
          >
            {f.siteLabel}
          </a>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            marginTop: '3.4rem', fontSize: '15px',
          }}>
            <span>{f.supportLabel}</span>
            <a
              href={f.supportHref}
              style={{
                background: tenant.accent, color: tenant.primary, fontWeight: 600,
                borderRadius: '999px', padding: '7px 26px', fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              {f.supportButtonLabel}
            </a>
          </div>
        </div>

        {/* Right: contact block + Follow Us */}
        <div style={{ fontSize: '15px', lineHeight: 1.6, textAlign: 'left' }}>
          <div>Email: <a href={`mailto:${f.email}`} style={link}>{f.email}</a></div>
          {f.contactUrl && (
            <div>
              <a href={f.contactUrl} target="_blank" rel="noopener noreferrer" style={link}>
                {f.contactUrl.replace(/^https?:\/\//, 'https://')}
              </a>
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            {f.addressLines.map((line) => <div key={line}>{line}</div>)}
          </div>
          <div style={{ marginTop: '1rem' }}>{f.phone}</div>

          <div style={{
            display: 'inline-block', border: '2px solid #ffffff', borderRadius: '14px',
            padding: '0.8rem 1.4rem 1rem', marginTop: '1.5rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>Follow Us</div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {f.socials.map((s) => (
                <a
                  key={s.platform}
                  href={s.href} target="_blank" rel="noopener noreferrer"
                  aria-label={s.platform}
                  style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: tenant.accent, color: tenant.primary,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                    {SOCIAL_PATHS[s.platform]}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
