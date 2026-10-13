import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PortalAdminReport from '@/components/portal-admin/PortalAdminReport';
import { getPortalSurface } from '@/lib/portal-surfaces';

export const metadata: Metadata = { title: 'Portal Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Portal Admin for a tenant portal (Colorado, SCARR). FGI's copy is /admin/portal. */
export default function PortalAdminPage({
  params, searchParams,
}: {
  params: { tenant: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const surface = getPortalSurface(params.tenant);
  if (!surface?.tenant) notFound();
  return <PortalAdminReport surface={surface} searchParams={searchParams} />;
}
