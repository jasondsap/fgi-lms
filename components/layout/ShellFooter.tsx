import Image from 'next/image';
import Link from 'next/link';
import type { TenantConfig } from '@/lib/tenants';
import ContactButton from './ContactButton';

/* Tenant detail shells get the same slim bar in their own colours, so the
   footer matches the tenant header the same way FGI's matches its own. */
export function TenantShellFooter({ tenant }: { tenant: TenantConfig }) {
  return (
    <ShellFooter
      bg={tenant.footer.bg}
      logoSrc={tenant.v2?.lobe?.logo ?? tenant.v2?.footerLogo?.src ?? tenant.logo}
      logoAlt={tenant.logoAlt}
      logoOnWhite={tenant.v2?.lobe ? false : tenant.v2?.logoOnWhite ?? false}
      logoHeight="58px"
      lobeBg={tenant.v2?.lobe?.bg}
      siteUrl={tenant.footer.websiteUrl}
      siteLabel={tenant.footer.websiteLabel}
      supportLabel={tenant.v3?.supportBar.heading}
      contactBg={tenant.v3?.contactButton?.bg}
      contactFg={tenant.v3?.contactButton?.fg}
      contactBasePath={`/${tenant.slug}`}
      contactAccent={tenant.primary}
    />
  );
}

/*
 * Slim footer for the detail shells (webinar, PDF, course, podcast), from the
 * 8-11-26 webinar shell mockup: a navy bar with the logo left, "Platform
 * Support" + Contact pill in the middle, and the site URL right. Sizes are the
 * mockup's points x1.4 (14pt text -> 20px, 117pt logo -> 164px, ~80px bar).
 * Tenant shells pass their own colours so the footer matches their header.
 *
 * With `lobeBg` (8-17-26 Colorado mockup) the bar mirrors the lobed header:
 * the logo sits on the pale-yellow field and the brand bar gets a pill-rounded
 * left cap, running to the right viewport edge.
 */
export default function ShellFooter({
  bg = 'var(--fgi-navy)',
  logoSrc = '/images/logos/fgi-logo-transparent.png',
  logoAlt = 'Fletcher Group',
  logoOnWhite = false,
  logoHeight = '44px',
  lobeBg,
  siteUrl = 'https://www.fletchergroup.org',
  siteLabel = 'www.fletchergroup.org',
  supportLabel = 'Platform Support',
  contactBg,
  contactFg,
  contactBasePath = '',
  contactAccent,
}: {
  bg?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoOnWhite?: boolean;
  logoHeight?: string;
  lobeBg?: string;
  siteUrl?: string;
  siteLabel?: string;
  /** "Learning Center Support" on the tenants (Jennifer 8-29). */
  supportLabel?: string;
  contactBg?: string;
  contactFg?: string;
  /** Ticket-modal wiring (8-31-26): tenant chrome path + modal accent. */
  contactBasePath?: string;
  contactAccent?: string;
}) {
  const logo = (
    <div style={{
      background: logoOnWhite ? '#ffffff' : 'transparent',
      display: 'inline-flex',
      padding: logoOnWhite ? '8px 10px' : 0,
      borderRadius: logoOnWhite ? '4px' : 0,
    }}>
      <Image
        src={logoSrc}
        alt={logoAlt}
        width={190}
        height={50}
        style={{ height: logoHeight, width: 'auto', objectFit: 'contain' }}
      />
    </div>
  );

  const contact = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px 18px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '17px' }}>{supportLabel}</span>
      <ContactButton
        label="Contact" fontSize="16px"
        basePath={contactBasePath}
        {...(contactAccent ? { accent: contactAccent } : {})}
        {...(contactBg ? { bg: contactBg } : {})}
        {...(contactFg ? { fg: contactFg } : {})}
      />
    </div>
  );

  const site = (
    <Link
      href={siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#ffffff', fontSize: '20px', textDecoration: 'none' }}
    >
      {siteLabel}
    </Link>
  );

  if (lobeBg) {
    const edgePad = 'max(2rem, calc((100vw - var(--max-width)) / 2))';
    return (
      <footer style={{ background: lobeBg, color: '#ffffff' }}>
        <div className="shell-lobe" style={{
          display: 'flex', alignItems: 'stretch', minHeight: '80px',
          paddingLeft: edgePad,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: '24px', flexShrink: 0 }}>
            {logo}
          </div>
          <div className="shell-lobe-bar" style={{
            flex: 1, minWidth: 0,
            background: bg,
            borderRadius: '999px 0 0 999px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '1.5rem 2.5rem', flexWrap: 'wrap',
            paddingRight: edgePad,
          }}>
            {contact}
            {site}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer style={{ background: bg, color: '#ffffff' }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '18px 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem 2.5rem',
        flexWrap: 'wrap',
      }}>
        {logo}
        {contact}
        {site}
      </div>
    </footer>
  );
}
