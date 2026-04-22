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
    const res = await fetch(`${base}/api/resources?${qs.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { resources: [], total: 0, page: 1, per_page: 12, total_pages: 0 };
    return res.json();
  } catch {
    return { resources: [], total: 0, page: 1, per_page: 12, total_pages: 0 };
  }
}

export default async function HomePage({ searchParams }: PageProps) {
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
    <div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{
        background: '#ffffff',
        borderBottom: '1px solid #e8e8e8',
        padding: '2.5rem 2rem 2rem',
      }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>

          {/* Centered title */}
          <h1 style={{
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--fgi-blue)',
            marginBottom: '1.75rem',
            lineHeight: 1.3,
            textAlign: 'center',
          }}>
            Welcome to the Fletcher Group Learning Resource Center
          </h1>

          {/* Two-column: copy left, video right */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: '3rem',
            alignItems: 'start',
          }}>
            {/* Left: body copy */}
            <div>
              <p style={{ marginBottom: '1rem', fontSize: '15px', lineHeight: 1.75 }}>
                The Fletcher Group&#x2019;s Learning Resource Center is a no-cost, national platform
                dedicated to supporting and strengthening the Substance Use Disorder Recovery Ecosystem
                across rural, urban, and metropolitan communities. It offers a curated collection of
                resources designed to expand capacity, enhance quality, and improve access to recovery
                supports.
              </p>

              <p style={{ marginBottom: '1rem', fontSize: '15px', lineHeight: 1.75 }}>
                Within the Center, you&#x2019;ll find a wide range of materials, including courses (some
                NAADAC CE-approved), how-to toolkits, recovery housing (RH) guidebooks and handbooks,
                webinars, podcasts, publications, newsletters, success stories, and more.
              </p>

              <p style={{ marginBottom: '1rem', fontSize: '15px', lineHeight: 1.75 }}>
                The learning resource center is for everyone invested in recovery&#x2014;recovery housing
                owners and operators, staff, residents, peer supports, clinicians, workforce and criminal
                justice professionals, allies, and community partners.
              </p>

              <p style={{ fontSize: '15px', lineHeight: 1.75 }}>
                We invite you to explore, learn, and grow with us.
              </p>
            </div>

            {/* Right: Vimeo embed + email below */}
            <div>
              <div style={{
                position: 'relative',
                paddingTop: '56.25%',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                background: '#111',
              }}>
                <iframe
                  src="https://player.vimeo.com/video/1181685318?h=3d4673b6ea&badge=0&autopause=0&player_id=0&app_id=58479"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  title="FGI Who We Are"
                />
              </div>

              <a
                href="https://airtable.com/appDb16SxhhHo4TeX/page3ondJkFAWb73q/form"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  marginTop: '10px',
                  background: 'var(--fgi-blue)',
                  color: '#fff',
                  textAlign: 'center',
                  padding: '10px 0',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                Who We Are
              </a>

              {/* Email — balanced under video */}
              <p style={{
                marginTop: '12px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}>
                For support contact{' '}
                <a href="mailto:LC@fletchergroup.org" style={{ color: 'var(--fgi-blue)' }}>
                  LC@fletchergroup.org
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Library (search + sidebar + grid) ────────────────────────── */}
      <section style={{
        background: 'var(--body-bg)',
        padding: '2rem 2rem 4rem',
      }}>
        <div style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          display: 'flex',
          gap: '2rem',
          alignItems: 'flex-start',
        }}>

          {/* Sidebar */}
          <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
            <FilterSidebar total={data.total} targetPath="/" />
          </Suspense>

          {/* Main content area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar defaultValue={params.search} targetPath="/" />

            {data.resources.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                color: 'var(--text-muted)',
                fontSize: '15px',
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

                {data.total_pages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                    {(params.page ?? 1) < data.total_pages && (
                      <a
                        href={`/?${new URLSearchParams({
                          ...Object.fromEntries(
                            Object.entries(searchParams)
                              .filter(([k]) => k !== 'page')
                              .flatMap(([k, v]) => Array.isArray(v) ? v.map(val => [k, val]) : [[k, v as string]])
                          ),
                          page: String((params.page || 1) + 1),
                        }).toString()}`}
                        style={{
                          background: 'var(--fgi-blue)',
                          color: '#fff',
                          padding: '11px 36px',
                          borderRadius: 'var(--radius-md)',
                          fontWeight: 600,
                          fontSize: '15px',
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        Load More
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
