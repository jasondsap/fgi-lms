import { notFound } from 'next/navigation';
import ResourceDetail from '@/components/resource/ResourceDetail';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { tenantSurface } from '@/lib/surface';

export default function TenantResourcePage(
  { params, searchParams }: {
    params: { tenant: string; slug: string };
    // The podcast shell reads ?from= and ?autoplay= (Trailer round-trip);
    // every other detail page ignores the query string.
    searchParams?: Record<string, string | string[] | undefined>;
  },
) {
  const surface = tenantSurface(params.tenant);
  if (!surface) notFound();
  return (
    <>
      <ResourceDetail slug={params.slug} surface={surface} searchParams={searchParams} />
      <TenantShellFooter tenant={surface.tenant!} />
    </>
  );
}
