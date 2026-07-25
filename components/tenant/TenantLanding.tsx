import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import FilterSidebar from '@/components/library/FilterSidebar';
import ResourceGrid from '@/components/library/ResourceGrid';
import SearchBar from '@/components/library/SearchBar';
import { getPublicResources } from '@/lib/resources';
import { filterQuery } from '@/lib/query';
import { TENANT_HOSTED_TEXT, type TenantConfig } from '@/lib/tenants';
import type { ResourceListParams, ResourceType, AudienceTag, TopicTag } from '@/types';

interface Props {
  tenant: TenantConfig;
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function TenantLanding({ tenant, searchParams }: Props) {
  const home = `/${tenant.slug}`;

  const params: ResourceListParams = {
    type:     (searchParams.type     as ResourceType)  || undefined,
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
  // The surface comes from the route here, not the URL, so the API query needs
  // `tenant` added explicitly; the visible href keeps the clean tenant path.
  const linkQuery = filterQuery(searchParams);
  const apiQuery = filterQuery(searchParams, { tenant: tenant.slug });
  // Same Fletcher Group mark on every tenant's hosted bar (per Jason).
  const fgiLogo = '/images/logos/fgi-logo-transparent.png';

  return (
    <div>
      {/* ── Hero ── */}
      <section style={{ background: '#ffffff', borderBottom: '1px solid #e8e8e8', padding: '2.75rem 2rem 2.5rem' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div style={{ fontSize: '22px', fontWeight: 400, color: tenant.primary, marginBottom: '2px' }}>
            Learning Center
          </div>
          <h1 style={{ fontSize: '58px', fontWeight: 800, color: '#111111', margin: '0 0 12px', lineHeight: 1.05 }}>
            Welcome
          </h1>
          <div style={{ width: '148px', height: '5px', background: tenant.accent, borderRadius: '2px', marginBottom: '2.25rem' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '3rem', alignItems: 'center' }}>
            <div>
              {tenant.heroParagraphs.map((html, i) => (
                <p
                  key={i}
                  style={{ marginBottom: i === tenant.heroParagraphs.length - 1 ? 0 : '1.35rem', fontSize: '17px', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ))}
            </div>

            {tenant.heroRight.kind === 'video' ? (
              <div style={{ border: `10px solid ${tenant.primary}`, background: tenant.primary, borderRadius: '16px' }}>
                <div style={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden', background: '#111', borderRadius: '6px' }}>
                  <iframe
                    src={tenant.heroRight.embedUrl}
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    title={tenant.heroRight.title}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Image
                  src={tenant.heroRight.src}
                  alt={tenant.heroRight.alt}
                  width={340}
                  height={300}
                  style={{ objectFit: 'contain', width: '100%', maxWidth: '340px', height: 'auto' }}
                  priority
                />
              </div>
            )}
          </div>

          {/* New This Month — shared FGI highlights */}
          <div style={{ marginTop: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '26px', fontWeight: 700, fontStyle: 'italic', color: tenant.primary, whiteSpace: 'nowrap' }}>
                New This Month
              </h2>
              <div style={{ flex: 1, height: '2px', background: tenant.accent }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
              <NewThisMonthTile
                href={`${tenant.fgiSiteUrl}/library?type=podcast`}
                image="/images/category-cards/podcast.png"
                label="FGI's Latest Podcast" title="Building Recovery Ecosystems"
                color={tenant.primary}
              />
              <NewThisMonthTile
                href={`${tenant.fgiSiteUrl}/library?type=webinar`}
                image="/images/category-cards/webinar.png"
                label="FGI's Latest Webinar" title="Building Recovery Ecosystems"
                color={tenant.primary}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Hosted-on-FGI bar (full-bleed) ── */}
      <section style={{ background: tenant.hostedBar.bg, color: tenant.hostedBar.fg, padding: '1rem 2rem' }}>
        <div style={{
          maxWidth: 'var(--max-width)', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '1.75rem', alignItems: 'center',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, maxWidth: '170px' }}>
            Need help? Contact us at{' '}
            <a href="mailto:LC@fletchergroup.org" style={{ color: tenant.hostedBar.fg, textDecoration: 'underline' }}>
              LC@fletchergroup.org
            </a>
          </div>
          <Image src={fgiLogo} alt="Fletcher Group" width={130} height={34}
            style={{ objectFit: 'contain', width: 'auto', maxHeight: '38px' }} />
          <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{TENANT_HOSTED_TEXT}</div>
        </div>
      </section>

      {/* ── Certification / instruction block ── */}
      <section style={{ background: 'var(--body-bg)', padding: '2.5rem 2rem 0' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div style={{
            background: tenant.instruction.bg, color: tenant.instruction.fg,
            borderRadius: 'var(--radius-lg)', padding: '2rem 2.5rem',
          }}>
            <h2 style={{ fontSize: '19px', fontWeight: 700, textAlign: 'center', marginBottom: '1.25rem' }}>
              {tenant.instruction.heading}
            </h2>
            <div className="tenant-prose" style={{ fontSize: '15px', lineHeight: 1.6, textAlign: 'center' }}
              dangerouslySetInnerHTML={{ __html: tenant.instruction.bodyHtml }} />
          </div>
        </div>
      </section>

      {/* ── Curated library ── */}
      <section id="library" style={{ background: 'var(--body-bg)', padding: '2rem 2rem 4rem', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
            <FilterSidebar total={data.total} targetPath={home} />
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
              buttonColor={tenant.primary}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function NewThisMonthTile({ href, image, label, title, color }: {
  href: string; image: string; label: string; title: string; color: string;
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none',
      border: '1px solid #cfe0ec', borderRadius: '12px', padding: '12px 20px 12px 12px', background: '#ffffff',
    }}>
      <Image src={image} alt="" width={72} height={72}
        style={{ objectFit: 'cover', borderRadius: '6px', flexShrink: 0, width: '72px', height: '72px' }} />
      <div>
        <div style={{ fontSize: '17px', fontWeight: 700, color, marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-body-dark)' }}>{title}</div>
      </div>
    </Link>
  );
}
