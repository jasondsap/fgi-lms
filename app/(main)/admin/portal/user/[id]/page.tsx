import type { Metadata } from 'next';
import PortalAdminUser from '@/components/portal-admin/PortalAdminUser';
import { getPortalSurface } from '@/lib/portal-surfaces';

export const metadata: Metadata = { title: 'Portal Admin — User', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function FgiPortalAdminUserPage({ params }: { params: { id: string } }) {
  return <PortalAdminUser surface={getPortalSurface('fgi')!} id={params.id} />;
}
