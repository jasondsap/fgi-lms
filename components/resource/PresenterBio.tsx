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
            WebkitLineClamp: 8,
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
