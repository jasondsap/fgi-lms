import { notFound } from 'next/navigation';
import AuthNav from '@/components/layout/AuthNav';
import TenantHeader from '@/components/tenant/TenantHeader';
import TenantHeaderV2 from '@/components/tenant/v2/Header';
import { getTenantConfig } from '@/lib/tenants';

/**
 * Chrome for every page inside a tenant portal — the landing page, resource
 * detail, and the course player all keep the tenant's own header.
 *
 * This is a dynamic root segment, so it only matches paths that no static
 * route claimed (/library, /resource, /course, /admin, /api all win first).
 * Anything that isn't a known tenant slug 404s.
 */
export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) notFound();

  // Tenants carrying a `v2` block use the 8-11-26 portal design; the rest keep
  // the original chrome untouched. AuthNav is an async server component, so it
  // is passed into the (client) v2 header as a slot.
  return (
    <>
      {tenant.v2 ? (
        <TenantHeaderV2
          tenant={tenant}
          authNav={<AuthNav color="#ffffff" signOutRedirect={`/${tenant.slug}`} />}
        />
      ) : (
        <TenantHeader tenant={tenant} />
      )}
      <main>{children}</main>
    </>
  );
}
