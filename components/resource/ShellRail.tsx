import Link from 'next/link';
import FeedbackModal from '@/components/resource/FeedbackModal';
import type { RelatedItem } from '@/lib/resources';
import type { Surface } from '@/lib/surface';
import { RESOURCE_TYPE_LABELS, type Presenter } from '@/types';

export const RAIL_LABEL = {
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.1em', color: 'var(--text-muted)',
};

/** Pill CTA at the top of the rail, shared by both shells. */
export const RAIL_BUTTON = {
  display: 'block', width: '100%', textAlign: 'center' as const,
  padding: '15px 12px', borderRadius: '999px',
  fontWeight: 700, fontSize: '20px', textDecoration: 'none',
  border: 'none', fontFamily: 'inherit', color: '#ffffff',
};

interface Props {
  slug: string;
  surface: Surface;
  /** Primary call to action — Download, Start Webinar, Open Resource. */
  action?: React.ReactNode;
  /** One-line facts under the action: duration, presented date. */
  facts?: string[];
  presenters?: Presenter[];
  related: RelatedItem[];
  /** Shell-specific block between the facts and the presenter contact. */
  extras?: React.ReactNode;
}

/**
 * The grey action rail from Jennifer's 8-11-26 shells. Both the document shell
 * and the webinar shell carry the same column — CTA, facts, presenter contact,
 * related resources, feedback survey — so it lives here once and takes the
 * differing top section as a node.
 */
export default function ShellRail(
  { slug, surface, action, facts = [], presenters = [], related, extras }: Props,
) {
  // One globe link per organisation — co-presenters from the same org (e.g.
  // the PPW webinar's two PEARL Program speakers) used to list it twice.
  const seenOrg = new Set<string>();
  const contactable = presenters.filter((p) => {
    if (!p.org_url) return false;
    const key = p.org_url.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    if (seenOrg.has(key)) return false;
    seenOrg.add(key);
    return true;
  });

  return (
    <aside style={{
      background: 'var(--body-bg)', borderRadius: 'var(--radius-lg)',
      padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem',
    }}>
      {action}

      {facts.length > 0 && (
        <div style={{
          background: '#ffffff', borderRadius: 'var(--radius-md)',
          padding: '0.875rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          {facts.map((fact) => (
            <div key={fact} style={{ fontSize: '17px', color: 'var(--text-secondary)' }}>{fact}</div>
          ))}
        </div>
      )}

      {extras}

      {presenters.length > 0 && (
        <div>
          <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px' }}>
            Presenter Information:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {presenters.map((p) => (
              <div key={p.id} style={{ fontSize: '17px', lineHeight: 1.4 }}>
                {p.name}{p.credentials ? `, ${p.credentials}` : ''}
              </div>
            ))}
            {/* The mockup pairs a mail and a globe icon here. Only the org link
                exists in the data — presenters have no email column — so the
                mail icon is deliberately absent rather than drawn dead. */}
            {contactable.map((p) => (
              <a
                key={`${p.id}-url`} href={p.org_url!} target="_blank" rel="noopener noreferrer"
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

      <FeedbackModal slug={slug} surface={surface.key} accent={surface.primary} />

      <Link href={surface.libraryHref} style={{
        display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: '999px',
        border: `1.5px solid ${surface.primary}`, color: surface.primary,
        fontWeight: 600, fontSize: '15px', textDecoration: 'none',
      }}>
        ← Back to Library
      </Link>
    </aside>
  );
}
