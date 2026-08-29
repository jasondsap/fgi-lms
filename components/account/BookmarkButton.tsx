'use client';
import { useState, useTransition } from 'react';
import { toggleBookmarkAction } from './account-actions';

/**
 * "Save to My Learning" pill, pinned bottom-right of every resource shell
 * (8-29-26). Pinned rather than placed inside each of the five shells so it
 * ships once; move it into the shells' title areas if Jennifer prefers.
 */
export default function BookmarkButton({
  resourceId,
  initialSaved,
  accent,
  accountHref,
}: {
  resourceId: string;
  initialSaved: boolean;
  accent: string;
  accountHref: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  const toggle = () => startTransition(async () => {
    const next = await toggleBookmarkAction(resourceId);
    if (next !== null) setSaved(next);
  });

  return (
    <div style={{
      position: 'fixed', right: '22px', bottom: '22px', zIndex: 40,
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      {saved && (
        <a
          href={accountHref}
          style={{
            fontSize: '13px', fontWeight: 600, color: accent, background: '#ffffff',
            border: `1px solid ${accent}`, borderRadius: '999px', padding: '8px 14px',
            textDecoration: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          }}
        >
          View saved
        </a>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
          color: saved ? '#ffffff' : accent,
          background: saved ? accent : '#ffffff',
          border: `2px solid ${accent}`, borderRadius: '999px', padding: '10px 18px',
          cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1,
          boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '16px', lineHeight: 1 }}>{saved ? '★' : '☆'}</span>
        {saved ? 'Saved' : 'Save to My Learning'}
      </button>
    </div>
  );
}
