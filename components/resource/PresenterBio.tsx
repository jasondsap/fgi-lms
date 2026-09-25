'use client';

import { useState } from 'react';

/**
 * Presenter bio with the mockup's Read More affordance. Bios run 200–400 words,
 * which would otherwise dominate the page, so it clamps to a few lines until
 * expanded. The full text is always in the DOM, so it stays selectable and
 * search-indexable even while collapsed.
 */
export default function PresenterBio({ bio, accent }: { bio: string; accent: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        style={{
          fontSize: '14px',
          lineHeight: 1.65,
          color: 'var(--text-secondary)',
          margin: 0,
          ...(expanded ? {} : {
            display: '-webkit-box',
            WebkitLineClamp: 6,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }),
        }}
      >
        {bio}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          marginTop: '8px', padding: 0, border: 'none', background: 'none',
          color: accent, fontWeight: 700, fontSize: '14px',
          fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        {expanded ? 'Read Less' : 'Read More'}
      </button>
    </div>
  );
}

/**
 * The podcast shell's "Your Host" bio. Same treatment as the guest clamp
 * above — the first lines show, Read More expands — but multi-paragraph,
 * since Tony's bio is two. (Was fully hidden behind "Read Bio" per the 8-18
 * mockup; Jason, 9-25: should clamp half way like the guest cards.)
 */
export function CollapsedBio({ paragraphs, accent }: { paragraphs: string[]; accent: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        style={expanded ? {} : {
          display: '-webkit-box',
          WebkitLineClamp: 6,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}
      >
        {paragraphs.map((para, i) => (
          <p key={i} style={{
            fontSize: '14px', lineHeight: 1.65, color: 'var(--text-secondary)',
            margin: i === 0 ? 0 : '10px 0 0',
          }}>
            {para}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          marginTop: '8px', padding: 0, border: 'none', background: 'none',
          color: accent, fontWeight: 700, fontSize: '14px',
          fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        {expanded ? 'Read Less' : 'Read More'}
      </button>
    </div>
  );
}
