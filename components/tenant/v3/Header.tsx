'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { TenantConfig } from '@/lib/tenants';
import MobileNav, { type MobileNavLink } from '@/components/layout/MobileNav';

/*
 * v3 tenant header (8-19-26 SCARR mockup): brand-navy bar with the logo mark
 * sitting directly on it, Home/Library nav with the gold active underline,
 * then the two certification pills — gold Pre-Certification, white
 * Post-Certification (either renders as a dead placeholder until its
 * destination exists) — and the org-site link + auth on the right.
 *
 * Tenants with `v3.lobe` (Colorado, carrying the 8-17-26 treatment forward)
 * use the lobe layout instead: the black-bordered full-colour mark sits on a
 * pale-yellow field at the left, and the navy bar gets a pill-rounded left
 * cap sweeping around it, running to the right viewport edge.
 *
 * Client component for the pathname-driven active state; AuthNav is an async
 * server component and arrives as a slot.
 */
export default function TenantHeaderV3({
  tenant, authNav,
}: { tenant: TenantConfig; authNav?: React.ReactNode }) {
  const v3 = tenant.v3!;
  const home = `/${tenant.slug}`;
  const pathname = usePathname();

  // "Library" is a real page since 8-31-26 (Jason: match FGI — the library
  // locks in under the header until Home), so plain pathname matching works;
  // the old #library hash tracking is gone with the hash links.
  const inLibrary = pathname.startsWith(`${home}/library`);

  // The tenant's own site link joins the left nav (Jason, 8-30: every link
  // sits by the logo; only the account control lives at the right).
  const links = [
    { label: 'Home', href: home, active: pathname === home },
    { label: 'Library', href: `${home}/library`, active: inLibrary },
    { label: v3.orgSiteLabel, href: v3.orgSiteUrl, active: false, external: true },
  ];

  const pillBase = {
    display: 'inline-block', textAlign: 'center' as const,
    borderRadius: '999px', padding: '8px 20px',
    fontSize: '14px', fontWeight: 700, lineHeight: 1.25,
    maxWidth: '170px', textDecoration: 'none',
  };

  // Phone/tablet panel (9-5-26): the same links, then Help, then the cert pills.
  const mobileLinks: MobileNavLink[] = [
    ...links,
    { label: 'Help Center', href: `${home}/help` },
    {
      label: v3.certButtons.pre.label, href: v3.certButtons.pre.href ?? '#',
      pill: { bg: tenant.accent, fg: '#000000' }, disabled: !v3.certButtons.pre.href,
    },
    ...(v3.certButtons.post ? [{
      label: v3.certButtons.post.label, href: v3.certButtons.post.href ?? '#',
      pill: { bg: '#ffffff', fg: '#000000' }, disabled: !v3.certButtons.post.href,
    }] : []),
  ];

  // Everything to the right of the logo — shared by both layouts.
  const inner = (
    <>
      <nav aria-label="Main navigation" className="site-nav">
        <ul style={{
          display: 'flex', gap: '2rem', listStyle: 'none',
          alignItems: 'center', margin: 0, padding: 0,
        }}>
          {links.map(({ label, href, active, external }) => (
            <li key={label}>
              <Link
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                aria-current={active ? 'page' : undefined}
                style={{
                  color: active ? tenant.accent : 'rgba(255,255,255,0.92)',
                  fontSize: '16px', textDecoration: 'none', whiteSpace: 'nowrap',
                  paddingBottom: '5px',
                  borderBottom: `2px solid ${active ? tenant.accent : 'transparent'}`,
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Certification pills sit centred in the space between the nav and the
          org-site link (Jennifer, 8-25). */}
      <div className="tenant-cert-pills" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        {v3.certButtons.pre.href ? (
          <Link
            href={v3.certButtons.pre.href}
            style={{ ...pillBase, background: tenant.accent, color: '#000000' }}
          >
            {v3.certButtons.pre.label}
          </Link>
        ) : (
          /* Placeholder — Colorado's pre-certification course isn't built yet. */
          <span
            aria-disabled="true"
            title="Coming soon"
            style={{ ...pillBase, background: tenant.accent, color: '#000000', cursor: 'default' }}
          >
            {v3.certButtons.pre.label}
          </span>
        )}
        {v3.certButtons.post && (
          v3.certButtons.post.href ? (
            <Link
              href={v3.certButtons.post.href}
              style={{ ...pillBase, background: '#ffffff', color: '#000000' }}
            >
              {v3.certButtons.post.label}
            </Link>
          ) : (
            /* Placeholder — destination TBD (Jason, 8-21). */
            <span
              aria-disabled="true"
              title="Coming soon"
              style={{ ...pillBase, background: '#ffffff', color: '#000000', cursor: 'default' }}
            >
              {v3.certButtons.post.label}
            </span>
          )
        )}
      </div>

      <div className="site-actions" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
        {/* Help Center in the tenant's own chrome (Jason, 8-31-26: Home must
            lead back to the portal, never to FGI). */}
        <Link
          href={`${home}/help`}
          aria-label="Help Center"
          title="Help Center"
          style={{
            width: '27px', height: '27px', borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.85)', color: '#ffffff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, textDecoration: 'none', lineHeight: 1,
          }}
        >
          ?
        </Link>
        {authNav}
        <MobileNav links={mobileLinks} bg={tenant.primary} accent={tenant.accent} />
      </div>
    </>
  );

  if (v3.lobe) {
    const edgePad = 'max(2rem, calc((100vw - var(--max-width)) / 2))';
    return (
      <header className="site-header" style={{ background: v3.lobe.bg, borderBottom: `5px solid ${tenant.accent}` }}>
        <div className="site-header-inner" style={{
          display: 'flex', alignItems: 'stretch',
          paddingLeft: edgePad,
        }}>
          <Link
            href={home}
            className="tenant-lobe-logo"
            style={{
              display: 'flex', alignItems: 'center',
              paddingRight: '26px', flexShrink: 0,
            }}
          >
            <Image
              src={v3.lobe.logo}
              alt={tenant.logoAlt}
              width={300} height={300}
              priority
              style={{ width: 'auto' }}
            />
          </Link>

          <div className="tenant-lobe-bar" style={{
            flex: 1, minWidth: 0,
            background: tenant.primary, color: '#ffffff',
            borderRadius: '999px 0 0 999px',
            display: 'flex', alignItems: 'center',
            paddingRight: edgePad,
          }}>
            {inner}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="site-header gutter" style={{ background: tenant.primary, borderBottom: `5px solid ${tenant.accent}` }}>
      <div className="site-header-inner" style={{
        maxWidth: 'var(--max-width)', margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: '1.75rem',
      }}>
        <Link href={home} className="tenant-logo" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Image
            src={v3.headerLogo.src}
            alt={tenant.logoAlt}
            width={v3.headerLogo.width} height={v3.headerLogo.height}
            priority
            style={{ width: v3.headerLogo.displayWidth, height: 'auto', objectFit: 'contain' }}
          />
        </Link>

        {inner}
      </div>
    </header>
  );
}
