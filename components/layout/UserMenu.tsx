'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Header account control (Jason's 8-30-26 reference): a circle with the
 * signed-in user's initials and a chevron; clicking opens a card with the
 * name and email, "My Learning", and a red "Sign Out". Closes on outside
 * click or Escape. `signOut` is a server action already bound to its
 * redirect in AuthNav (never an inline closure — see auth-actions.ts).
 */
export default function UserMenu({
  initials,
  name,
  email,
  accountHref,
  adminHref,
  signOut,
  avatarBg = 'var(--fgi-teal)',
  avatarFg = '#ffffff',
  chevronColor = '#ffffff',
}: {
  initials: string;
  name: string;
  email: string;
  accountHref: string;
  /** Set only for users.role='admin' — renders the Admin menu item. */
  adminHref?: string;
  signOut: () => Promise<void>;
  avatarBg?: string;
  avatarFg?: string;
  chevronColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = {
    display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
    padding: '11px 18px', fontSize: '15px', fontWeight: 500, textDecoration: 'none',
    color: 'var(--text-primary)', background: 'none', border: 'none',
    fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' as const,
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: avatarBg, color: avatarFg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em',
        }}>
          {initials}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={chevronColor}
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
          style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 12px)', width: '290px',
            background: '#ffffff', color: 'var(--text-primary)',
            borderRadius: '14px', border: '1px solid var(--border-color)',
            boxShadow: '0 12px 32px rgba(22,61,91,0.18)', overflow: 'hidden', zIndex: 60,
          }}
        >
          <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.2 }}>{name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px', wordBreak: 'break-all' }}>{email}</div>
          </div>

          <div style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
            <Link href={accountHref} role="menuitem" onClick={() => setOpen(false)} style={item}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                style={{ color: 'var(--text-secondary)' }}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0116 0" />
              </svg>
              My Learning
            </Link>
            {adminHref && (
              <Link href={adminHref} role="menuitem" onClick={() => setOpen(false)} style={item}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                  style={{ color: 'var(--text-secondary)' }}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                Admin
              </Link>
            )}
          </div>

          <form action={signOut} style={{ padding: '6px 0' }}>
            <button type="submit" role="menuitem" style={{ ...item, color: '#c62828' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 4v16" />
              </svg>
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
