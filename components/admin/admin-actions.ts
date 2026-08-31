'use server';
// =============================================================================
// Server actions for the admin users page. Module-level (never inline
// closures — see components/layout/auth-actions.ts). Admin-ness comes from
// users.role via getViewer, never from the caller.
// =============================================================================
import { revalidatePath } from 'next/cache';
import { updateUserAccess } from '@/lib/admin-users';
import { getViewer } from '@/lib/viewer';
import { ROLE_VALUES, SURFACE_VALUES } from './roles';

const UUID = /^[0-9a-f-]{36}$/i;

export async function updateUserAccessAction(
  userId: string,
  input: { role: string; registeredSurface: string },
): Promise<{ ok: true } | { error: string }> {
  const viewer = await getViewer();
  if (viewer.role !== 'admin' || !UUID.test(userId)) return { error: 'Not allowed.' };
  // Self-lockout guard: you can't change your own access — another admin must.
  if (userId === viewer.userId) return { error: 'You can’t change your own access — ask another admin.' };
  if (!ROLE_VALUES.has(input.role)) return { error: 'Unknown role.' };
  const surface = SURFACE_VALUES.has(input.registeredSurface) ? input.registeredSurface : null;

  await updateUserAccess({ userId, role: input.role, registeredSurface: surface });
  revalidatePath('/admin/users');
  return { ok: true };
}
