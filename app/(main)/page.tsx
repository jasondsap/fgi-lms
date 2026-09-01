import { Suspense } from 'react';
import FilterSidebar from '@/components/library/FilterSidebar';
import AskLibrary from '@/components/library/AskLibrary';
import ResourceGrid from '@/components/library/ResourceGrid';
import SearchBar from '@/components/library/SearchBar';
import HeroVisual from '@/components/home/HeroVisual';
import LatestHighlights, { type HighlightTile } from '@/components/home/LatestHighlights';
import ContactButton from '@/components/layout/ContactButton';
import { getSession } from '@/auth';
import { getCompletedResourceIds } from '@/lib/progress';
import { canSeeInternal, getViewer } from '@/lib/viewer';
import { getLatestByType, getPublicResources } from '@/lib/resources';
import { filterQuery, loadedPages } from '@/lib/query';
import type { ResourceListParams, ResourceType, AudienceTag, TopicTag } from '@/types';

// Resource Type is a multi-select in the sidebar, so this arrives as a string
// when one box is ticked and an array when several are.
function normalizeType(v: string | string[] | undefined) {
  if (!v) return undefined;
  return (Array.isArray(v) ? v : [v]) as ResourceType[];
}

// The search snippet Jason wants Google to show (8-31-26) — the home-page
// welcome copy, with the bare domain as canonical so every filtered/query
// variant of the home URL consolidates onto fgilearn.org.
export const metadata = {
  title: 'Fletcher Group Learning Resource Center',
  description: 'Welcome! Your one-stop, no-cost library for building stronger recovery housing and support programs — courses, guides, webinars, podcasts, NAADAC CE opportunities, research, and more. Whether you’re opening your first recovery home, leading an established program, working as a peer or recovery support provider, or a community partner, there’s something here for you.',
  alternates: { canonical: '/' },
};

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function HomePage({ searchParams }: PageProps) {
  const params: ResourceListParams = {
    type:     normalizeType(searchParams.type),
    duration: (searchParams.duration as any)           || undefined,
    search:   (searchParams.search   as string)        || undefined,
    match:    (searchParams.match    as 'any' | 'all') || 'any',
    page:     parseInt((searchParams.page as string)   || '1', 10),
    per_page: 12,
  };
  // ?loaded=N (Back-navigation restore) — see /library; ?page keeps precedence.
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

  // Call DB directly — no internal HTTP fetch
  params.includeInternal = canSeeInternal(await getViewer(), 'fgi');
  const data = await getPublicResources(params);
  const query = filterQuery(searchParams);
  const session = await getSession();
  const completedIds = session?.user?.id ? await getCompletedResourceIds(session.user.id) : [];

  // "Latest Highlights" is live data for every type the catalog actually
  // holds. Podcasts have no rows yet, so that tile simply drops out until
  // they are loaded rather than showing a hardcoded title.
  const [latestPodcast, latestWebinar, latestBrief] = await Promise.all([
    getLatestByType('podcast'),
    getLatestByType('webinar'),
    getLatestByType('toolkit'),
  ]);

  const highlights: HighlightTile[] = [
    latestPodcast && {
      label: 'Podcast', title: latestPodcast.title,
      href: `/resource/${latestPodcast.slug}`,
      naadac: Boolean(latestPodcast.is_naadac_ce),
      icon: '/images/category-cards/podcast.webp',
    },
    latestWebinar && {
      label: 'Webinar', title: latestWebinar.title,
      href: `/resource/${latestWebinar.slug}`,
      naadac: Boolean(latestWebinar.is_naadac_ce),
      icon: '/images/category-cards/webinar.webp',
    },
    latestBrief && {
      label: 'Learning Brief', title: latestBrief.title,
      href: `/resource/${latestBrief.slug}`,
      naadac: Boolean(latestBrief.is_naadac_ce),
      icon: '/images/category-cards/learning.webp',
    },
  ].filter(Boolean) as HighlightTile[];

  return (
    <div>
      {/* ── Hero (8-10-26 mockup) ── */}
      <section style={{
        background: 'var(--fgi-hero)',
        borderBottomRightRadius: '60px',
        padding: '0 2rem',
      }}>
        <div style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 620px',
          gap: '4rem',
          alignItems: 'start',
        }}>
          {/* Left: welcome copy. The mockup gives the artwork the full height of
              the blue band, so the top padding lives on this column only. */}
          <div style={{ maxWidth: '530px', paddingTop: '3.75rem', paddingBottom: '2rem' }}>
            <div style={{
              fontSize: '24px', fontWeight: 400, color: 'var(--fgi-navy)',
              lineHeight: 1.2, marginBottom: '2px',
            }}>
              Learning Resource Center
            </div>

            <h1 style={{
              fontSize: '52px', fontWeight: 700, color: 'var(--fgi-navy)',
              margin: '0 0 1.9rem', lineHeight: 1.1,
              textShadow: '3px 3px 0 rgba(22,61,91,0.13)',
            }}>
              Welcome!
            </h1>

            <p style={{
              marginBottom: '1.4rem', fontSize: '17px', lineHeight: 1.65,
              color: 'var(--fgi-navy)',
            }}>
              Your one-stop, no-cost library for building stronger recovery housing and support
              programs &mdash;{' '}
              <strong>courses, guides, webinars, podcasts, NAADAC CE opportunities, research,
              and more.</strong>
            </p>
            <p style={{
              marginBottom: '1.9rem', fontSize: '17px', lineHeight: 1.65,
              color: 'var(--fgi-navy)',
            }}>
              Whether you&#x2019;re opening your first recovery home, leading an established program,
              working as a peer or recovery support provider, or a community partner, there&#x2019;s
              something here for you.
            </p>

            {/* Explore • Learn • Grow */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              borderLeft: '4px solid var(--fgi-gold)', paddingLeft: '16px',
              fontSize: '22px', fontWeight: 700, color: 'var(--fgi-navy)',
            }}>
              <span>Explore</span>
              <span aria-hidden style={{
                width: '9px', height: '9px', borderRadius: '50%',
                background: 'var(--fgi-teal)', flexShrink: 0,
              }} />
              <span>Learn</span>
              <span aria-hidden style={{
                width: '9px', height: '9px', borderRadius: '50%',
                background: 'var(--fgi-teal)', flexShrink: 0,
              }} />
              <span>Grow</span>
            </div>
          </div>

          {/* Right: Who We Are video + ripple + photo bubbles */}
          <HeroVisual />
        </div>
      </section>

      {/* ── Latest Highlights — overlaps the hero band ── */}
      <LatestHighlights tiles={highlights} />

      {/* ── Learning Center Support bar ── */}
      <section style={{
        background: 'var(--fgi-band)',
        padding: '1.4rem 2rem',
        marginTop: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Learning Center Support
        </span>
        <ContactButton />
      </section>

      {/* ── Library ── */}
      <section style={{ background: '#ffffff', padding: '2.25rem 2rem 4rem' }}>
        <div style={{
          maxWidth: 'var(--max-width)', margin: '0 auto',
          display: 'flex', gap: '2rem', alignItems: 'flex-start',
        }}>
          <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
            <FilterSidebar total={data.total} targetPath="/" />
          </Suspense>

          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar defaultValue={params.search} targetPath="/" />

            {/* key resets the accumulated list whenever a filter changes */}
            <ResourceGrid
              key={query}
              initial={data.resources}
              startPage={loaded > 1 && !searchParams.page ? loaded : (params.page ?? 1)}
              perPage={12}
              apiQuery={query}
              fallbackBase="/"
              fallbackQuery={query}
              total={data.total}
              completedIds={completedIds}
            />
          </div>
        </div>
      </section>
      <AskLibrary />
    </div>
  );
}
