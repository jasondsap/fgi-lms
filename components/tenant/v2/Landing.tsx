import { Suspense } from 'react';
import Image from 'next/image';
import AskLibrary from '@/components/library/AskLibrary';
import FilterSidebar from '@/components/library/FilterSidebar';
import ResourceGrid from '@/components/library/ResourceGrid';
import SearchBar from '@/components/library/SearchBar';
import LatestHighlights, { type HighlightTile } from '@/components/home/LatestHighlights';
import TenantHeroVisual from './HeroVisual';
import { getLatestByType, getPublicResources } from '@/lib/resources';
import { filterQuery } from '@/lib/query';
import { TENANT_HOSTED_TEXT, type TenantConfig } from '@/lib/tenants';
import type { ResourceListParams, ResourceType, AudienceTag, TopicTag } from '@/types';

// Resource Type is a multi-select in the sidebar, so this arrives as a string
// when one box is ticked and an array when several are.
function normalizeType(v: string | string[] | undefined) {
  if (!v) return undefined;
  return (Array.isArray(v) ? v : [v]) as ResourceType[];
}

interface Props {
  tenant: TenantConfig;
  searchParams: { [key: string]: string | string[] | undefined };
}

/*
 * v2 tenant landing page — Jennifer's 8-11-26 Colorado mockup. Structurally it
 * follows the rebuilt FGI homepage (hero band, overlapping Latest Highlights,
 * support bar, library) with one block FGI does not have: the full-bleed
 * certification band between the support bar and the library.
 *
 * Tenants without a `v2` block keep components/tenant/TenantLanding.tsx.
 */
