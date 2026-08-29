import Link from 'next/link';
import PdfViewer from '@/components/resource/PdfViewer';
import PresenterCard from '@/components/resource/PresenterCard';
import ShellRail, { RAIL_BUTTON, RAIL_LABEL } from '@/components/resource/ShellRail';
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
 * A peer-reviewed publication (8-12-26 shell) is the same page with three
 * additions, all driven by data rather than a separate component: the formatted
 * citation under the title, "Abstract Description" over the longer abstract, and
 * a "Publication Link" button to the DOI. Most publications may not be hosted as
 * a PDF at all — the publisher's terms decide — so on those the viewer and the
 * download simply do not render and the DOI is the way through.
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
  const related    = await getRelatedResources(resource, surface.key, 3);

  // No date on the ID line for any document (Jennifer, 8-29, system-wide:
  // only live events — webinars and podcasts — carry a date outside the
  // description). Publications keep their year inside the citation itself.
  const isPublication = Boolean(resource.citation);
  const body = resource.abstract || resource.description;

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

        {/* ── Title, citation and illustration ── */}
        <div className="pdf-shell-grid">
          <div>
            <h1 style={{
              fontSize: '45px', lineHeight: 1.1, fontWeight: 700,
              fontStretch: '75%', color: 'var(--text-primary)',
            }}>
              {resource.title}
            </h1>

            {/* Where the mockup puts "Course ID: yk3232". Documents have no
                course code, so the slot carries what a reader can use. Only a
                course is a "Course ID" — a handbook's code is just an ID. The
                " · Month Year" that used to follow it is gone for every
                document type (Jennifer, 8-29, generals tab). */}
            <div style={{ fontSize: '17px', color: 'var(--text-secondary)', marginTop: '10px' }}>
              {resource.course_code
                ? `${type === 'course' || type === 'naadac_ce' ? 'Course ID' : 'ID'}: ${resource.course_code}`
                : typeLabel}
            </div>

            {/* The citation sits between the title and the ID line, indented,
                with the journal in italics. The HTML comes from the research
                sheet's own formatting and is editor-controlled — see
                scripts/load-publications.js, which emits only <em>. */}
            {resource.citation && (
              <p
                style={{
                  fontSize: '17px', lineHeight: 1.5, color: 'var(--text-primary)',
                  maxWidth: '62ch', margin: '1rem 0 0 1.25rem',
                }}
                dangerouslySetInnerHTML={{ __html: resource.citation }}
              />
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

        {/* ── Body + action rail ──
            The description lives in this row, not the one above: the rail is the
            second row's right-hand cell, so anything tall in the first row's
            left cell pushes it down the page. With a 2,000-character abstract up
            there the rail ended up level with the middle of the article. Here
            the rail starts alongside the top of the body, directly under the
            illustration, which is where Jennifer's shell puts it. */}
        <div className="pdf-shell-grid pdf-shell-grid--body" style={{ marginTop: '2rem' }}>
          {/* LEFT — the document, then anyone credited on it */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {body && (
              <div>
                <div style={{
                  fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)',
                  marginBottom: '0.75rem',
                }}>
                  {isPublication ? 'Abstract Description' : 'Description'}
                </div>
                {/* Abstracts arrive as several paragraphs; keep the breaks. */}
                {body.split(/\n+/).filter(Boolean).map((para, i) => (
                  <p key={i} style={{
                    fontSize: '17px', lineHeight: 1.5, color: 'var(--text-primary)',
                    maxWidth: '62ch', marginBottom: '0.75rem',
                  }}>
                    {para}
                  </p>
                ))}
              </div>
            )}

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

          <ShellRail
            slug={resource.slug}
            surface={surface}
            presenters={presenters}
            related={related}
            action={
              <>
                {/* `attachment_url` is signed with an attachment disposition — a
                    plain `download` attribute is ignored on a cross-origin URL. */}
                {(resource.attachment_url || resource.download_url) && (
                  <a
                    href={resource.attachment_url ?? resource.download_url}
                    style={{ ...RAIL_BUTTON, background: surface.primary }}
                  >
                    {isPublication ? 'Download PDF' : 'Download'}
                  </a>
                )}
                {resource.external_url && (
                  <a
                    href={resource.external_url} target="_blank" rel="noopener noreferrer"
                    style={{
                      ...RAIL_BUTTON, background: surface.primary,
                      marginTop: (resource.download_url || resource.attachment_url) ? '12px' : 0,
                    }}
                  >
                    {isPublication ? 'Publication Link' : 'Open Resource'}
                  </a>
                )}
              </>
            }
            extras={
              materials.length > 0 ? (
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
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
}
