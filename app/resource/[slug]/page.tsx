import ResourceDetail from '@/components/resource/ResourceDetail';
import { requireSignIn } from '@/lib/lockdown';
import { FGI_SURFACE } from '@/lib/surface';

export default async function ResourceDetailPage(
  { params }: { params: { slug: string } },
) {
  // 8-31-26 lockdown: supersedes the ResourceGate teaser. The path rides along
  // so a shared link lands here after sign-in.
  await requireSignIn('/', `/resource/${params.slug}`);
  return <ResourceDetail slug={params.slug} surface={FGI_SURFACE} />;
}
