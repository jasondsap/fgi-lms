'use server';

import { signOut } from '@/auth';

/**
 * Sign-out, as a module-level server action taking its redirect target as a
 * bound argument.
 *
 * This deliberately does NOT live as an inline `'use server'` closure inside
 * AuthNav. That form captured `signOutRedirect` — a destructured parameter with
 * a default value — and the production build dropped the binding, so clicking
 * Sign Out on resource.made180.dev returned a 500 with
 * `ReferenceError: signOutRedirect is not defined`. It worked in dev, which is
 * why it shipped. The sign-in action next to it captures nothing and was
 * unaffected. Pass values to server actions via `.bind`, not closure capture.
 */
export async function signOutAction(redirectTo: string) {
  // Bound arguments round-trip through the client, so treat the value as
  // untrusted: only ever a same-site absolute path, never protocol-relative
  // ("//evil.com") or a full URL.
  const safe = /^\/(?!\/)[\w\-/]*$/.test(redirectTo) ? redirectTo : '/';
  await signOut({ redirectTo: safe });
}
