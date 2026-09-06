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

/** Small line icons for the contact block (stroke = currentColor). */
const CONTACT_ICONS = {
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  phone: (
    <path d="M6.5 3h3l1.5 4-2 1.5a11 11 0 006.5 6.5L17 13l4 1.5v3a2 2 0 01-2 2A16 16 0 014.5 5a2 2 0 012-2z" />
  ),
  web: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </>
  ),
};

function ContactLine({ icon, children }: { icon: keyof typeof CONTACT_ICONS; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <svg
        width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
        style={{ flexShrink: 0, marginTop: '3px' }}
      >
        {CONTACT_ICONS[icon]}
      </svg>
      <span>{children}</span>
    </div>
  );
}

/*
 * v3 tenant footer. Jennifer's 8-25-26 SCARR revisions to the 8-19 mockup
 * (Colorado shares them, plus the lobe treatment below, 8-26):
 * the lockup sits at the top-left with the contact lines (email, location,
 * phone, web — each with a small icon) aligned beneath it; the outlined
 * Follow Us box sits on the right in line with the lockup, with the Learning
 * Center Support line under it. The right column stops well above the
 * bottom edge so it never collides with the fixed "Ask the library" pill.
 */
export default function TenantFooterV3({ tenant }: { tenant: TenantConfig }) {
  const f = tenant.v3!.footer;
  const lobe = tenant.v3!.lobe;
  const link = { color: '#ffffff', textDecoration: 'underline' } as const;

  const contact = (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '9px',
      fontSize: '15px', lineHeight: 1.5,
    }}>
      <ContactLine icon="email">
        <a href={`mailto:${f.email}`} style={link}>{f.email}</a>
        {/* The contact-form URL belongs with the email, not the website line
            (Jennifer, 8-29: "it takes them to a form to email"). */}
        {f.contactUrl && (
          <>
            <br />
            <a href={f.contactUrl} target="_blank" rel="noopener noreferrer" style={link}>
              {f.contactUrl}
            </a>
          </>
        )}
      </ContactLine>
      <ContactLine icon="location">
        {f.addressLines.map((line, i) => (
          <span key={line}>{i > 0 && <br />}{line}</span>
        ))}
      </ContactLine>
      <ContactLine icon="phone">{f.phone}</ContactLine>
      <ContactLine icon="web">
        <a href={f.siteUrl} target="_blank" rel="noopener noreferrer" style={link}>
          {f.siteLabel}
        </a>
      </ContactLine>
    </div>
  );

  // Jennifer 8-29: Follow Us sits lower (level with the contact block's
  // bottom rather than the lockup), no outline, label and icons on one line,
  // and more air before the Learning Center Support line.
  const right = (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      gap: '2.2rem', paddingBottom: '64px', paddingRight: '0.5rem', alignSelf: 'end',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700 }}>Follow Us</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '15px' }}>
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
  );

  if (lobe) {
    // Colorado (Jason, 8-26): the footer mirrors the header's lobe — the
    // bordered mark on its pale-yellow field at the left, and the navy body
    // sweeping around it with a pill-rounded left cap. The mark is a touch
    // smaller than the header's (Jennifer: "could even be a bit smaller").
    const edgePad = 'max(2rem, calc((100vw - var(--max-width)) / 2))';
    return (
      <footer style={{ background: lobe.bg, color: '#ffffff' }}>
        <div className="shell-lobe" style={{ display: 'flex', alignItems: 'stretch', paddingLeft: edgePad }}>
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: '26px', flexShrink: 0, paddingTop: '10px', paddingBottom: '10px' }}>
            <Image
              src={lobe.logo}
              alt={tenant.logoAlt}
              width={300} height={300}
              style={{ width: '120px', height: 'auto' }}
            />
          </div>
          <div className="tenant-footer-grid tenant-footer-lobe" style={{
            flex: 1, minWidth: 0,
            background: tenant.primary,
            borderRadius: '999px 0 0 999px',
            paddingRight: edgePad,
          }}>
            {contact}
            {right}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="gutter" style={{ background: tenant.primary, color: '#ffffff', paddingTop: '2.25rem', paddingBottom: '2rem' }}>
      <div className="tenant-footer-grid" style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
        {/* Left: lockup, then the contact block aligned under it. */}
        <div>
          <Image
            src={f.lockup.src}
            alt={tenant.logoAlt}
            width={f.lockup.width}
            height={f.lockup.height}
            style={{ width: f.lockup.displayWidth, height: 'auto', display: 'block' }}
          />
          <div style={{ marginTop: '1.4rem', marginLeft: '4px' }}>{contact}</div>
        </div>

        {/* Right: Follow Us + support line, bottom-aligned with the contact
            block (8-29). Bottom padding keeps it clear of the Ask-the-library pill. */}
        {right}
      </div>
    </footer>
  );
}
