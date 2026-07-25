import { Suspense } from 'react';
import FilterSidebar from '@/components/library/FilterSidebar';
import ResourceGrid from '@/components/library/ResourceGrid';
import SearchBar from '@/components/library/SearchBar';
import { getPublicResources } from '@/lib/resources';
import { filterQuery } from '@/lib/query';
import type { ResourceListParams, ResourceType, AudienceTag, TopicTag } from '@/types';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function LibraryPage({ searchParams }: PageProps) {
  const params: ResourceListParams = {
    type:     (searchParams.type     as ResourceType)  || undefined,
    duration: (searchParams.duration as any)           || undefined,
    search:   (searchParams.search   as string)        || undefined,
    match:    (searchParams.match    as 'any' | 'all') || 'any',
    tenant:   (searchParams.tenant   as string)        || undefined,
    page:     parseInt((searchParams.page as string)   || '1', 10),
    per_page: 12,
  };

  if (searchParams.audience) {
    params.audience = (
      Array.isArray(searchParams.audience) ? searchParams.audience : [searchParams.audience]
    ) as AudienceTag[];
  }
  if (searchParams.topic) {
    params.topic = (
      Array.isArray(searchParams.topic) ? searchParams.topic : [searchParams.topic]
    ) as TopicTag[];
  }

  const data = await getPublicResources(params);
  const query = filterQuery(searchParams);

  return (
    <div style={{ background: 'var(--body-bg)', padding: '2rem 2rem 4rem' }}>
      <div style={{
        maxWidth: 'var(--max-width)', margin: '0 auto',
        display: 'flex', gap: '2rem', alignItems: 'flex-start',
      }}>
        <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
          <FilterSidebar total={data.total} targetPath="/library" />
        </Suspense>

        <div style={{ flex: 1, minWidth: 0 }}>
          <SearchBar defaultValue={params.search} targetPath="/library" />

          {/* key resets the accumulated list whenever a filter changes */}
          <ResourceGrid
            key={query}
            initial={data.resources}
            startPage={params.page ?? 1}
            totalPages={data.total_pages}
            perPage={params.per_page!}
            apiQuery={query}
            fallbackBase="/library"
            fallbackQuery={query}
            buttonColor="var(--fgi-blue)"
          />
        </div>
      </div>
    </div>
  );
}
