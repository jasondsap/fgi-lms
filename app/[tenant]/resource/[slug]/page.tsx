import { notFound } from 'next/navigation';
import ResourceDetail from '@/components/resource/ResourceDetail';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { requireSignIn } from '@/lib/lockdown';
import { tenantSurface } from '@/lib/surface';

export default async function TenantResourcePage(
  { params }: { params: { tenant: string; slug: string } },
) {
  const surface = tenantSurface(params.tenant);
  if (!surface) notFound();
  await requireSignIn(surface.basePath, `${surface.basePath}/resource/${params.slug}`);
  return (
    <>
      <ResourceDetail slug={params.slug} surface={surface} />
      <TenantShellFooter tenant={surface.tenant!} />
    </>
  );
}
