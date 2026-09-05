import Link from 'next/link';
import FeedbackModal from '@/components/resource/FeedbackModal';
import SharePill from '@/components/resource/SharePill';
import RelatedList from '@/components/resource/RelatedList';
import type { RelatedItem } from '@/lib/resources';
import type { Surface } from '@/lib/surface';
import type { Presenter } from '@/types';

export const RAIL_LABEL = {
  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.1em', color: 'var(--text-muted)',
};

/** Pill CTA at the top of the rail, shared by both shells. */
export const RAIL_BUTTON = {
  display: 'block', width: '100%', textAlign: 'center' as const,
  // 8-29-26 pill scale (Jennifer): sized to the text, shared by every pill
  padding: '10px 22px', borderRadius: '999px',
  fontWeight: 700, fontSize: '16px', textDecoration: 'none',
  border: 'none', fontFamily: 'inherit', color: '#ffffff',
};

interface Props {
  slug: string;
  /** For the Share pill's email note. */
  title: string;
  description?: string | null;
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
  { slug, title, description, surface, action, facts = [], presenters = [], related, extras }: Props,
) {
  // One globe link per organisation — co-presenters from the same org (e.g.
  // the PPW webinar's two PEARL Program speakers) used to list it twice. A
  // presenter's second affiliation (org2_url, 8-29-26) gets its own link.
  const seenOrg = new Set<string>();
  const orgLinks: Array<{ key: string; url: string }> = [];
  for (const p of presenters) {
    for (const [suffix, url] of [['url', p.org_url], ['url2', p.org2_url]] as const) {
      if (!url) continue;
      const norm = url.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      if (seenOrg.has(norm)) continue;
      seenOrg.add(norm);
      orgLinks.push({ key: `${p.id}-${suffix}`, url });
    }
  }

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
            {orgLinks.map((link) => (
              <a
                key={link.key} href={link.url} target="_blank" rel="noopener noreferrer"
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
                <span>{link.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div style={{ borderTop: '1px solid #d8d8d8', paddingTop: '1.25rem' }}>
          <div style={{ ...RAIL_LABEL, display: 'block', marginBottom: '12px', color: surface.primary }}>
            You Might Also Be Interested In
          </div>
          <RelatedList items={related} basePath={surface.basePath} accent={surface.primary} />
        </div>
      )}

      <FeedbackModal slug={slug} surface={surface.key} accent={surface.primary} button={surface.feedbackButton} />

      <SharePill title={title} description={description} accent={surface.primary} />

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
