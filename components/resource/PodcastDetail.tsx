import Image from 'next/image';
import Link from 'next/link';
import { AmazonIcon, AppleIcon, AudibleIcon, SpotifyIcon } from '@/components/BrandIcons';
import AudioPlayer, { ListenNowButton, TrailerButton } from '@/components/resource/AudioPlayer';
import PodcastInfoModal from '@/components/resource/PodcastInfoModal';
import { CollapsedBio } from '@/components/resource/PresenterBio';
import PresenterCard from '@/components/resource/PresenterCard';
import { getOtherEpisodes, getPodcastAudioUrl } from '@/lib/resources';
import {
  ABOUT_THE_PODCAST, PODCAST_EMAIL, PODCAST_FEEDBACK_FORM_URL, PODCAST_HOST,
  PODCAST_PLATFORMS, SHOW_LOGO, SHOW_TAGLINE, SHOW_TITLE, TRAILER_SLUG, WEBBERIZED,
} from '@/lib/podcast';
import type { Surface } from '@/lib/surface';
import type { Resource } from '@/types';

/** Same drawing as the library card and the mockup's headphones-and-mic art. */
const PODCAST_ILLUSTRATION = '/images/category-cards/podcast.webp';

/**
 * Release dates come back as a Date on one driver path and 'YYYY-MM-DD…' on
 * the other; going through `new Date()` would shift them a day west of UTC.
 */
function formatReleaseDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const iso = (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const RAIL_HEADING = {
  fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)',
};

/** Jennifer's brand marks (LMS Icons drop, 8-15-26) — see BrandIcons.tsx. */
const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  spotify: <SpotifyIcon size={34} />,
  apple:   <AppleIcon size={34} />,
  amazon:  <AmazonIcon size={34} />,
  audible: <AudibleIcon size={34} />,
};

/**
 * Podcast episode page — Jennifer's 8-18-26 "Podcast shell" (supersedes the
 * 8-12 version). The masthead is the new RER banner logo instead of a text
 * title + square cover art; the tagline is one line; and "About The Podcast"
 * and "Trailer" sit side by side beneath it. The player stays hidden until
 * the visitor asks to hear something — "or, Listen Now!" plays the episode
 * and "Trailer" plays the trailer audio right here (it no longer links to
 * the trailer's own page). Both behaviors are Jason's, 8-19.
 *
 * Show-level furniture (logo, tagline, host, About copy, platform box,
 * production credit) comes from lib/podcast.ts and is identical on every
 * episode; the episode itself supplies the heading, description, audio and
 * guest.
 */
