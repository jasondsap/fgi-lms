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

// Small "New This Month" promo tile: bordered pill with a square thumbnail +
// label + item title (7-22-26 mockup).
function NewThisMonthTile({ href, image, label, title }: {
  href: string; image: string; label: string; title: string;
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none',
      border: '1px solid #cfe0ec', borderRadius: '12px', padding: '12px 20px 12px 12px',
      background: '#ffffff',
    }}>
      <Image
        src={image}
        alt=""
        width={72}
        height={72}
        style={{ objectFit: 'cover', borderRadius: '6px', flexShrink: 0, width: '72px', height: '72px' }}
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
        padding: '2.75rem 2rem 2.5rem',
      }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          {/* Eyebrow: flag + Learning Resource Center */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <Image
              src="/images/logos/fgi-flag.png"
              alt=""
              width={38}
              height={35}
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />
            <span style={{ fontSize: '30px', fontWeight: 400, color: 'var(--fgi-navy)', lineHeight: 1.1 }}>
              Learning Resource Center
            </span>
          </div>

          {/* Welcome heading + gold underline */}
          <h1 style={{
            fontSize: '62px', fontWeight: 800, color: '#111111',
            margin: '0 0 12px', lineHeight: 1.05,
          }}>
            Welcome
          </h1>
          <div style={{
            width: '148px', height: '5px', background: 'var(--fgi-gold)',
            borderRadius: '2px', marginBottom: '2.5rem',
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 540px',
            gap: '3rem',
            alignItems: 'start',
          }}>
            {/* Left: body copy */}
            <div>
              <p style={{ marginBottom: '1.35rem', fontSize: '17px', lineHeight: 1.7 }}>
                Your one-stop, no-cost library for building stronger recovery housing and support
                programs &mdash;{' '}
                <strong>courses, guides, webinars, podcasts, NAADAC CE opportunities, research,
                and more.</strong>
              </p>
              <p style={{ marginBottom: '1.5rem', fontSize: '17px', lineHeight: 1.7 }}>
                Whether you&#x2019;re opening your first recovery home, leading an established program,
                working as a peer or recovery support provider, or a community partner, there&#x2019;s
                something here for you.
              </p>
              <p style={{
                fontSize: '17px', lineHeight: 1.7, fontWeight: 700,
                borderLeft: '4px solid var(--fgi-gold)', paddingLeft: '14px',
              }}>
                Explore, learn, and grow with us.
              </p>
            </div>

            {/* Right: Who We Are video */}
            <div style={{
              border: '10px solid var(--fgi-navy)',
              background: 'var(--fgi-navy)',
              borderRadius: '16px',
            }}>
              <div style={{
                position: 'relative', paddingTop: '56.25%',
                overflow: 'hidden', background: '#111', borderRadius: '6px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '26px', fontWeight: 700, fontStyle: 'italic',
                color: 'var(--fgi-navy)', whiteSpace: 'nowrap',
              }}>
                New This Month
              </h2>
              <div style={{ flex: 1, height: '2px', background: 'var(--fgi-gold)' }} />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '2rem',
            }}>
              {/* TODO: swap these two tiles to the newest published podcast/webinar
                  from Neon once podcast resources are loaded. */}
              <NewThisMonthTile
                href="/library?type=podcast"
                image="/images/category-cards/podcast.png"
                label="Latest Podcast"
                title="Building Recovery Ecosystems"
              />
              <NewThisMonthTile
                href="/library?type=webinar"
                image="/images/category-cards/webinar.png"
                label="Latest Webinar"
                title="The Brain in Early Recovery"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Need help? support bar — full-bleed tan (7-22-26) ── */}
      <section style={{
        background: 'var(--fgi-tan)',
        padding: '1.15rem 2rem',
        textAlign: 'center',
      }}>
        <a href="mailto:LC@fletchergroup.org" style={{
          fontSize: '16px', color: 'var(--fgi-navy)', textDecoration: 'underline',
        }}>
          Need help? Contact us at <strong>LC@fletchergroup.org</strong>
        </a>
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
