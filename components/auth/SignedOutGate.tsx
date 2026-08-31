'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import LoginModal from '@/components/auth/LoginModal';

/**
 * Signed-out lockdown, client half (Jason, 8-31-26): the landing page is the
 * whole site until you sign in. Mounted by AuthNav only when signed out, it
 * captures every click and form submit on the page and opens the login modal
 * in place instead of navigating.
 *
 * Allowed through:
 * - external links (the header's web links — Fletcher Web, SCARR Video, …),
 *   plus mailto:/tel:
 * - anything inside an open dialog (the login modal itself), or an element
 *   under [data-signin-exempt]
 *
 * Everything else interactive — cards, filters, search, Ask Fletch, the
 * Library nav link — prompts sign-in. The server side (lib/lockdown.ts)
 * redirects any URL that slips past, and ?signin=1 from those redirects
 * auto-opens the modal here.
 */
export default function SignedOutGate({ surface = 'fgi' }: { surface?: string }) {
  const searchParams = useSearchParams();
  // Counter, not boolean: each intercepted click remounts the modal (key
  // below) so it reopens after being dismissed.
  const [prompt, setPrompt] = useState(0);

  // A lockdown redirect (?signin=1) opens the modal on arrival.
  useEffect(() => {
    if (searchParams.get('signin')) setPrompt((n) => n || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const exempt = (el: Element | null): boolean =>
      Boolean(el?.closest('[role="dialog"], [data-signin-exempt]'));

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || exempt(target)) return;
      const interactive = target.closest(
        'a, button, input, select, textarea, label, summary, [role="button"]',
      );
      if (!interactive) return; // plain text/scroll — leave it alone
      if (interactive instanceof HTMLAnchorElement) {
        const href = interactive.getAttribute('href') ?? '';
        if (/^(mailto:|tel:)/i.test(href)) return;
        if (interactive.origin && interactive.origin !== window.location.origin) return;
      }
      e.preventDefault();
      e.stopPropagation();
      setPrompt((n) => n + 1);
    };

    // Enter in the search field submits without a click — catch the form too.
    const onSubmit = (e: Event) => {
      if (exempt(e.target as Element | null)) return;
      e.preventDefault();
      e.stopPropagation();
      setPrompt((n) => n + 1);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  if (!prompt) return null;
  return <LoginModal key={prompt} trigger="none" autoOpen surface={surface} />;
}
