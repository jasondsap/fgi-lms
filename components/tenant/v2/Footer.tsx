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

/*
 * v2 tenant footer (8-11-26 Colorado mockup). Two columns rather than three:
 * the logo, website and a support button on the left, contact lines and a
 * "Follow Us" box on the right. The old centred "For Learning Center Support
 * Contact …" line is gone — it is the button now.
 */
export default function TenantFooterV2({ tenant }: { tenant: TenantConfig }) {
  const f = tenant.footer;
  const v2 = tenant.v2!;

  return (
    <footer style={{ background: f.bg, color: '#ffffff' }}>
      <div style={{
        maxWidth: 'var(--max-width)', margin: '0 auto', padding: '2.75rem 2rem 2.5rem',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start',
      }}>
        {/* Left — logo, website, support button */}
        <div>
          {/* SCARR supplies a horizontal lockup for the dark footer; Colorado
              reuses the header mark, boxed on white. */}
          <div style={{
            background: v2.logoOnWhite ? '#ffffff' : 'transparent',
            display: 'inline-flex',
            padding: v2.logoOnWhite ? '10px' : 0,
            marginBottom: '1.1rem',
          }}>
            <Image
              src={v2.footerLogo?.src ?? tenant.logo}
              alt={tenant.logoAlt}
              width={v2.footerLogo?.width ?? 300}
              height={v2.footerLogo?.height ?? 300}
              style={{ width: v2.footerLogo ? '320px' : '150px', height: 'auto' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <Link href={f.websiteUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: '#ffffff', fontSize: '17px', textDecoration: 'none' }}>
              {f.websiteLabel}
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '16px' }}>{v2.footerSupport.label}</span>
            <a
              href={v2.footerSupport.href}
              style={{
                background: tenant.accent, color: tenant.primary,
                fontSize: '16px', fontWeight: 600, textDecoration: 'none',
                padding: '8px 26px', borderRadius: '999px', whiteSpace: 'nowrap',
              }}
            >
              {v2.footerSupport.buttonLabel}
            </a>
          </div>
        </div>

        {/* Right — contact lines + Follow Us */}
        <div style={{ justifySelf: 'end', maxWidth: '440px' }}>
          <div className="tenant-contact" style={{ fontSize: '17px', lineHeight: 1.6, marginBottom: '1.75rem' }}
            dangerouslySetInnerHTML={{ __html: f.contactHtml }} />

          <div style={{
            border: '1.5px solid #ffffff', borderRadius: 'var(--radius-lg)',
            padding: '0.9rem 1.5rem 1.1rem', display: 'inline-block',
          }}>
            <div style={{ fontSize: '17px', fontWeight: 700, textAlign: 'center', marginBottom: '10px' }}>
              Follow Us
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {f.socials.map(s => (
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
        </div>
      </div>
    </footer>
  );
}
