import { notFound } from 'next/navigation';
import TenantHeader from '@/components/tenant/TenantHeader';
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

  return (
    <>
      <TenantHeader tenant={tenant} />
      <main>{children}</main>
    </>
  );
}
