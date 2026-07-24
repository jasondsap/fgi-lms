import Link from 'next/link';
import Image from 'next/image';
import AuthNav from '@/components/layout/AuthNav';
import type { TenantConfig } from '@/lib/tenants';

// Co-branded tenant header: white bar, tenant logo, dark nav, a tenant-colored
// bottom accent. Mirrors the 7-21-26 tenant mockups (distinct from the FGI
// navy header).
export default function TenantHeader({ tenant }: { tenant: TenantConfig }) {
  const home = `/${tenant.slug}`;
  const navLinks = [
    { label: 'Home',     href: home },
    { label: 'Library',  href: `${home}#library` },
    { label: 'FGI Site', href: tenant.fgiSiteUrl, external: true },
  ];

  return (
    <header style={{
      background: '#ffffff',
      color: '#1a1a1a',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      borderBottom: `4px solid ${tenant.primary}`,
    }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        height: '84px',
      }}>
        <Link href={home} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Image
            src={tenant.logo}
            alt={tenant.logoAlt}
            width={150}
            height={64}
            style={{ objectFit: 'contain', objectPosition: 'left center', maxHeight: '64px', width: 'auto', height: 'auto' }}
            priority
          />
        </Link>

        <nav aria-label="Main navigation" style={{ marginLeft: 'auto' }}>
          <ul style={{
            display: 'flex', gap: '2.25rem', listStyle: 'none',
            alignItems: 'center', margin: 0, padding: 0,
          }}>
            {navLinks.map(({ label, href, external }) => (
              <li key={label}>
                <Link
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  style={{
                    color: '#1a1a1a', fontSize: '15px', fontWeight: 500,
                    textDecoration: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ flexShrink: 0 }}>
          <AuthNav color={tenant.primary} signOutRedirect={home} />
        </div>
      </div>
    </header>
  );
}
