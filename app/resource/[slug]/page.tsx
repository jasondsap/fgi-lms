import ResourceDetail from '@/components/resource/ResourceDetail';
import { FGI_SURFACE } from '@/lib/surface';

export default function ResourceDetailPage({ params }: { params: { slug: string } }) {
  return <ResourceDetail slug={params.slug} surface={FGI_SURFACE} />;
}
