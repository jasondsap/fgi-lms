import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PortalAdminUser from '@/components/portal-admin/PortalAdminUser';
import { getPortalSurface } from '@/lib/portal-surfaces';

export const metadata: Metadata = { title: 'Portal Admin — User', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function PortalAdminUserPage({ params }: { params: { tenant: string; id: string } }) {
  const surface = getPortalSurface(params.tenant);
  if (!surface?.tenant) notFound();
  return <PortalAdminUser surface={surface} id={params.id} />;
}
