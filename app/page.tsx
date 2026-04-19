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
        <div style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: '3rem',
          alignItems: 'start',
        }}>
          {/* Left: copy */}
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--fgi-blue)',
              marginBottom: '1.25rem',
              lineHeight: 1.3,
            }}>
              Welcome to the Fletcher Group Educational Resource Center
            </h1>

            <p style={{ marginBottom: '0.9rem', fontSize: '15px', lineHeight: 1.7 }}>
              The Fletcher Group's Educational Resource Center is a no-cost, national platform created to
              support and strengthen the Substance Use Disorder Recovery Ecosystem in rural, urban, and
              metropolitan areas. It brings together a thoughtfully curated collection of resources designed
              to expand capacity, enhance quality, and improve access to recovery supports.
            </p>

            <p style={{ marginBottom: '0.6rem', fontSize: '15px' }}>
              Within the Center, you'll find a wide range of materials, including:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.9rem', fontSize: '15px', lineHeight: 1.85 }}>
              <li>Courses (including NAADAC CE-approved offerings)</li>
              <li>How-to toolkits</li>
              <li>Webinars</li>
              <li>Newsletters</li>
              <li>Podcasts</li>
              <li>Publications</li>
              <li>And more</li>
            </ul>

            <p style={{ marginBottom: '0.9rem', fontSize: '15px', lineHeight: 1.7 }}>
              This resource center is for everyone invested in recovery—recovery housing owners and
              operators, staff, residents, peer support specialists, clinicians, workforce professionals,
              allies, and community partners.
            </p>

            <p style={{ marginBottom: '1.25rem', fontSize: '15px', lineHeight: 1.7 }}>
              We invite you to explore, learn, and grow with us.
            </p>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              For assistance contact{' '}
              <a href="mailto:LC@fletchergroup.org">LC@fletchergroup.org</a>.
            </p>
          </div>

          {/* Right: Vimeo embed */}
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

          {/* ── Sidebar ── */}
          <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
            <FilterSidebar total={data.total} targetPath="/" />
          </Suspense>

          {/* ── Main content area ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Search bar */}
            <SearchBar defaultValue={params.search} targetPath="/" />

            {/* Grid */}
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

                {/* Load more / pagination */}
                {data.total_pages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: '1.5rem',
                  }}>
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
