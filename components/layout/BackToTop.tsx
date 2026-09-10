'use client';

import { useEffect, useState } from 'react';

/**
 * Floating "back to top" button (Jennifer, 9-10-26).
 *
 * Lives in the ROOT layout so every surface gets it — FGI home/library,
 * resource detail, the course player, help/support/account, and both tenant
 * portals. It sits bottom-LEFT on purpose: bottom-right already belongs to
 * the Ask Fletch launcher (owl + pill, ~150px tall, and a 420x620 panel once
 * opened) and to the Favorites heart on resource pages. Same edge offsets as
 * Fletch (see .back-to-top in globals.css) so the two read as a pair.
 *
 * Hidden until the visitor has scrolled roughly a screen down, so it never
 * clutters a hero or a short page. Always goes to the top of the PAGE, even
 * on portal landings where the library is a section — one predictable
 * target (the portals also have a real /library page now).
 */
const SHOW_AFTER_PX = 600;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Plain listener, no rAF throttle: React bails out when the boolean
    // doesn't change, and rAF is paused in background tabs, which left the
    // button stuck hidden during testing.
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className="back-to-top"
      // Signed-out visitors get every click turned into a sign-in prompt
      // (SignedOutGate); scrolling the page they're already on isn't content.
      data-signin-exempt
      // Hidden state stays in the DOM (for the fade) but is inert: no
      // pointer events, out of the tab order, invisible to screen readers.
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        position: 'fixed', zIndex: 150,
        width: '44px', height: '44px', borderRadius: '50%',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 12.5 10 6.5l6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
