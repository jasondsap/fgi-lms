'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TenantConfig } from '@/lib/tenants';

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

  // "Library" is a hash link on the landing page; usePathname can't see the
  // hash, so track it ourselves so the tab goes gold once the visitor is in
  // the library (Jennifer, 8-25).
  const [hash, setHash] = useState('');
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [pathname]);
  const inLibrary = pathname === home && hash === '#library';

  const links = [
    { label: 'Home', href: home, active: pathname === home && !inLibrary },
    { label: 'Library', href: `${home}#library`, active: inLibrary },
  ];

  const pillBase = {
    display: 'inline-block', textAlign: 'center' as const,
    borderRadius: '999px', padding: '8px 20px',
    fontSize: '14px', fontWeight: 700, lineHeight: 1.25,
    maxWidth: '170px', textDecoration: 'none',
  };

  // Everything to the right of the logo — shared by both layouts.
  const inner = (
    <>
      <nav aria-label="Main navigation">
        <ul style={{
          display: 'flex', gap: '2rem', listStyle: 'none',
          alignItems: 'center', margin: 0, padding: 0,
        }}>
          {links.map(({ label, href, active }) => (
            <li key={label}>
              <Link
                href={href}
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
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

      <div style={{
        display: 'flex', alignItems: 'center', gap: '1.5rem',
      }}>
        <a
          href={v3.orgSiteUrl} target="_blank" rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.92)', fontSize: '16px', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {v3.orgSiteLabel}
        </a>
        {authNav}
      </div>
    </>
  );

  if (v3.lobe) {
    const edgePad = 'max(2rem, calc((100vw - var(--max-width)) / 2))';
    return (
      <header style={{ background: v3.lobe.bg, borderBottom: `5px solid ${tenant.accent}` }}>
        <div style={{
          display: 'flex', alignItems: 'stretch', height: '92px',
          paddingLeft: edgePad,
        }}>
          <Link
            href={home}
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
              style={{ height: '78px', width: 'auto' }}
            />
          </Link>

          <div style={{
            flex: 1, minWidth: 0,
            background: tenant.primary, color: '#ffffff',
            borderRadius: '999px 0 0 999px',
            display: 'flex', alignItems: 'center', gap: '1.75rem',
            paddingLeft: '3rem', paddingRight: edgePad,
          }}>
            {inner}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header style={{ background: tenant.primary, borderBottom: `5px solid ${tenant.accent}` }}>
      <div style={{
        maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 2rem',
        minHeight: '92px', display: 'flex', alignItems: 'center', gap: '1.75rem',
      }}>
        <Link href={home} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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
