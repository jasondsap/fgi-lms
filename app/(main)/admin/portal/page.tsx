import type { Metadata } from 'next';
import PortalAdminReport from '@/components/portal-admin/PortalAdminReport';
import { getPortalSurface } from '@/lib/portal-surfaces';

export const metadata: Metadata = { title: 'Portal Admin — Fletcher Group', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * The Portal Admin report for the FGI library itself (Jason, 10-13-26) —
 * everyone whose home surface is fgilearn.org, in the FGI chrome. Same
 * component, same exports and saved reports as the tenant portals.
 */
export default function FgiPortalAdminPage({
  searchParams,
}: { searchParams: Record<string, string | string[] | undefined> }) {
  return <PortalAdminReport surface={getPortalSurface('fgi')!} searchParams={searchParams} />;
}
