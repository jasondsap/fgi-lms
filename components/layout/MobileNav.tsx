'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface MobileNavLink {
  label: string;
  href: string;
  external?: boolean;
  /** Rendered as a filled pill (the tenant certification buttons). */
  pill?: { bg: string; fg: string };
  /** Dead placeholder — a pill whose destination isn't built yet. */
  disabled?: boolean;
}

/**
 * Phone/tablet navigation (9-5-26 mobile pass). Below the `nav-burger`
 * breakpoint in globals.css the desktop nav is hidden and this hamburger
 * takes over: a full-width panel drops from under the header carrying the
 * same links (plus the tenant cert pills). Closes on navigation, Escape,
 * or the ✕. Pure CSS decides visibility, so the desktop header never
 * renders a stray burger and SSR markup matches on both.
 */
export default function MobileNav({
  links, bg, accent = 'var(--fgi-gold)',
}: {
  links: MobileNavLink[];
  /** Panel background — the header bar colour. */
  bg: string;
  /** Active-link colour. */
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Route change closes the panel.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="nav-burger"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        data-signin-exempt
        style={{
          alignItems: 'center', justifyContent: 'center',
          width: '40px', height: '40px', border: 'none', background: 'transparent',
          color: '#ffffff', padding: 0, marginRight: '-8px',
        }}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        ) : (
          <svg width="26" height="24" viewBox="0 0 26 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M2 5h22M2 12h22M2 19h22" />
          </svg>
        )}
      </button>

      <div
        id="mobile-nav-panel"
        className={`nav-panel${open ? ' nav-panel--open' : ''}`}
        style={{ background: bg }}
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0 14px' }}>
          {links.filter((l) => !l.pill).map((l) => {
            const active = !l.external && pathname === l.href;
            return (
              <li key={l.label}>
                <Link
                  href={l.href}
                  target={l.external ? '_blank' : undefined}
                  rel={l.external ? 'noopener noreferrer' : undefined}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    display: 'block', padding: '13px 0', fontSize: '18px', fontWeight: 600,
                    color: active ? accent : '#ffffff', textDecoration: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        {links.some((l) => l.pill) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingBottom: '18px' }}>
            {links.filter((l) => l.pill).map((l) => {
              const style = {
                display: 'inline-block', borderRadius: '999px', padding: '9px 20px',
                fontSize: '14px', fontWeight: 700, lineHeight: 1.25, textDecoration: 'none',
                background: l.pill!.bg, color: l.pill!.fg,
              };
              return l.disabled ? (
                <span key={l.label} aria-disabled="true" title="Coming soon" style={{ ...style, cursor: 'default' }}>
                  {l.label}
                </span>
              ) : (
                <Link key={l.label} href={l.href} style={style}>{l.label}</Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
