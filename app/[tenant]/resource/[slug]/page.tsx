import { notFound } from 'next/navigation';
import ResourceDetail from '@/components/resource/ResourceDetail';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { tenantSurface } from '@/lib/surface';

export default function TenantResourcePage(
  { params }: { params: { tenant: string; slug: string } },
) {
  const surface = tenantSurface(params.tenant);
  if (!surface) notFound();
  return (
    <>
      <ResourceDetail slug={params.slug} surface={surface} />
      <TenantShellFooter tenant={surface.tenant!} />
    </>
  );
}
