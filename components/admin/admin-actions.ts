'use server';
// =============================================================================
// Server actions for the admin users page. Module-level (never inline
// closures — see components/layout/auth-actions.ts). Admin-ness comes from
// users.role via getViewer, never from the caller.
// =============================================================================
import { revalidatePath } from 'next/cache';
import { deleteUser, getUserEmailAndRole, updateUserAccess } from '@/lib/admin-users';
import { deleteCognitoUser } from '@/lib/cognito';
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

/**
 * Permanently delete an account (Jason, 9-1-26): Cognito first — if that
 * fails, nothing is touched, because a Neon-only delete would let the person
 * sign back in and silently recreate the row. Admins can't delete themselves,
 * or other admins (demote first — same spirit as the self-lockout guard).
 * The Moodle mirror account is left alone: its completion history backs
 * issued CE certificates.
 */
export async function deleteUserAction(
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  const viewer = await getViewer();
  if (viewer.role !== 'admin' || !UUID.test(userId)) return { error: 'Not allowed.' };
  if (userId === viewer.userId) return { error: 'You can’t delete your own account.' };

  const target = await getUserEmailAndRole(userId);
  if (!target) return { error: 'Account not found.' };
  if (target.role === 'admin') {
    return { error: 'Admins can’t be deleted directly — change their role to Learner first.' };
  }

  try {
    await deleteCognitoUser(target.email);
  } catch (e) {
    console.error('deleteUserAction: Cognito delete failed', e);
    return { error: 'Could not remove the sign-in account. Nothing was deleted — try again.' };
  }
  await deleteUser(userId);
  revalidatePath('/admin/users');
  return { ok: true };
}
