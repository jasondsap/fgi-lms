// =============================================================================
// Signed-out lockdown (Jason, 8-31-26): visitors see nothing past the landing
// page on any surface. Every non-landing page calls requireSignIn() at the
// top; a signed-out request bounces to the surface home with ?signin=1, which
// SignedOutGate (mounted via AuthNav) turns into the login modal. The client
// click-gate is the polish; this redirect is the enforcement — deep links,
// prefetches, and typed URLs all land here.
// =============================================================================
import { redirect } from 'next/navigation';
import { authEnabled, getSession } from '@/auth';

/**
 * Bounce signed-out visitors to the surface landing page with the modal up.
 *
 * `nextPath` (9-5-26, Rachael's share-a-link ticket): the page the visitor was
 * trying to reach. Resource and course pages pass their own path so a shared
 * deep link survives the sign-in — LoginModal pushes there once the session
 * exists instead of leaving the newcomer on the landing page.
 */
export async function requireSignIn(homePath: string = '/', nextPath?: string): Promise<void> {
  if (!authEnabled) return; // local dev without Cognito env stays browsable
  const session = await getSession();
  if (session?.user?.id) return;
  const next = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
  redirect(`${homePath}?signin=1${next}`);
}
