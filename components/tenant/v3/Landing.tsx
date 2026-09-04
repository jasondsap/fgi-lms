import Image from 'next/image';
import Link from 'next/link';
import ContactButton from '@/components/layout/ContactButton';
import TenantLibrarySection from './LibrarySection';
import { getLatestByType } from '@/lib/resources';
import { TENANT_HOSTED_TEXT, type TenantConfig } from '@/lib/tenants';

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
                  // Down-and-left so the ring almost centers on the card,
                  // then back right half the shift (Jason, 8-31; was -40px/60px).
                  position: 'absolute', top: '40px', left: '20px',
                  width: '525px', height: 'auto', pointerEvents: 'none',
                  opacity: 0.4,
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
              outline in the tenant frame colour with a dot triangle in its
              top-left corner (CO red, SCARR yellow). 9-3-26: the triangle now
              sits ON TOP of the box and runs across the white — nine dots along
              the top edge, nine down the left, hypotenuse top-right → bottom-left
              — instead of stopping at the border. The box's extra top/left
              padding keeps the heading clear of the triangle's lower rows. */}
          <div style={{ position: 'relative' }}>
            {v3.certBoxFrame && (
              <span aria-hidden style={{
                position: 'absolute', top: '-16px', left: '-16px', zIndex: 1,
                width: '117px', height: '117px', pointerEvents: 'none',
                backgroundImage: `radial-gradient(circle, ${v3.certBoxFrame} 2.5px, transparent 3px)`,
                backgroundSize: '13px 13px', backgroundPosition: '0 0',
                clipPath: 'polygon(0 0, 100% 0, 0 100%)',
              }} />
            )}
            <div style={{
              position: 'relative', height: '100%',
              background: '#ffffff',
              borderRadius: v3.certBoxFrame ? '18px' : '10px',
              border: v3.certBoxFrame ? `2px solid ${v3.certBoxFrame}` : undefined,
              padding: v3.certBoxFrame ? '2.3rem 2.1rem 1.9rem 2.75rem' : '1.9rem 2.1rem',
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
            {/* Opens the Question/Problem ticket modal (8-31-26) — signed-out
                clicks are caught by SignedOutGate and prompt sign-in. */}
            <ContactButton
              label={v3.supportBar.buttonLabel}
              fontSize="16px"
              bg={v3.contactButton?.bg ?? tenant.primary}
              fg={v3.contactButton?.fg ?? '#ffffff'}
              basePath={`/${tenant.slug}`}
              accent={tenant.primary}
            />
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

      {/* The curated library, shared with /<tenant>/library (8-31-26). Its
          controls target the library page, so touching a filter or the search
          box moves the visitor into the locked library view. */}
      <TenantLibrarySection tenant={tenant} searchParams={searchParams} targetPath={`${home}/library`} />
    </div>
  );
}
