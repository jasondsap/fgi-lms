import { Suspense } from 'react';
import FilterSidebar from '@/components/library/FilterSidebar';
import AskLibrary from '@/components/library/AskLibrary';
import ResourceGrid from '@/components/library/ResourceGrid';
import SearchBar from '@/components/library/SearchBar';
import { getSession } from '@/auth';
import { requireSignIn } from '@/lib/lockdown';
import { getCompletedResourceIds } from '@/lib/progress';
import { canSeeInternal, getViewer } from '@/lib/viewer';
import { getPublicResources } from '@/lib/resources';
import { filterQuery, loadedPages } from '@/lib/query';
import type { ResourceListParams, ResourceType, AudienceTag, TopicTag } from '@/types';

// Resource Type is a multi-select in the sidebar, so this arrives as a string
// when one box is ticked and an array when several are.
function normalizeType(v: string | string[] | undefined) {
  if (!v) return undefined;
  return (Array.isArray(v) ? v : [v]) as ResourceType[];
}

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function LibraryPage({ searchParams }: PageProps) {
  await requireSignIn('/'); // 8-31-26 lockdown: landing page only until signed in
  const params: ResourceListParams = {
    type:     normalizeType(searchParams.type),
    duration: (searchParams.duration as any)           || undefined,
    search:   (searchParams.search   as string)        || undefined,
    match:    (searchParams.match    as 'any' | 'all') || 'any',
    tenant:   (searchParams.tenant   as string)        || undefined,
    page:     parseInt((searchParams.page as string)   || '1', 10),
    per_page: 12,
  };
  // ?loaded=N (Back-navigation restore): render pages 1..N in one go so the
  // browser can put the visitor back where they were. ?page (no-JS fallback)
  // keeps precedence.
  const loaded = loadedPages(searchParams);
  if (loaded > 1 && !searchParams.page) {
    params.page = 1;
    params.per_page = 12 * loaded;
  }

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

  params.includeInternal = canSeeInternal(await getViewer(), 'fgi');
  const data = await getPublicResources(params);
  const query = filterQuery(searchParams);
  const session = await getSession();
  const completedIds = session?.user?.id ? await getCompletedResourceIds(session.user.id) : [];

  return (
    <div style={{ background: '#ffffff', padding: '2rem 2rem 4rem' }}>
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
            startPage={loaded > 1 && !searchParams.page ? loaded : (params.page ?? 1)}
            perPage={12}
            apiQuery={query}
            fallbackBase="/library"
            fallbackQuery={query}
            total={data.total}
            completedIds={completedIds}
          />
        </div>
      </div>
      <AskLibrary />
    </div>
  );
}
