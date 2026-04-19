import { Suspense } from 'react';
import FilterSidebar from '@/components/library/FilterSidebar';
import ResourceCard from '@/components/library/ResourceCard';
import SearchBar from '@/components/library/SearchBar';
import type { ResourceListParams, ResourceType, AudienceTag, TopicTag } from '@/types';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

async function getResources(params: ResourceListParams) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const qs   = new URLSearchParams();

  if (params.type)     qs.set('type',     params.type);
  if (params.duration) qs.set('duration', params.duration);
  if (params.search)   qs.set('search',   params.search);
  if (params.match)    qs.set('match',    params.match);
  if (params.page)     qs.set('page',     String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));

  if (params.audience) {
    const arr = Array.isArray(params.audience) ? params.audience : [params.audience];
    arr.forEach(a => qs.append('audience', a));
  }
  if (params.topic) {
    const arr = Array.isArray(params.topic) ? params.topic : [params.topic];
    arr.forEach(t => qs.append('topic', t));
  }

  try {
    const res = await fetch(`${base}/api/resources?${qs.toString()}`, { next: { revalidate: 60 } });
    if (!res.ok) return { resources: [], total: 0, page: 1, per_page: 12, total_pages: 0 };
    return res.json();
  } catch {
    return { resources: [], total: 0, page: 1, per_page: 12, total_pages: 0 };
  }
}

export default async function LibraryPage({ searchParams }: PageProps) {
  const params: ResourceListParams = {
    type:     (searchParams.type     as ResourceType)  || undefined,
    duration: (searchParams.duration as any)           || undefined,
    search:   (searchParams.search   as string)        || undefined,
    match:    (searchParams.match    as 'any' | 'all') || 'any',
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

  const data = await getResources(params);

  return (
    <div style={{ background: 'var(--body-bg)', padding: '2rem 2rem 4rem' }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        display: 'flex',
        gap: '2rem',
        alignItems: 'flex-start',
      }}>
        <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
          <FilterSidebar total={data.total} targetPath="/library" />
        </Suspense>

        <div style={{ flex: 1, minWidth: 0 }}>
          <SearchBar defaultValue={params.search} targetPath="/library" />

          {data.resources.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '4rem 2rem',
              color: 'var(--text-muted)', fontSize: '15px',
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}>
              No resources found matching your filters.
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.25rem',
                marginBottom: '2rem',
              }}>
                {data.resources.map((resource: any) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
              {data.total_pages > 1 && (params.page ?? 1) < data.total_pages && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <a
                    href={`/library?${new URLSearchParams({
                      ...Object.fromEntries(
                        Object.entries(searchParams)
                          .filter(([k]) => k !== 'page')
                          .flatMap(([k, v]) => Array.isArray(v) ? v.map(val => [k, val]) : [[k, v as string]])
                      ),
                      page: String((params.page || 1) + 1),
                    }).toString()}`}
                    style={{
                      background: 'var(--fgi-blue)', color: '#fff',
                      padding: '11px 36px', borderRadius: 'var(--radius-md)',
                      fontWeight: 600, fontSize: '15px', textDecoration: 'none',
                    }}
                  >
                    Load More
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
