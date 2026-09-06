import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import AuthNav from '@/components/layout/AuthNav';
import TenantHeader from '@/components/tenant/TenantHeader';
import TenantHeaderV2 from '@/components/tenant/v2/Header';
import TenantHeaderV3 from '@/components/tenant/v3/Header';
import { getTenantConfig } from '@/lib/tenants';
import { canEnterPortal, getViewer, viewerHome } from '@/lib/viewer';

/**
 * Chrome for every page inside a tenant portal — the landing page, resource
 * detail, and the course player all keep the tenant's own header.
 *
 * This is a dynamic root segment, so it only matches paths that no static
 * route claimed (/library, /resource, /course, /admin, /api all win first).
 * Anything that isn't a known tenant slug 404s.
 */
/**
 * Link-preview card per portal (Jason, 9-6-26): every page under /colorado or
 * /scarr unfurls with that portal's logo card instead of the FGI one. Pages
 * keep setting their own <title>; og:title follows it.
 */
export function generateMetadata({ params }: { params: { tenant: string } }): Metadata {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) return {};
  const image = `/images/og/${tenant.slug}-share.png`;
  return {
    openGraph: {
      siteName: `${tenant.name} — Learning Center`,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: tenant.logoAlt }],
    },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) notFound();

  // Members-only portals (Jason, 8-31-26): every tenant route resolves
  // through this layout, so one check covers the landing, resources, the
  // player, help, support and account. Signed-in accounts from any other
  // surface bounce to their own home; admins pass; anonymous visitors pass
  // (this is the sign-in door — the content gate still blocks everything).
  const viewer = await getViewer();
  if (!canEnterPortal(viewer, tenant.slug)) redirect(viewerHome(viewer));

  // v3 (8-19-26) wins over v2 (8-11-26); tenants with neither keep the
  // original chrome. AuthNav is an async server component, so it is passed
  // into the (client) headers as a slot.
  const authNav = (
    // Initials circle in the tenant's brand yellow with black letters
    // (Jason, 8-31-26) — `accent` is CO #ffd100 / SCARR #f5d300.
    <AuthNav
      color="#ffffff"
      signOutRedirect={`/${tenant.slug}`}
      surface={tenant.slug}
      avatarBg={tenant.accent}
      avatarFg="#000000"
    />
  );
  return (
    <>
      {tenant.v3 ? (
        <TenantHeaderV3 tenant={tenant} authNav={authNav} />
      ) : tenant.v2 ? (
        <TenantHeaderV2 tenant={tenant} authNav={authNav} />
      ) : (
        <TenantHeader tenant={tenant} />
      )}
      <main>{children}</main>
    </>
  );
}
