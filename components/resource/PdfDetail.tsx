import Link from 'next/link';
import PdfViewer from '@/components/resource/PdfViewer';
import FeedbackModal from '@/components/resource/FeedbackModal';
import PresenterCard from '@/components/resource/PresenterCard';
import { getRelatedResources } from '@/lib/resources';
import type { Surface } from '@/lib/surface';
import { RESOURCE_TYPE_LABELS, type Resource, type ResourceType } from '@/types';

/*
 * The 8-11-26 illustration set, same drawings the library cards use. Only the
 * types that reach this shell are listed; anything missing simply renders
 * without the header illustration.
 */
const TYPE_ILLUSTRATION: Record<string, string> = {
  toolkit:       '/images/category-cards/learning.webp',
  guidebook:     '/images/category-cards/guidebook.webp',
  handbook:      '/images/category-cards/certification.webp',
  newsletter:    '/images/category-cards/newsletter.webp',
  paper:         '/images/category-cards/publication.webp',
  whitepaper:    '/images/category-cards/publication.webp',
  infographic:   '/images/category-cards/infographic.webp',
  success_story: '/images/category-cards/success-story.webp',
  non_fgi:       '/images/category-cards/recommendations.webp',
  fgi_service:   '/images/category-cards/fgi-services.png',
};

/*
 * Column geometry from the mockup, at the x1.4 artboard-to-site scale: 627pt of
 * document column, a 46.5pt gutter and a 269pt rail = 1320px total. It lives in
 * `.pdf-shell-grid` in globals.css, where it can also carry a breakpoint.
 */

const RAIL_LABEL = {
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.1em', color: 'var(--text-muted)',
};

