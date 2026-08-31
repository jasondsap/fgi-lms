import ResourceDetail from '@/components/resource/ResourceDetail';
import { requireSignIn } from '@/lib/lockdown';
import { FGI_SURFACE } from '@/lib/surface';

export default async function ResourceDetailPage(
  { params }: { params: { slug: string } },
) {
  await requireSignIn('/'); // 8-31-26 lockdown: supersedes the ResourceGate teaser
  return <ResourceDetail slug={params.slug} surface={FGI_SURFACE} />;
}
