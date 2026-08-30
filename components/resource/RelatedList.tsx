'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RESOURCE_TYPE_LABELS } from '@/types';
import type { RelatedItem } from '@/lib/resources';

/**
 * "You Might Also Be Interested In" (Jennifer, 8-29-26): type first, then
 * the title, both in dark text; the section heading carries the surface
 * colour instead. Shows `initial` items with a Show more / Show less toggle.
 */
export default function RelatedList({
  items,
  basePath,
  accent,
  initial = 3,
}: {
  items: RelatedItem[];
  basePath: string;
  accent: string;
  initial?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, initial);
  const hidden = items.length - initial;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {shown.map((r) => (
        <Link
          key={r.slug}
          href={`${basePath}/resource/${r.slug}`}
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <span style={{
            display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '2px',
          }}>
            {RESOURCE_TYPE_LABELS[r.type] ?? r.type}
          </span>
          <span style={{
            display: 'block', fontSize: '16px', lineHeight: 1.35, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {r.title}
          </span>
        </Link>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            alignSelf: 'flex-start', padding: 0, border: 'none', background: 'none',
            color: accent, fontWeight: 700, fontSize: '14px', fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          {expanded ? 'Show less' : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}
