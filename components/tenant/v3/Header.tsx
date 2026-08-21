'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { TenantConfig } from '@/lib/tenants';

/*
 * v3 tenant header (8-19-26 SCARR mockup): brand-navy bar with the gold logo
 * mark sitting directly on it (no lobe, no white box), Home/Library nav with
 * the gold active underline, then the two certification pills — gold
 * Pre-Certification, white Post-Certification (a dead placeholder until its
 * destination exists) — and the org-site link + auth on the right.
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

  const links = [
    { label: 'Home', href: home, active: pathname === home },
    { label: 'Library', href: `${home}#library`, active: false },
  ];

  const pillBase = {
    display: 'inline-block', textAlign: 'center' as const,
    borderRadius: '999px', padding: '8px 20px',
    fontSize: '14px', fontWeight: 700, lineHeight: 1.25,
    maxWidth: '170px', textDecoration: 'none',
  };

  return (
    <header style={{ background: tenant.primary, borderBottom: `5px solid ${tenant.accent}` }}>
      <div style={{
        maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 2rem',
        minHeight: '92px', display: 'flex', alignItems: 'center', gap: '1.75rem',
      }}>
        <Link href={home} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Image
            src="/images/tenants/scarr/logo-gold.webp"
            alt={tenant.logoAlt}
            width={600} height={600}
            priority
            style={{ width: '84px', height: '84px', objectFit: 'contain' }}
          />
        </Link>

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href={v3.certButtons.pre.href}
            style={{ ...pillBase, background: tenant.accent, color: '#000000' }}
          >
            {v3.certButtons.pre.label}
          </Link>
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
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1.5rem',
        }}>
          <a
            href={v3.orgSiteUrl} target="_blank" rel="noopener noreferrer"
            style={{ color: 'rgba(255,255,255,0.92)', fontSize: '16px', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            {v3.orgSiteLabel}
          </a>
          {authNav}
        </div>
      </div>
    </header>
  );
}
