'use client';

import { useId, useState } from 'react';

/**
 * Private / Internal pills with an explanatory pop-up (Jennifer, burn-down
 * 9-28-26 row 19, copy supplied 10-12-26). Rendered ONLY for viewers who may
 * see internal content (admins, FGI staff, a portal's own admins) — the
 * server strips both flags for everyone else, so a learner who follows a
 * shared link never sees a pill or the pop-up.
 *
 * Colours are Jennifer's: private #29abe2, internal #a20e3e. The pop-up opens
 * on hover and on keyboard focus, and is wired as the pill's description so
 * screen readers announce it too.
 */
export const VISIBILITY_COPY = {
  private: {
    label: 'PRIVATE',
    color: '#29abe2',
    text: 'This resource has been approved by HRSA for limited 1-on-1 direct client TA only. '
      + 'It CANNOT be shared publicly or distributed outside of direct TA consultations '
      + 'without prior approval from leadership.',
  },
  internal: {
    label: 'INTERNAL',
    color: '#a20e3e',
    text: 'This resource is for FGI staff use only. It CANNOT be shared outside the '
      + 'organization without prior approval from leadership.',
  },
} as const;

export type VisibilityKind = keyof typeof VISIBILITY_COPY;

export function VisibilityPill({ kind, size = 'sm' }: { kind: VisibilityKind; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const c = VISIBILITY_COPY[kind];
  const md = size === 'md';
  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        aria-describedby={id}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        style={{
          display: 'inline-block', background: c.color, color: '#ffffff',
          fontSize: md ? '13px' : '12px', fontWeight: 700, lineHeight: 1.2,
          padding: md ? '5px 14px' : '4px 11px', borderRadius: '999px',
          letterSpacing: '0.03em', cursor: 'help', outlineColor: c.color,
        }}
      >
        {c.label}
      </span>
      <span
        id={id}
        role="tooltip"
        style={{
          position: 'absolute', left: 0, top: 'calc(100% + 8px)', zIndex: 60,
          width: '300px', maxWidth: '80vw',
          background: '#ffffff', color: '#1d2b38', border: `2px solid ${c.color}`,
          borderRadius: '10px', padding: '10px 12px',
          fontSize: '13px', fontWeight: 400, lineHeight: 1.5, letterSpacing: 0,
          boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
          opacity: open ? 1 : 0, visibility: open ? 'visible' : 'hidden',
          transition: 'opacity 120ms ease',
          textTransform: 'none', whiteSpace: 'normal', textAlign: 'left',
        }}
      >
        <strong style={{ display: 'block', color: c.color, marginBottom: '4px' }}>
          {c.label.charAt(0) + c.label.slice(1).toLowerCase()}
        </strong>
        {c.text}
      </span>
    </span>
  );
}

/** Both pills for a resource, in a row; renders nothing when neither flag is set. */
export default function VisibilityPills({
  internal, isPrivate, size = 'sm', style,
}: { internal?: boolean; isPrivate?: boolean; size?: 'sm' | 'md'; style?: React.CSSProperties }) {
  if (!internal && !isPrivate) return null;
  return (
    <span style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', ...style }}>
      {isPrivate && <VisibilityPill kind="private" size={size} />}
      {internal && <VisibilityPill kind="internal" size={size} />}
    </span>
  );
}
