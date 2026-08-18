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
      logoSrc={tenant.v2?.footerLogo?.src ?? tenant.logo}
      logoAlt={tenant.logoAlt}
      logoOnWhite={tenant.v2?.logoOnWhite ?? false}
      logoHeight="58px"
      siteUrl={tenant.footer.websiteUrl}
      siteLabel={tenant.footer.websiteLabel}
    />
  );
}

/*
 * Slim footer for the detail shells (webinar, PDF, course, podcast), from the
 * 8-11-26 webinar shell mockup: a navy bar with the logo left, "Platform
 * Support" + Contact pill in the middle, and the site URL right. Sizes are the
 * mockup's points x1.4 (14pt text -> 20px, 117pt logo -> 164px, ~80px bar).
 * Tenant shells pass their own colours so the footer matches their header.
 */
export default function ShellFooter({
  bg = 'var(--fgi-navy)',
  logoSrc = '/images/logos/fgi-logo-transparent.png',
  logoAlt = 'Fletcher Group',
  logoOnWhite = false,
  logoHeight = '44px',
  siteUrl = 'https://www.fletchergroup.org',
  siteLabel = 'www.fletchergroup.org',
  contactHref,
}: {
  bg?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoOnWhite?: boolean;
  logoHeight?: string;
  siteUrl?: string;
  siteLabel?: string;
  contactHref?: string;
}) {
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <span style={{ fontSize: '20px' }}>Platform Support</span>
          <ContactButton label="Contact" fontSize="20px" {...(contactHref ? { href: contactHref } : {})} />
        </div>

        <Link
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#ffffff', fontSize: '20px', textDecoration: 'none' }}
        >
          {siteLabel}
        </Link>
      </div>
    </footer>
  );
}
