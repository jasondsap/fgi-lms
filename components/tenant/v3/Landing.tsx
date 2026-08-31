import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AskLibrary from '@/components/library/AskLibrary';
import FilterSidebar from '@/components/library/FilterSidebar';
import ResourceGrid from '@/components/library/ResourceGrid';
import SearchBar from '@/components/library/SearchBar';
import { getSession } from '@/auth';
import { getCompletedResourceIds } from '@/lib/progress';
import { canSeeInternal, getViewer } from '@/lib/viewer';
import { getLatestByType, getPublicResources } from '@/lib/resources';
import { filterQuery } from '@/lib/query';
import { TENANT_HOSTED_TEXT, type TenantConfig } from '@/lib/tenants';
import type { ResourceListParams, ResourceType, AudienceTag, TopicTag } from '@/types';

function normalizeType(v: string | string[] | undefined) {
  if (!v) return undefined;
  return (Array.isArray(v) ? v : [v]) as ResourceType[];
}

interface Props {
  tenant: TenantConfig;
  searchParams: { [key: string]: string | string[] | undefined };
}

/*
 * v3 tenant landing (8-19-26 SCARR mockup). Light hero with the welcome copy
 * on the left and the Latest Highlights CARD over a gold halftone spray on
 * the right (no hero video), then the full-bleed navy certification band
 * (white copy box + photo card), the grey support bar, and the unchanged
 * curated library. Header carries the certification buttons; the footer is
 * components/tenant/v3/Footer.tsx.
 */