export default async function PodcastDetail(
  { resource, surface }: { resource: Resource; surface: Surface },
) {
  const guests    = resource.presenters ?? [];
  const released  = formatReleaseDate(resource.event_date ?? resource.published_at);
  const isTrailer = resource.slug === TRAILER_SLUG;
  const [episodes, trailerSrc] = await Promise.all([
    getOtherEpisodes(resource.id, surface.key, 6),
    // On the trailer's own page the episode audio IS the trailer, so there is
    // no second track to fetch (and no Trailer button either).
    isTrailer ? Promise.resolve(null) : getPodcastAudioUrl(TRAILER_SLUG),
  ]);
  const platforms = PODCAST_PLATFORMS.filter((p) => p.url);

  // The docx titles carry their own label ("Episode 1: Health, Housing and
  // Hope: …"), so the heading is simply the title.
  return (
    <div style={{ background: '#ffffff', minHeight: '60vh' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem 2rem 3rem' }}>

        {/* Breadcrumb — not in the mockup, but the only way back into a
            tenant's own portal from here. */}
        <nav style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          <Link href={surface.basePath || '/'} style={{ color: surface.primary }}>Home</Link>
          {' / '}
          <Link href={surface.libraryHref} style={{ color: surface.primary }}>Library</Link>
          {' / '}
          <span>{resource.title}</span>
        </nav>

        {/* ── One grid: masthead + episode down the left; headphones art +
            action rail stacked down the right, so the rail rides up level
            with the masthead as in the mockup (Jason, 8-19 — two stacked
            grids used to hold the rail below the whole masthead). ── */}
        <div className="pdf-shell-grid">
          <div>
            <Image
              src={SHOW_LOGO}
              alt={SHOW_TITLE}
              width={852} height={432}
              priority
              style={{
                width: '100%', maxWidth: '543px', height: 'auto',
                borderRadius: 'var(--radius-lg)', display: 'block',
              }}
            />

            <p style={{
              fontSize: '29px', lineHeight: 1.25, fontWeight: 700, fontStyle: 'italic',
              fontStretch: '75%', color: 'var(--fgi-navy)',
              margin: '1.25rem 0 1.5rem', maxWidth: '640px',
            }}>
              {SHOW_TAGLINE}
            </p>

            <div style={{
              display: 'flex', gap: '18px', alignItems: 'center',
              justifyContent: 'center', maxWidth: '543px', flexWrap: 'wrap',
            }}>
              <PodcastInfoModal
                label="About The Podcast"
                variant="amber"
                sections={ABOUT_THE_PODCAST}
              />
              {/* Plays the trailer audio in place — hidden on the trailer's
                  own page, where Listen Now already plays it. */}
              {!isTrailer && trailerSrc && <TrailerButton />}
            </div>

            {/* The player — invisible until Listen Now or Trailer is clicked
                (8-18-26 shell), and directly under the About/Trailer buttons so
                opening it never scrolls the page (Jason, 8-30). download_url is
                the presigned episode MP3. */}
            <div style={{ maxWidth: '543px', marginTop: '1.25rem' }}>
              <AudioPlayer
                episode={resource.download_url
                  ? { src: resource.download_url, title: resource.title }
                  : null}
                trailer={trailerSrc ? { src: trailerSrc, title: 'Trailer' } : null}
              />
            </div>
            {/* ── The episode — continues the left column ── */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '1.5rem',
              marginTop: '2.5rem',
            }}>
            <div>
              <h1 style={{
                fontSize: '30px', lineHeight: 1.2, fontWeight: 700,
                fontStretch: '75%', color: 'var(--text-primary)',
              }}>
                {resource.title}
              </h1>

              {/* The mockup's "ID: yk3232" is filler; no podcast row carries a
                  course code today, so this renders only if one ever does. */}
              {resource.course_code && (
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  ID: {resource.course_code}
                </div>
              )}

              {resource.description && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{
                    fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)',
                    marginBottom: '0.75rem',
                  }}>
                    Description
                  </div>
                  {resource.description.split(/\n+/).filter(Boolean).map((para, i) => (
                    <p key={i} style={{
                      fontSize: '17px', lineHeight: 1.5, color: 'var(--text-primary)',
                      maxWidth: '62ch', marginBottom: '0.75rem',
                    }}>
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {guests.map((p) => (
              <PresenterCard key={p.id} presenter={p} accent={surface.primary} />
            ))}

            {/* Your Host — identical on every episode, from lib/podcast.ts.
                The 8-18 mockup hides the bio behind "Read Bio". */}
            <div style={{
              background: 'var(--body-bg)', borderRadius: 'var(--radius-lg)',
              padding: '1.5rem 1.75rem',
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '1rem' }}>
                Your Host
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '150px 1fr 180px',
                gap: '1.75rem', alignItems: 'start',
              }}>
                <Image
                  src={PODCAST_HOST.photo} alt={PODCAST_HOST.name}
                  width={150} height={225}
                  style={{ width: '150px', height: 'auto', borderRadius: 'var(--radius-sm)' }}
                />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-body-dark)' }}>
                    {PODCAST_HOST.name}
                  </div>
                  <div style={{
                    fontSize: '15px', fontWeight: 700, color: 'var(--text-body-dark)',
                    margin: '2px 0 12px',
                  }}>
                    {PODCAST_HOST.title}
                  </div>
                  <CollapsedBio paragraphs={PODCAST_HOST.bio} accent={surface.primary} />
                </div>
                {/* FGI logo + site in the same slot the guest cards give their
                    organization (Jason, 8-23). */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '180px', height: '80px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      src="/images/logos/fgi-logo-tagline.png"
                      alt="Fletcher Group, Inc."
                      width={360} height={120}
                      style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
                    />
                  </div>
                  <a
                    href="https://www.fletchergroup.org" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', marginTop: '8px', fontSize: '13px', color: surface.primary }}
                  >
                    www.fletchergroup.org
                  </a>
                </div>
              </div>
            </div>
          </div>

          </div>

          {/* ── Right column: headphones art over the action rail ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PODCAST_ILLUSTRATION} alt="" style={{ width: '100%', maxWidth: '320px', height: 'auto' }} />
            </div>

            <div style={{
              background: 'var(--body-bg)', borderRadius: 'var(--radius-lg)',
              padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
            }}>
            {/* Find Us On */}
            <div style={{
              background: 'var(--fgi-navy)', borderRadius: 'var(--radius-lg)',
              padding: '1.5rem 1.25rem', color: '#ffffff', textAlign: 'center',
            }}>
              <div style={{ fontSize: '19px', fontWeight: 700 }}>Find Us On:</div>
              <div style={{ fontSize: '14px', margin: '8px 0 0', opacity: 0.95 }}>
                Spotify, Apple, Amazon,<br />Audible, and More
              </div>
              {/* Icons appear one by one as Jennifer supplies the listing URLs
                  (lib/podcast.ts) — a dead gold circle helps nobody. */}
              {platforms.length > 0 && (
                <div style={{
                  display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '14px',
                }}>
                  {/* Flat gold marks that go light blue on hover — the two
                      states Jennifer's icon set ships (globals.css). */}
                  {platforms.map((p) => (
                    <a
                      key={p.key} href={p.url!} target="_blank" rel="noopener noreferrer"
                      aria-label={`Listen on ${p.label}`} title={p.label}
                      className="brand-icon-link"
                    >
                      {PLATFORM_ICONS[p.key]}
                    </a>
                  ))}
                </div>
              )}
              {resource.download_url && (
                <div style={{ marginTop: '16px' }}>
                  <ListenNowButton />
                </div>
              )}
            </div>

            {(resource.duration_minutes || released) && (
              <div style={{
                background: '#ffffff', borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                {resource.duration_minutes && (
                  <div style={{ fontSize: '17px', color: 'var(--text-secondary)' }}>
                    ⏱ Approx. {resource.duration_minutes} min.
                  </div>
                )}
                {released && (
                  <div style={{ fontSize: '17px', color: 'var(--text-secondary)' }}>
                    Released {released}
                  </div>
                )}
              </div>
            )}

            {/* Guest links — the globe row from the mockup. Only the org URL
                exists in the data (presenters have no email column), so the
                mail icon is deliberately absent rather than drawn dead. */}
            {guests.some((p) => p.org_url) && (
              <div>
                <div style={{ ...RAIL_HEADING, marginBottom: '10px' }}>Guest Information:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {guests.filter((p) => p.org_url).map((p) => (
                    <a
                      key={p.id} href={p.org_url!} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        fontSize: '15px', color: surface.primary,
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.7" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15 15 0 010 20a15 15 0 010-20" />
                      </svg>
                      <span>{p.org_url!.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Share Your Feedback — the mockup's gold button opens Jennifer's
                Monday form; Tony's inbox and the form link sit beneath it. */}
            <div>
              <a
                href={PODCAST_FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', textAlign: 'center',
                  background: 'var(--fgi-amber)', color: '#ffffff',
                  fontWeight: 700, fontSize: '18px', textDecoration: 'none',
                  borderRadius: 'var(--radius-md)', padding: '12px 16px',
                }}
              >
                Share Your Feedback
              </a>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                <a
                  href={`mailto:${PODCAST_EMAIL}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontSize: '15px', color: surface.primary,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.7" style={{ flexShrink: 0 }}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 6l-10 7L2 6" />
                  </svg>
                  <span>{PODCAST_EMAIL}</span>
                </a>
                <a
                  href={PODCAST_FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontSize: '15px', color: surface.primary,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.7" style={{ flexShrink: 0 }}>
                    <path d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" />
                    <path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z" />
                  </svg>
                  <span>Feedback form</span>
                </a>
              </div>
            </div>

            {/* Not in the mockup, but the shell is one episode deep and the
                library filter is the only other way between episodes. */}
            {episodes.length > 0 && (
              <div style={{ borderTop: '1px solid #d8d8d8', paddingTop: '1.25rem' }}>
                <div style={{
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '12px',
                }}>
                  More Episodes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {episodes.map((e) => (
                    <Link
                      key={e.slug}
                      href={`${surface.basePath}/resource/${e.slug}`}
                      style={{
                        fontSize: '15px', lineHeight: 1.35, fontWeight: 600,
                        color: surface.primary, textDecoration: 'none', display: 'block',
                      }}
                    >
                      {e.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Production credit */}
            <div style={{
              background: '#ffffff', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', padding: '1rem 1.125rem',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                <em>{SHOW_TITLE}</em> is Produced in Partnership with {WEBBERIZED.name}
                <a
                  href={WEBBERIZED.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', marginTop: '4px', color: surface.primary }}
                >
                  {WEBBERIZED.url.replace(/^https?:\/\//, '')}
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={WEBBERIZED.logo} alt={`${WEBBERIZED.name} logo`}
                style={{ width: '56px', height: '56px', flexShrink: 0 }}
              />
            </div>

            <Link href={surface.libraryHref} style={{
              display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: '999px',
              border: `1.5px solid ${surface.primary}`, color: surface.primary,
              fontWeight: 600, fontSize: '15px', textDecoration: 'none',
            }}>
              ← Back to Library
            </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
