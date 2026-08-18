'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { TenantConfig } from '@/lib/tenants';

/*
 * v2 tenant header (8-11-26 Colorado mockup): a bar in the tenant's own dark
 * brand colour with the logo in a white box flush to the left, an accent-
 * coloured underbar, and the same gold-underline active state as the FGI
 * header. The link across to the FGI library sits apart, on the right.
 *
 * Tenants with `v2.lobe` (8-17-26 Colorado mockup) use the lobe layout
 * instead: the black-bordered full-colour mark sits on a pale-yellow field at
 * the left, and the navy bar gets a pill-rounded left cap sweeping around it.
 * The bar always reaches the right viewport edge; the vw padding keeps its
 * contents aligned to the site's max-width column.
 *
 * Client component because the active-nav state needs the pathname. AuthNav is
 * an async server component, so it is passed in as a slot rather than imported.
 */
export default function TenantHeaderV2({
  tenant, authNav,
}: { tenant: TenantConfig; authNav?: React.ReactNode }) {
  const v2 = tenant.v2!;
  const home = `/${tenant.slug}`;
  const pathname = usePathname();

  const links = [
    { label: 'Home',           href: home },
    { label: 'Library',        href: `${home}#library` },
    { label: v2.orgSiteLabel,  href: v2.orgSiteUrl, external: true },
  ];

  const navContent = (
    <>
      <nav aria-label="Main navigation" style={{ marginLeft: '1.5rem' }}>
        <ul style={{
          display: 'flex', gap: '2.25rem', listStyle: 'none',
          alignItems: 'center', margin: 0, padding: 0,
        }}>
          {links.map(({ label, href, external }) => {
            const active = !external && pathname === home && href === home;
            return (
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
            );
          })}
        </ul>
      </nav>

      {/* Across to the FGI library — set apart from the tenant's own nav */}
      <Link
        href={tenant.fgiSiteUrl}
        style={{
          marginLeft: 'auto', color: 'rgba(255,255,255,0.92)',
          fontSize: '16px', textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        {v2.fgiNavLabel}
      </Link>

      <div style={{ flexShrink: 0 }}>{authNav}</div>
    </>
  );

  const chrome: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
    borderBottom: `6px solid ${tenant.accent}`,
  };

  if (v2.lobe) {
    const edgePad = 'max(2rem, calc((100vw - var(--max-width)) / 2))';
    return (
      <header style={{ ...chrome, background: v2.lobe.bg }}>
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
              src={v2.lobe.logo}
              alt={tenant.logoAlt}
              width={300}
              height={300}
              style={{ height: '78px', width: 'auto' }}
              priority
            />
          </Link>

          <div style={{
            flex: 1, minWidth: 0,
            background: tenant.primary, color: '#ffffff',
            borderRadius: '999px 0 0 999px',
            display: 'flex', alignItems: 'center', gap: '2.25rem',
            paddingLeft: '3rem', paddingRight: edgePad,
          }}>
            {navContent}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header style={{
      ...chrome,
      background: tenant.primary,
      color: '#ffffff',
      padding: '0 2rem',
    }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '2.25rem',
        height: '92px',
      }}>
        {/* Colorado boxes its mark on white; SCARR's already reads on navy. */}
        <Link
          href={home}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: v2.logoOnWhite ? '#ffffff' : 'transparent',
            alignSelf: 'stretch',
            width: v2.logoOnWhite ? '104px' : 'auto',
            flexShrink: 0, marginLeft: '12px',
          }}
        >
          <Image
            src={tenant.logo}
            alt={tenant.logoAlt}
            width={600}
            height={418}
            style={{ width: 'auto', height: v2.logoOnWhite ? '88px' : '80px' }}
            priority
          />
        </Link>

        {navContent}
      </div>
    </header>
  );
}
