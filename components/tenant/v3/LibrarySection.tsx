import { Suspense } from 'react';
import Link from 'next/link';
import AskLibrary from '@/components/library/AskLibrary';
import FilterSidebar from '@/components/library/FilterSidebar';
import ResourceGrid from '@/components/library/ResourceGrid';
import SearchBar from '@/components/library/SearchBar';
import { getSession } from '@/auth';
import { getCompletedResourceIds } from '@/lib/progress';
import { canSeeInternal, getViewer } from '@/lib/viewer';
import { getPublicResources } from '@/lib/resources';
import { filterQuery, loadedPages } from '@/lib/query';
import type { TenantConfig } from '@/lib/tenants';
import type { ResourceListParams, ResourceType, AudienceTag, TopicTag } from '@/types';

function normalizeType(v: string | string[] | undefined) {
  if (!v) return undefined;
  return (Array.isArray(v) ? v : [v]) as ResourceType[];
}

/*
 * The curated tenant library (sidebar + search + grid + Fletch), extracted
 * from the v3 landing on 8-31-26 so it can render in two places: embedded at
 * the bottom of the landing, and as the dedicated /<tenant>/library page
 * (Jason: Library in the header should behave like FGI's — the library moves
 * up under the header and stays there until Home). `targetPath` is where
 * filters, search, and paging navigate — both spots point it at the library
 * page, so touching any control locks the visitor into the library view.
 */
export default async function TenantLibrarySection({
  tenant, searchParams, targetPath,
}: {
  tenant: TenantConfig;
  searchParams: { [key: string]: string | string[] | undefined };
  targetPath: string;
}) {
  const v3 = tenant.v3!;
  // Completed-course checkmarks on the cards (Jennifer 8-29) — signed-in only.
  const session = await getSession();
  const completedIds = session?.user?.id ? await getCompletedResourceIds(session.user.id) : [];

  const params: ResourceListParams = {
    type:     normalizeType(searchParams.type),
    duration: (searchParams.duration as any)           || undefined,
    search:   (searchParams.search   as string)        || undefined,
    match:    (searchParams.match    as 'any' | 'all') || 'any',
    tenant:   tenant.slug,
    page:     parseInt((searchParams.page as string)   || '1', 10),
    per_page: 12,
  };
  if (searchParams.audience) {
    params.audience = (Array.isArray(searchParams.audience) ? searchParams.audience : [searchParams.audience]) as AudienceTag[];
  }
  if (searchParams.topic) {
    params.topic = (Array.isArray(searchParams.topic) ? searchParams.topic : [searchParams.topic]) as TopicTag[];
  }

  // Curated collection (the header's Post-Certification pill): restrict the
  // library to the tenant's slug list, in list order, all on one page. An
  // unknown key is ignored and the library renders as normal.
  const collectionKey = typeof searchParams.collection === 'string' ? searchParams.collection : undefined;
  const collection = collectionKey ? v3.collections?.[collectionKey] : undefined;
  if (collection) {
    params.slugs = collection.slugs;
    // Floor of 24, not the list length: combined with a type checkbox the
    // result is the UNION of both (8-31-26), so more rows than the list.
    params.per_page = Math.max(collection.slugs.length, 24);
    params.page = 1;
  }

  // "Cert. Documents" (type=handbook) gets the same Show-full-library banner
  // as the Required Videos collection (Jason, 8-31-26).
  const certDocs = Boolean(params.type?.includes('handbook' as ResourceType));

  // ?loaded=N (Back-navigation restore) — render pages 1..N in one go so the
  // browser can restore scroll. ?page (no-JS fallback) keeps precedence, and
  // a collection view is single-page so it ignores the stamp.
  const loaded = loadedPages(searchParams);
  const restoring = !collection && loaded > 1 && !searchParams.page;
  if (restoring) {
    params.page = 1;
    params.per_page = 12 * loaded;
  }

  params.includeInternal = canSeeInternal(await getViewer(), tenant.slug);
  const data = await getPublicResources(params);

  const linkQuery = filterQuery(searchParams);
  const apiQuery = filterQuery(searchParams, { tenant: tenant.slug });

  return (
    <>
      {/* ── Curated library (unchanged per Jason, 8-21) ── */}
      <section id="library" className="gutter" style={{ background: '#ffffff', paddingTop: '2.25rem', paddingBottom: '4rem', scrollMarginTop: '90px' }}>
        <div className="library-layout" style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
            <FilterSidebar
              total={data.total} targetPath={targetPath} isTenant
              fgiLibraryHref={`/library?from=${tenant.slug}`} fgiLibraryNewTab
            />
          </Suspense>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar defaultValue={params.search} targetPath={targetPath} />
            {(collection || certDocs) && (
              <div
                role="status"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '1rem', flexWrap: 'wrap',
                  margin: '0 0 1.25rem', padding: '12px 18px',
                  background: v3.highlightTileBg, border: `1px solid ${tenant.accent}`,
                  borderRadius: 'var(--radius-md, 8px)', fontSize: '15px', lineHeight: 1.4,
                }}
              >
                <span>
                  <strong>
                    {[collection?.label, certDocs ? 'Cert. Documents' : null].filter(Boolean).join(' & ')}
                  </strong>
                  {' — '}
                  {collection && !certDocs
                    ? <>showing {data.total} of {collection.slugs.length} required items</>
                    : <>showing {data.total} item{data.total === 1 ? '' : 's'}</>}
                </span>
                <Link
                  href={targetPath}
                  style={{ color: tenant.primary, fontWeight: 600, textDecoration: 'underline', whiteSpace: 'nowrap' }}
                >
                  Show full library
                </Link>
              </div>
            )}
            <ResourceGrid
              key={linkQuery}
              initial={data.resources}
              startPage={restoring ? loaded : (params.page ?? 1)}
              perPage={collection ? params.per_page! : 12}
              apiQuery={apiQuery}
              fallbackBase={targetPath}
              fallbackQuery={linkQuery}
              total={data.total}
              basePath={`/${tenant.slug}`}
              naadacPill={v3.naadacPill}
              completedIds={completedIds}
            />
          </div>
        </div>
      </section>

      <AskLibrary basePath={`/${tenant.slug}`} surface={tenant.slug} accent={tenant.primary} pillBg={tenant.primary} pillText="#fff" />
    </>
  );
}