function formatMonth(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const iso = (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);
  const [y, m] = iso.split('-').map(Number);
  if (!y || !m) return null;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${MONTHS[m - 1]} ${y}`;
}

/**
 * Document detail page — Jennifer's 8-11-26 "PDF shell".
 *
 * Every resource that *is* a document reaches this layout: Learning Briefs,
 * Newsletters, Publications, Success Stories, Guides, Cert. Documents and
 * Infographics. Courses (which open in Moodle) and webinars (their own richer
 * shell) do not.
 *
 * Shape: title and description across the top with the type illustration
 * beside them, then the document itself in an inline viewer with a grey action
 * rail alongside — download, related resources, and the feedback survey.
 *
 * The mockup's presenter card and "sponsored by" block are PsychArmor filler:
 * no document in the catalog carries presenter or sponsor rows today. They are
 * built here but render only once that data exists, rather than being faked.
 */
export default async function PdfDetail(
  { resource, surface }: { resource: Resource; surface: Surface },
) {
  const type       = resource.type as ResourceType;
  const typeLabel  = RESOURCE_TYPE_LABELS[type] ?? type;
  const shortLabel = typeLabel.split(' / ')[0];
  const illustration = resource.thumbnail_url || TYPE_ILLUSTRATION[type] || null;
  const presenters = resource.presenters ?? [];
  const materials  = resource.materials ?? [];
  const published  = formatMonth(resource.published_at);
  const related    = await getRelatedResources(resource, surface.key, 3);

  return (
    <div style={{ background: '#ffffff', minHeight: '60vh' }}>
      <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem 2rem 3rem' }}>

        {/* Breadcrumb — not in the mockup, which starts at the title, but it is
            the only way back to a tenant's own library from here. */}
        <nav style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          <Link href={surface.basePath || '/'} style={{ color: surface.primary }}>Home</Link>
          {' / '}
          <Link href={surface.libraryHref} style={{ color: surface.primary }}>Library</Link>
          {' / '}
          <span>{resource.title}</span>
        </nav>

        {/* ── Title + description, illustration alongside ── */}
        <div className="pdf-shell-grid">
          <div>
            <h1 style={{
              fontSize: '45px', lineHeight: 1.1, fontWeight: 700,
              fontStretch: '75%', color: 'var(--text-primary)',
            }}>
              {resource.title}
            </h1>

            {/* Where the mockup puts "Course ID: yk3232". Documents have no
                course code, so the slot carries what a reader can use. */}
            <div style={{ fontSize: '17px', color: 'var(--text-secondary)', marginTop: '10px' }}>
              {resource.course_code ? `Course ID: ${resource.course_code}` : typeLabel}
              {published && <span style={{ color: 'var(--text-muted)' }}> · {published}</span>}
            </div>

            {resource.description && (
              <>
                <div style={{
                  fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)',
                  margin: '1.5rem 0 0.75rem',
                }}>
                  Description
                </div>
                <p style={{
                  fontSize: '17px', lineHeight: 1.5, color: 'var(--text-primary)',
                  maxWidth: '62ch',
                }}>
                  {resource.description}
                </p>
              </>
            )}
          </div>

          {illustration && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={illustration}
              alt=""
              style={{ width: '344px', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
            />
          )}
        </div>

        {/* ── Document + action rail ── */}
        <div className="pdf-shell-grid" style={{ marginTop: '2rem' }}>
          {/* LEFT — the document, then anyone credited on it */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {resource.download_url && (
              <PdfViewer
                url={resource.download_url}
                title={resource.title}
                label={shortLabel}
                accent={surface.primary}
              />
            )}

            {presenters.map((p) => (
              <PresenterCard key={p.id} presenter={p} accent={surface.primary} />
            ))}
          </div>

          {/* RIGHT — grey action rail */}
          <aside style={{
            background: 'var(--body-bg)', borderRadius: 'var(--radius-lg)',
            padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
          }}>
            {/* `attachment_url` is signed with an attachment disposition — a
                plain `download` attribute is ignored on a cross-origin URL. */}
            {(resource.attachment_url || resource.download_url) && (
              <a
                href={resource.attachment_url ?? resource.download_url}
                style={{
                  display: 'block', background: surface.primary, color: '#fff',
                  textAlign: 'center', padding: '15px 12px', borderRadius: '999px',
                  fontWeight: 700, fontSize: '20px', textDecoration: 'none',
                }}
              >
                Download
              </a>
            )}

            {resource.external_url && !resource.download_url && (
              <a
                href={resource.external_url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', background: surface.primary, color: '#fff',
                  textAlign: 'center', padding: '15px 12px', borderRadius: '999px',
                  fontWeight: 700, fontSize: '20px', textDecoration: 'none',
                }}
              >
                Open Resource
              </a>
            )}

            {materials.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={RAIL_LABEL}>Also included</div>
                {materials.map((m) => (
                  <a
                    key={m.id} href={m.download_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '17px', color: surface.primary, fontWeight: 600 }}
                  >
                    {m.label}
                  </a>
                ))}
              </div>
            )}

            {presenters.length > 0 && (
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>
                  Presenter Information:
                </div>
                {presenters.map((p) => (
                  <div key={p.id} style={{ fontSize: '17px', lineHeight: 1.5 }}>
                    <div>{p.name}{p.credentials ? `, ${p.credentials}` : ''}</div>
                    {p.org_url && (
                      <a
                        href={p.org_url} target="_blank" rel="noopener noreferrer"
                        style={{ color: surface.primary, fontSize: '15px' }}
                      >
                        {p.org_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {related.length > 0 && (
              <div style={{ borderTop: '1px solid #d8d8d8', paddingTop: '1.25rem' }}>
                <div style={{ ...RAIL_LABEL, display: 'block', marginBottom: '12px' }}>
                  You Might Also Be Interested In
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`${surface.basePath}/resource/${r.slug}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      <span style={{
                        fontSize: '17px', lineHeight: 1.35, fontWeight: 600,
                        color: surface.primary, display: 'block',
                      }}>
                        {r.title}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {RESOURCE_TYPE_LABELS[r.type] ?? r.type}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* The Learning Center evaluation, in a modal. Same nine questions
                Moodle asks on every course — see lib/evaluation.ts. */}
            <FeedbackModal slug={resource.slug} surface={surface.key} accent={surface.primary} />

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
