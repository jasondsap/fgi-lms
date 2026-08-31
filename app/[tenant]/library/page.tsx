import { notFound, redirect } from 'next/navigation';
import { requireSignIn } from '@/lib/lockdown';
import { getTenantConfig } from '@/lib/tenants';

/**
 * 8-30-26: the tenant-chromed FGI-catalogue view (built earlier the same
 * weekend) was superseded the next day by Jennifer's preferred flow — the
 * sidebar link now opens the REAL FGI library in a new tab with
 * ?from=<tenant>, and the FGI sidebar offers the way back (closing the
 * tab). This route survives only to catch old links.
 */
export default async function TenantFgiLibraryPage({ params }: { params: { tenant: string } }) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) notFound();
  // Gate before the forward so a signed-out visitor lands back on THEIR portal.
  await requireSignIn(`/${tenant.slug}`);
  redirect(`/library?from=${tenant.slug}`);
}
