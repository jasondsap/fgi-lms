'use server';
// =============================================================================
// Learner activity logging from client components (Jennifer, 9-17-26: staff
// want to report on what was shared and downloaded, not just viewed).
// Module-level server action — never an inline closure (see
// components/layout/auth-actions.ts). The user id comes from the session
// only; the client names the resource, the event, and the surface.
// =============================================================================
import { getSession } from '@/auth';
import { logResourceEvent, type ResourceEvent } from '@/lib/progress';

const UUID = /^[0-9a-f-]{36}$/i;
const CLIENT_EVENTS = new Set<ResourceEvent>(['share', 'download']);
const SURFACE = /^[a-z0-9-]{1,40}$/;

export async function logResourceEventAction(
  resourceId: string,
  event: ResourceEvent,
  surface: string,
): Promise<void> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !UUID.test(resourceId) || !CLIENT_EVENTS.has(event)) return;
  await logResourceEvent(userId, resourceId, event, SURFACE.test(surface) ? surface : 'fgi');
}