export default async function TenantLandingV2({ tenant, searchParams }: Props) {
  const home = `/${tenant.slug}`;
  const v2 = tenant.v2!;

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

  const data = await getPublicResources(params);

  // Highlights are FGI's newest items, and they point at the FGI site: these
  // resources are FGI-only, so they are not in the tenant's own library.
  const [latestPodcast, latestWebinar, latestBrief] = await Promise.all([
    getLatestByType('podcast'),
    getLatestByType('webinar'),
    getLatestByType('toolkit'),
  ]);
  const highlights: HighlightTile[] = [
    latestPodcast && {
      label: 'Podcast', title: latestPodcast.title,
      href: `${tenant.fgiSiteUrl}/resource/${latestPodcast.slug}`,
      naadac: Boolean(latestPodcast.is_naadac_ce),
      icon: '/images/category-cards/podcast.webp',
    },
    latestWebinar && {
      label: 'Webinar', title: latestWebinar.title,
      href: `${tenant.fgiSiteUrl}/resource/${latestWebinar.slug}`,
      naadac: Boolean(latestWebinar.is_naadac_ce),
      icon: '/images/category-cards/webinar.webp',
    },
    latestBrief && {
      label: 'Learning Brief', title: latestBrief.title,
      href: `${tenant.fgiSiteUrl}/resource/${latestBrief.slug}`,
      naadac: Boolean(latestBrief.is_naadac_ce),
      icon: '/images/category-cards/learning.webp',
    },
  ].filter(Boolean) as HighlightTile[];

  // The surface comes from the route here, not the URL, so the API query needs
  // `tenant` added explicitly; the visible href keeps the clean tenant path.
  const linkQuery = filterQuery(searchParams);
  const apiQuery = filterQuery(searchParams, { tenant: tenant.slug });

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{
        background: v2.heroBg,
        borderBottomRightRadius: '60px',
        padding: '0 2rem',
      }}>
        <div style={{
          maxWidth: 'var(--max-width)', margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 620px', gap: '4rem',
          alignItems: 'start',
        }}>
          {/* Left: welcome copy. The artwork fills the band's full height, so
              the top padding lives on this column only. */}
          <div style={{ maxWidth: '530px', paddingTop: '3.75rem', paddingBottom: '2rem' }}>
            <div style={{
              fontSize: '24px', color: tenant.primary, lineHeight: 1.2, marginBottom: '2px',
            }}>
              Learning Resource Center
            </div>

            <h1 style={{
              fontSize: '52px', fontWeight: 700, color: tenant.primary,
              margin: '0 0 1.9rem', lineHeight: 1.1,
              textShadow: '3px 3px 0 rgba(0,25,112,0.13)',
            }}>
              Welcome!
            </h1>

            {tenant.heroParagraphs.map((html, i) => (
              <p
                key={i}
                style={{
                  marginBottom: i === tenant.heroParagraphs.length - 1 ? '1.9rem' : '1.4rem',
                  fontSize: '17px', lineHeight: 1.65, color: tenant.primary,
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ))}

            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              borderLeft: `4px solid ${tenant.accent}`, paddingLeft: '16px',
              fontSize: '22px', fontWeight: 700, color: tenant.primary,
            }}>
              <span>Explore</span>
              <span aria-hidden style={{
                width: '9px', height: '9px', borderRadius: '50%',
                background: tenant.accent, flexShrink: 0,
              }} />
              <span>Learn</span>
              <span aria-hidden style={{
                width: '9px', height: '9px', borderRadius: '50%',
                background: tenant.accent, flexShrink: 0,
              }} />
              <span>Grow</span>
            </div>
          </div>

          <TenantHeroVisual tenant={tenant} />
        </div>
      </section>

      {/* ── Latest Highlights — overlaps the hero band ── */}
      <LatestHighlights
        tiles={highlights}
        tileBg={v2.highlightTileBg}
        tileBorder="#e7e2cd"
        tileBorderHover="#d8d0b2"
        accent={tenant.accent}
        newTab
      />

      {/* ── Hosted-on-FGI bar ── */}
      <section style={{
        background: v2.hostedBar2.bg, color: v2.hostedBar2.fg,
        padding: '1.25rem 2rem', marginTop: '0.5rem',
      }}>
        <div style={{
          maxWidth: 'var(--max-width)', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '2rem', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px', fontWeight: 700 }}>Need Platform Help?</span>
            <a
              href="mailto:LC@fletchergroup.org"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '9px',
                background: tenant.primary, color: '#ffffff', fontSize: '16px',
                textDecoration: 'none', padding: '9px 22px', borderRadius: '999px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M2.5 11.1 20.6 3.3c.8-.3 1.5.4 1.2 1.2l-7.8 18.1c-.3.8-1.5.8-1.7-.1l-1.9-7-7-1.9c-.9-.2-.9-1.4-.1-1.7z" />
              </svg>
              {v2.hostedBar2.buttonLabel}
            </a>
          </div>

          <Image
            src="/images/logos/fgi-logo-dark.webp"
            alt="Fletcher Group"
            width={900}
            height={236}
            style={{ objectFit: 'contain', width: 'auto', maxHeight: '46px' }}
          />

          <div style={{ fontSize: '15px', lineHeight: 1.5 }}>{TENANT_HOSTED_TEXT}</div>
        </div>
      </section>

      {/* ── Certification band (full-bleed) ── */}
      <section style={{ background: tenant.primary, padding: '2.25rem 2rem' }}>
        <div style={{
          maxWidth: 'var(--max-width)', margin: '0 auto',
          background: '#ffffff',
          display: 'grid', gridTemplateColumns: '1fr 340px', alignItems: 'stretch',
        }}>
          <div style={{ padding: '1.75rem 2rem' }}>
            <h2 style={{
              fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)',
              marginBottom: '1.1rem',
            }}>
              {v2.certification.heading}
            </h2>
            <div
              className="tenant-prose"
              style={{ fontSize: '17px', lineHeight: 1.55, color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: v2.certification.bodyHtml }}
            />
          </div>

          <div style={{
            background: v2.certification.panelBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: v2.certification.imagePadding ?? '1.5rem',
          }}>
            <Image
              src={v2.certification.image}
              alt={v2.certification.imageAlt}
              width={900}
              height={502}
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </section>

      {/* ── Curated library ── */}
      <section id="library" style={{ background: '#ffffff', padding: '2.25rem 2rem 4rem', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
            <FilterSidebar total={data.total} targetPath={home} isTenant />
          </Suspense>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar defaultValue={params.search} targetPath={home} />
            {/* key resets the accumulated list whenever a filter changes */}
            <ResourceGrid
              key={linkQuery}
              initial={data.resources}
              startPage={params.page ?? 1}
              totalPages={data.total_pages}
              perPage={params.per_page!}
              apiQuery={apiQuery}
              fallbackBase={home}
              fallbackQuery={linkQuery}
              total={data.total}
              basePath={home}
            />
          </div>
        </div>
      </section>

      {/* Scoped to this tenant's catalog and chrome. */}
      <AskLibrary basePath={home} surface={tenant.slug} accent={tenant.primary} pillBg={tenant.primary} pillText="#fff" />
    </div>
  );
}
