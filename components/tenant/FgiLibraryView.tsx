import { Suspense } from 'react';
import Link from 'next/link';
import { getSession } from '@/auth';
import FilterSidebar from '@/components/library/FilterSidebar';
import ResourceGrid from '@/components/library/ResourceGrid';
import SearchBar from '@/components/library/SearchBar';
import { getCompletedResourceIds } from '@/lib/progress';
import { filterQuery } from '@/lib/query';
import { getPublicResources } from '@/lib/resources';
import type { TenantConfig } from '@/lib/tenants';
import type { AudienceTag, ResourceListParams, ResourceType, TopicTag } from '@/types';

/**
 * The full Fletcher Group catalogue, browsed from inside a tenant portal
 * (Jason + Jennifer, 8-29-26). Same sidebar + grid as the tenant's own
 * library, but querying the FGI surface, and every link stays on the tenant
 * (`/scarr/resource/...`), so the header, footer and Home never change
 * under the visitor. Reached from the sidebar's "Other Libraries" link.
 */
interface Props {
  tenant: TenantConfig;
  searchParams: { [key: string]: string | string[] | undefined };
}

function normalizeType(v: string | string[] | undefined) {
  if (!v) return undefined;
  return (Array.isArray(v) ? v : [v]) as ResourceType[];
}

/** "SCARR", "Colorado" — for the "← Back to SCARR Library" link. */
function shortName(tenant: TenantConfig): string {
  if (tenant.slug === 'scarr') return 'SCARR';
  return tenant.slug.charAt(0).toUpperCase() + tenant.slug.slice(1);
}

export default async function FgiLibraryView({ tenant, searchParams }: Props) {
  const home = `/${tenant.slug}`;
  const libraryPath = `${home}/library`;
  const v3 = tenant.v3;

  const session = await getSession();
  const completedIds = session?.user?.id ? await getCompletedResourceIds(session.user.id) : [];

  const params: ResourceListParams = {
    type:     normalizeType(searchParams.type),
    duration: (searchParams.duration as any)           || undefined,
    search:   (searchParams.search   as string)        || undefined,
    match:    (searchParams.match    as 'any' | 'all') || 'any',
    tenant:   'fgi',
    page:     parseInt((searchParams.page as string)   || '1', 10),
    per_page: 12,
  };
  if (searchParams.audience) {
    params.audience = (Array.isArray(searchParams.audience) ? searchParams.audience : [searchParams.audience]) as AudienceTag[];
  }
  if (searchParams.topic) {
    params.topic = (Array.isArray(searchParams.topic) ? searchParams.topic : [searchParams.topic]) as TopicTag[];
  }

  const data = await getPublicResources(params);
  const linkQuery = filterQuery(searchParams);
  const apiQuery = filterQuery(searchParams, { tenant: 'fgi' });
  const back = `${home}#library`;

  return (
    <section style={{ background: '#ffffff', padding: '2rem 2rem 4rem' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>

        {/* Banner — says whose catalogue this is and how to get back */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem 2rem', flexWrap: 'wrap',
          padding: '18px 22px', marginBottom: '1.75rem',
          background: v3?.highlightTileBg ?? 'var(--fgi-tile)',
          border: `1px solid ${tenant.accent}`, borderRadius: 'var(--radius-md, 8px)',
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
              Fletcher Group Library
            </h1>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              The full Fletcher Group catalogue of recovery ecosystem support resources, hosted on
              the FGI platform. Anything you open here stays inside your {shortName(tenant)} Learning Center.
            </p>
          </div>
          <Link
            href={back}
            style={{
              flexShrink: 0, fontSize: '15px', fontWeight: 700, textDecoration: 'none',
              color: v3?.contactButton?.fg ?? '#ffffff',
              background: v3?.contactButton?.bg ?? tenant.primary,
              borderRadius: '999px', padding: '10px 20px',
            }}
          >
            ← Back to {shortName(tenant)} Library
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <Suspense fallback={<div style={{ width: '252px', flexShrink: 0 }} />}>
            {/* isTenant=false: the FGI catalogue keeps every type (podcasts,
                newsletters…) and has no Certification Info group. */}
            <FilterSidebar
              total={data.total} targetPath={libraryPath}
              fgiLibraryHref={back} fgiLibraryLabel={`${shortName(tenant)} Library`}
            />
          </Suspense>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar defaultValue={params.search} targetPath={libraryPath} />
            <ResourceGrid
              key={linkQuery}
              initial={data.resources}
              startPage={params.page ?? 1}
              totalPages={data.total_pages}
              perPage={params.per_page!}
              apiQuery={apiQuery}
              fallbackBase={libraryPath}
              fallbackQuery={linkQuery}
              total={data.total}
              basePath={home}
              naadacPill={v3?.naadacPill}
              completedIds={completedIds}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
