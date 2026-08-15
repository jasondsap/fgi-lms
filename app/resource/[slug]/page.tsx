import ResourceDetail from '@/components/resource/ResourceDetail';
import { FGI_SURFACE } from '@/lib/surface';

export default function ResourceDetailPage(
  { params, searchParams }: {
    params: { slug: string };
    // The podcast shell reads ?from= and ?autoplay= (Trailer round-trip);
    // every other detail page ignores the query string.
    searchParams?: Record<string, string | string[] | undefined>;
  },
) {
  return <ResourceDetail slug={params.slug} surface={FGI_SURFACE} searchParams={searchParams} />;
}
