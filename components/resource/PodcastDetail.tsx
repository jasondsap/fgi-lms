import Image from 'next/image';
import Link from 'next/link';
import { AmazonIcon, AppleIcon, AudibleIcon, SpotifyIcon } from '@/components/BrandIcons';
import AudioPlayer, { ListenNowButton } from '@/components/resource/AudioPlayer';
import PodcastInfoModal from '@/components/resource/PodcastInfoModal';
import PresenterCard from '@/components/resource/PresenterCard';
import { getOtherEpisodes } from '@/lib/resources';
import {
  ABOUT_THE_PODCAST, PODCAST_EMAIL, PODCAST_FEEDBACK_FORM_URL, PODCAST_HOST,
  PODCAST_PLATFORMS, SHOW_TAGLINE_LINES, SHOW_TITLE, TRAILER_SLUG, WEBBERIZED,
  WHAT_IS_A_RECOVERY_ECOSYSTEM, WHO_SHOULD_LISTEN,
} from '@/lib/podcast';
import type { Surface } from '@/lib/surface';
import type { Resource } from '@/types';

/** Same drawing as the library card and the mockup's headphones-and-mic art. */
const PODCAST_ILLUSTRATION = '/images/category-cards/podcast.webp';
const COVER_ART = '/images/podcast/cover-art.webp';

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
 * Podcast episode page — Jennifer's 8-12-26 "Podcast shell".
 *
 * Show-level furniture (title, tagline, host, info modals, platform box,
 * production credit) comes from lib/podcast.ts and is identical on every
 * episode; the episode itself supplies the heading, description, audio and
 * guest. The mockup has no player — its "Listen Now" is aspirational — but
 * the audio is ours and lives in S3, so the episode plays right on the page
 * (Jason, 8-15).
 */
export default async function PodcastDetail(
  { resource, surface }: { resource: Resource; surface: Surface },
) {
  const guests   = resource.presenters ?? [];
  const released = formatReleaseDate(resource.event_date ?? resource.published_at);
  const episodes = await getOtherEpisodes(resource.id, surface.key, 6);
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

        {/* ── Show masthead: title + tagline left, cover art + trailer right ── */}
        <div className="pdf-shell-grid">
          <div>
            <h1 style={{
              fontSize: '45px', lineHeight: 1.1, fontWeight: 700,
              fontStretch: '75%', color: 'var(--text-primary)',
            }}>
              {SHOW_TITLE}
            </h1>

            <p style={{
              fontSize: '28px', lineHeight: 1.35, fontWeight: 700, fontStyle: 'italic',
              fontStretch: '75%', color: 'var(--fgi-navy)',
              margin: '1rem 0 1.25rem',
            }}>
              {SHOW_TAGLINE_LINES.map((line, i) => (
                <span key={i} style={{ display: 'block' }}>{line}</span>
              ))}
            </p>

            <PodcastInfoModal
              label="About The Podcast"
              variant="amber"
              sections={ABOUT_THE_PODCAST}
            />
          </div>

          <div style={{
            display: 'flex', gap: '1.5rem', alignItems: 'flex-start',
            justifyContent: 'center',
          }}>
            <Image
              src={COVER_ART}
              alt="Recovery Ecosystem Radio cover art"
              width={200} height={200}
              style={{ width: '200px', height: '200px', borderRadius: 'var(--radius-md)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PODCAST_ILLUSTRATION} alt="" style={{ width: '150px', height: 'auto' }} />
              {resource.slug !== TRAILER_SLUG && (
                <Link
                  href={`${surface.basePath}/resource/${TRAILER_SLUG}`}
                  style={{
                    background: 'var(--fgi-amber)', color: 'var(--fgi-navy)',
                    fontWeight: 700, fontStyle: 'italic', fontSize: '19px',
                    borderRadius: 'var(--radius-md)', padding: '6px 26px',
                    textDecoration: 'none',
                  }}
                >
                  Trailer
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Episode + action rail ── */}
        <div className="pdf-shell-grid pdf-shell-grid--body" style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{
                fontSize: '30px', lineHeight: 1.2, fontWeight: 700,
                fontStretch: '75%', color: 'var(--text-primary)',
              }}>
                {resource.title}
              </h2>

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

            {/* The episode itself. download_url is the presigned MP3. */}
            {resource.download_url && (
              <AudioPlayer src={resource.download_url} title={resource.title} />
            )}

            {guests.map((p) => (
              <PresenterCard key={p.id} presenter={p} accent={surface.primary} />
            ))}

            {/* Your Host — identical on every episode, from lib/podcast.ts */}
            <div style={{
              background: 'var(--body-bg)', borderRadius: 'var(--radius-lg)',
              padding: '1.5rem 1.75rem',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '1rem' }}>
                Your Host
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '150px 1fr',
                gap: '1.75rem', alignItems: 'start',
              }}>
                <Image
                  src={PODCAST_HOST.photo} alt={PODCAST_HOST.name}
                  width={150} height={225}
                  style={{ width: '150px', height: 'auto', borderRadius: 'var(--radius-sm)' }}
                />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-body-dark)' }}>
                    {PODCAST_HOST.name}
                  </div>
                  <div style={{
                    fontSize: '14px', fontWeight: 600, color: surface.primary,
                    margin: '2px 0 10px',
                  }}>
                    {PODCAST_HOST.title}
                  </div>
                  {PODCAST_HOST.bio.map((para, i) => (
                    <p key={i} style={{
                      fontSize: '14px', lineHeight: 1.65, color: 'var(--text-secondary)',
                      marginBottom: i < PODCAST_HOST.bio.length - 1 ? '0.75rem' : 0,
                    }}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Action rail ── */}
          <aside style={{
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

            <PodcastInfoModal
              label="Who should listen"
              title="Who Should Listen & Why"
              variant="navy"
              sections={WHO_SHOULD_LISTEN}
              fullWidth
            />

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

            {/* Share your thoughts — Tony's inbox and Jennifer's Monday form */}
            <div>
              <div style={{
                ...RAIL_HEADING, display: 'inline', background: 'var(--fgi-amber)',
                padding: '2px 6px', boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}>
                Share your Thoughts &amp; Ideas with Tony:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
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

            <PodcastInfoModal
              label="What is a Recovery Ecosystem?"
              variant="sky"
              sections={WHAT_IS_A_RECOVERY_ECOSYSTEM}
              fullWidth
            />

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
          </aside>
        </div>
      </div>
    </div>
  );
}
