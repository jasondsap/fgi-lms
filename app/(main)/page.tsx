import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import FilterSidebar from '@/components/library/FilterSidebar';
import ResourceCard from '@/components/library/ResourceCard';
import SearchBar from '@/components/library/SearchBar';
import { getPublicResources } from '@/lib/resources';
import type { ResourceListParams, ResourceType, AudienceTag, TopicTag } from '@/types';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

// Small "New This Month" promo tile: square thumbnail + label + item title.
function NewThisMonthTile({ href, image, label, title }: {
  href: string; image: string; label: string; title: string;
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none',
    }}>
      <Image
        src={image}
        alt=""
        width={96}
        height={96}
        style={{ objectFit: 'cover', borderRadius: '2px', flexShrink: 0, width: '96px', height: '96px' }}
      />
      <div>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--fgi-navy)', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-body-dark)' }}>
          {title}
        </div>
      </div>
    </Link>
  );
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

  // Call DB directly — no internal HTTP fetch
  const data = await getPublicResources(params);

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{
        background: '#ffffff',
        borderBottom: '1px solid #e8e8e8',
        padding: '3rem 2rem 2.5rem',
      }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '42px', fontWeight: 800, color: 'var(--fgi-navy)',
            marginBottom: '2.5rem', lineHeight: 1.2,
          }}>
            Welcome to the Learning Resource Center
          </h1>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 420px',
            gap: '3.5rem',
            alignItems: 'start',
          }}>
            {/* Left: body copy */}
            <div>
              <p style={{ marginBottom: '1.35rem', fontSize: '17px', lineHeight: 1.7, textAlign: 'justify' }}>
                Your one-stop, no-cost library for building stronger recovery housing and support
                programs &mdash; courses, guides, webinars, podcasts, NAADAC CE opportunities,
                research, and more.
              </p>
              <p style={{ marginBottom: '1.35rem', fontSize: '17px', lineHeight: 1.7, textAlign: 'justify' }}>
                Whether you&#x2019;re opening your first recovery home, leading an established program,
                working as a peer or recovery support provider, or a community partner, there&#x2019;s
                something here for you.
              </p>
              <p style={{ fontSize: '17px', lineHeight: 1.7 }}>
                Explore, learn, and grow with us.
              </p>
            </div>

            {/* Right: Who We Are video */}
            <div style={{
              border: '10px solid var(--fgi-navy)',
              background: 'var(--fgi-navy)',
              borderRadius: '2px',
            }}>
              <div style={{
                position: 'relative', paddingTop: '56.25%',
                overflow: 'hidden', background: '#111',
              }}>
                <iframe
                  src="https://player.vimeo.com/video/1181685318?h=3d4673b6ea&badge=0&autopause=0&player_id=0&app_id=58479"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  title="FGI Who We Are"
                />
              </div>
            </div>
          </div>

          {/* ── New This Month ── */}
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{
              fontSize: '26px', fontWeight: 700, fontStyle: 'italic',
              color: 'var(--fgi-navy)', marginBottom: '1.25rem',
            }}>
              New This Month
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
              alignItems: 'center',
            }}>
              {/* TODO: swap these two tiles to the newest published podcast/webinar
                  from Neon once podcast resources are loaded. */}
              <NewThisMonthTile
                href="/library?type=podcast"
                image="/images/category-cards/podcast.png"
                label="Latest Podcast"
                title="Launch episode"
              />
              <NewThisMonthTile
                href="/library?type=webinar"
                image="/images/category-cards/webinar.png"
                label="Latest Webinar"
                title="Building Recovery Ecosystems"
              />

              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                For support contact{' '}
                <a href="mailto:LC@fletchergroup.org" style={{ color: 'var(--fgi-blue)' }}>
                  LC@fletchergroup.org
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Library ── */}
      <section style={{ background: 'var(--body-bg)', padding: '2rem 2rem 4rem' }}>
        <div style={{
          maxWidth: 'var(--max-width)', margin: '0 auto',
          display: 'flex', gap: '2rem', alignItems: 'flex-start',
        }}>
          <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
            <FilterSidebar total={data.total} targetPath="/" />
          </Suspense>

          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar defaultValue={params.search} targetPath="/" />

            {data.resources.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '4rem 2rem',
                color: 'var(--text-muted)', fontSize: '15px',
                background: 'var(--card-bg)', borderRadius: 'var(--radius-md)',
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
                          background: 'var(--fgi-blue)', color: '#fff',
                          padding: '11px 36px', borderRadius: 'var(--radius-md)',
                          fontWeight: 600, fontSize: '15px', textDecoration: 'none',
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
