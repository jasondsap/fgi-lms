'use server';
// =============================================================================
// Server actions for the My Learning page. Module-level on purpose — inline
// 'use server' closures lose captured bindings in the production build (see
// components/layout/auth-actions.ts). The user id always comes from the
// session, never from the caller.
// =============================================================================
import { revalidatePath } from 'next/cache';
import { getSession } from '@/auth';
import { moodleEnabled } from '@/lib/moodle';
import { refreshAllProgress, toggleBookmark } from '@/lib/progress';
import { getUserById } from '@/lib/users';

/** Re-pull every opened course from Moodle. Bound arg = path to revalidate. */
export async function refreshProgressAction(accountPath: string): Promise<void> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !moodleEnabled) return;
  const user = await getUserById(userId);
  if (!user?.moodle_user_id) return;
  await refreshAllProgress(userId, user.moodle_user_id);
  revalidatePath(safePath(accountPath));
}

/** Save / unsave a resource. Returns the new state (or null when signed out). */
export async function toggleBookmarkAction(resourceId: string): Promise<boolean | null> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId || !/^[0-9a-f-]{36}$/i.test(resourceId)) return null;
  const saved = await toggleBookmark(userId, resourceId);
  revalidatePath('/account');
  return saved;
}

/** Bound args round-trip through the client — only accept same-site paths. */
function safePath(p: string): string {
  return /^\/[a-z0-9/-]*$/i.test(p) ? p : '/account';
}