export default async function TenantLandingV3({ tenant, searchParams }: Props) {
  const home = `/${tenant.slug}`;
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

  params.includeInternal = canSeeInternal(await getViewer(), tenant.slug);
  const data = await getPublicResources(params);

  // Highlights are FGI's newest items and point at the FGI site — they are
  // FGI-only resources, not in the tenant's own library.
  const [latestPodcast, latestWebinar, latestBrief] = await Promise.all([
    getLatestByType('podcast'),
    getLatestByType('webinar'),
    getLatestByType('toolkit'),
  ]);
  const highlights = [
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
  ].filter(Boolean) as Array<{ label: string; title: string; href: string; icon: string; naadac: boolean }>;

  const linkQuery = filterQuery(searchParams);
  const apiQuery = filterQuery(searchParams, { tenant: tenant.slug });

  return (
    <div>
      {/* ── Hero: copy left, Latest Highlights card over the dot spray right ── */}
      <section style={{ background: tenant.primary }}>
        <div style={{
          background: v3.heroBg,
          borderBottomRightRadius: '60px',
          padding: '0 2rem',
          overflow: 'hidden',
        }}>
          <div style={{
            maxWidth: 'var(--max-width)', margin: '0 auto',
            display: 'grid', gridTemplateColumns: '1fr 560px', gap: '2.5rem',
            alignItems: 'start',
          }}>
            <div style={{ maxWidth: '530px', padding: '3.25rem 0 3rem' }}>
              <div style={{ fontSize: '24px', color: tenant.primary, lineHeight: 1.2, marginBottom: '2px' }}>
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

              {v3.heroNote && (
                <p style={{
                  margin: '-0.6rem 0 1.6rem', fontSize: '14px', lineHeight: 1.55,
                  color: tenant.primary, opacity: 0.85,
                }}>
                  {v3.heroNote}
                </p>
              )}

              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                borderLeft: `4px solid ${tenant.accent}`, paddingLeft: '16px',
                fontSize: '22px', fontWeight: 700, color: tenant.primary,
              }}>
                <span>Explore</span>
                <span aria-hidden style={{ width: '9px', height: '9px', borderRadius: '50%', background: tenant.accent, flexShrink: 0 }} />
                <span>learn</span>
                <span aria-hidden style={{ width: '9px', height: '9px', borderRadius: '50%', background: tenant.accent, flexShrink: 0 }} />
                <span>Grow</span>
              </div>
            </div>

            {/* Right: the highlights card floats on the halftone spray, with
                bubbles showing on BOTH sides of the card (Jennifer's mockup;
                Jason, 8-21: card ~15% narrower, bubbles larger and left). */}
            <div style={{ position: 'relative', minHeight: '560px' }}>
              {/* Ring centered behind the card — its open side sits upper-left
                  and the dense arc lower-right, as in the mockup. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v3.heroDots} alt=""
                style={{
                  position: 'absolute', top: '-40px', left: '60px',
                  width: '525px', height: 'auto', pointerEvents: 'none',
                  opacity: 0.38,
                }}
              />
              {/* The two gold outlier dots from the mockup — one above-right of
                  the card, one out at the right edge (Jennifer, 8-25). */}
              <span aria-hidden style={{
                position: 'absolute', right: '30px', top: '58px',
                width: '22px', height: '22px', borderRadius: '50%', background: tenant.accent,
              }} />
              <span aria-hidden style={{
                position: 'absolute', right: '-6px', top: '190px',
                width: '15px', height: '15px', borderRadius: '50%', background: tenant.accent,
              }} />
              <div style={{
                position: 'relative', background: '#ffffff',
                borderRadius: '22px', boxShadow: '0 10px 34px rgba(4,30,66,0.18)',
                width: '340px', margin: '3.4rem 5.6rem 0 auto',
                padding: '1.3rem 1.35rem 1.5rem',
              }}>
                <div style={{
                  fontSize: '23px', fontWeight: 700, fontStyle: 'italic',
                  fontStretch: '75%', color: '#111111',
                  borderLeft: `5px solid ${tenant.accent}`, paddingLeft: '10px',
                  marginBottom: '1.1rem',
                }}>
                  Latest Highlights
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {highlights.map((tile) => (
                    <a
                      key={tile.label}
                      href={tile.href}
                      // FGI resources — leave the portal page in place (Jason 8-31)
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'grid', gridTemplateColumns: '96px 1fr',
                        gap: '12px', alignItems: 'center',
                        background: v3.highlightTileBg,
                        border: '1px solid #ece7d2', borderRadius: '10px',
                        padding: '12px 14px', textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(4,30,66,0.08)',
                      }}
                    >
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '96px', height: '84px', borderRadius: '12px',
                        background: '#ffffff', border: '1px solid #f0ead0',
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={tile.icon} alt="" style={{ width: '92px', height: 'auto' }} />
                      </span>
                      <span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '17px', fontWeight: 700,
                            fontStretch: '75%', color: '#111111',
                          }}>
                            {tile.label}
                          </span>
                          {/* NAADAC CE pill (Jason 8-31) — same colours as the
                              tenant's library-card overlay. */}
                          {tile.naadac && (
                            <span style={{
                              background: v3.naadacPill?.bg ?? 'var(--fgi-amber)',
                              color: v3.naadacPill?.fg ?? 'var(--fgi-navy)',
                              fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
                              padding: '3px 8px', borderRadius: '20px', flexShrink: 0,
                            }}>
                              NAADAC CE
                            </span>
                          )}
                        </span>
                        <span style={{
                          display: 'block', fontSize: '15px', fontStretch: '75%',
                          color: '#222222', marginTop: '3px', lineHeight: 1.3,
                        }}>
                          {tile.title}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
              {/* The lone navy accent dot at the spray's right edge. */}
              <span aria-hidden style={{
                position: 'absolute', right: '-14px', top: '390px',
                width: '38px', height: '38px', borderRadius: '50%',
                background: tenant.primary,
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Certification band (full-bleed navy) ── */}
      <section style={{ background: tenant.primary, padding: '2.5rem 2rem' }}>
        <div style={{
          maxWidth: 'var(--max-width)', margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 460px', gap: '1.5rem',
          alignItems: 'stretch',
        }}>
          {/* Jennifer's Mockup A (8-31-26): the white box gets a rounded
              outline in the tenant frame colour with a dot grid peeking out
              from behind its top-left corner (CO red, SCARR yellow). */}
          <div style={{ position: 'relative' }}>
            {v3.certBoxFrame && (
              <span aria-hidden style={{
                position: 'absolute', top: '-16px', left: '-16px',
                width: '80px', height: '80px',
                backgroundImage: `radial-gradient(circle, ${v3.certBoxFrame} 2.5px, transparent 3px)`,
                backgroundSize: '13px 13px', backgroundPosition: '0 0',
              }} />
            )}
            <div style={{
              position: 'relative', height: '100%',
              background: '#ffffff',
              borderRadius: v3.certBoxFrame ? '18px' : '10px',
              border: v3.certBoxFrame ? `2px solid ${v3.certBoxFrame}` : undefined,
              padding: '1.9rem 2.1rem',
            }}>
            <h2 style={{
              fontSize: '20px', fontWeight: 700, color: '#111111', marginBottom: '1.1rem',
            }}>
              {v3.certBand.heading}
            </h2>
            {v3.certBand.paragraphsHtml.map((html, i) => (
              <p
                key={i}
                className="tenant-prose"
                style={{
                  fontSize: '16px', lineHeight: 1.6, color: '#111111',
                  marginBottom: i < v3.certBand.paragraphsHtml.length - 1 ? '1.1rem' : 0,
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ))}
            </div>
          </div>

          {/* Photo card — grey mat with the composited photo at its base. */}
          <div style={{
            background: '#a9aeb6', borderRadius: '6px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <Image
              src={v3.certBand.photo}
              alt={v3.certBand.photoAlt}
              width={736} height={302}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* ── Support bar ── */}
      <section style={{
        background: v3.supportBar.bg, color: v3.supportBar.fg,
        padding: '1.25rem 2rem',
      }}>
        <div style={{
          maxWidth: 'var(--max-width)', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '2rem', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px', fontWeight: 700 }}>{v3.supportBar.heading ?? 'Need Platform Help?'}</span>
            <a
              href="mailto:LC@fletchergroup.org"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '9px',
                background: v3.contactButton?.bg ?? tenant.primary, color: v3.contactButton?.fg ?? '#ffffff', fontSize: '16px',
                textDecoration: 'none', padding: '9px 22px', borderRadius: '999px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M2.5 11.1 20.6 3.3c.8-.3 1.5.4 1.2 1.2l-7.8 18.1c-.3.8-1.5.8-1.7-.1l-1.9-7-7-1.9c-.9-.2-.9-1.4-.1-1.7z" />
              </svg>
              {v3.supportBar.buttonLabel}
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

      {/* ── Curated library (unchanged per Jason, 8-21) ── */}
      <section id="library" style={{ background: '#ffffff', padding: '2.25rem 2rem 4rem', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <Suspense fallback={<div style={{ width: '220px', flexShrink: 0 }} />}>
            <FilterSidebar
              total={data.total} targetPath={home} isTenant
              fgiLibraryHref={`/library?from=${tenant.slug}`} fgiLibraryNewTab
            />
          </Suspense>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar defaultValue={params.search} targetPath={home} />
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
                  href={`${home}#library`}
                  style={{ color: tenant.primary, fontWeight: 600, textDecoration: 'underline', whiteSpace: 'nowrap' }}
                >
                  Show full library
                </Link>
              </div>
            )}
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
              naadacPill={v3.naadacPill}
              completedIds={completedIds}
            />
          </div>
        </div>
      </section>

      <AskLibrary basePath={home} surface={tenant.slug} accent={tenant.primary} pillBg={tenant.primary} pillText="#fff" />
    </div>
  );
}
