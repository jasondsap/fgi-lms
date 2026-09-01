// =============================================================================
// Admin: user management queries. SERVER-ONLY (imports lib/db).
// Role/label metadata lives in components/admin/roles.ts (pure, client-safe).
// =============================================================================
import { sql } from '@/lib/db';

export interface AdminUserRow {
  id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  organization: string | null;
  state: string | null;
  role: string;
  registered_surface: string | null;
  registration_completed_at: string | null;
  moodle_linked: boolean;
  created_at: string;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  return (await sql`
    SELECT id, email, given_name, family_name, organization, state, role,
           registered_surface, registration_completed_at,
           (moodle_user_id IS NOT NULL) AS moodle_linked, created_at
    FROM users
    ORDER BY created_at DESC
  `) as unknown as AdminUserRow[];
}

export async function countUsers(): Promise<number> {
  const rows = await sql`SELECT count(*)::int AS n FROM users`;
  return (rows[0]?.n as number) ?? 0;
}

/**
 * Delete a user's Neon data (9-1-26). Caller (admin-actions.ts) has already
 * removed the Cognito account. Learner data (roles, progress, bookmarks,
 * events) cascades; evaluation responses are kept anonymized (SET NULL) —
 * they're program-improvement data, not personal records. Support tickets
 * and comments reference users NOT NULL with NO ACTION, so the person's own
 * tickets/comments are deleted explicitly and admin references nulled.
 */
export async function deleteUser(userId: string): Promise<void> {
  await sql`DELETE FROM support_ticket_comments WHERE author_id = ${userId}`;
  await sql`
    DELETE FROM support_ticket_comments WHERE ticket_id IN (
      SELECT id FROM support_tickets WHERE submitted_by = ${userId}
    )`;
  await sql`DELETE FROM support_tickets WHERE submitted_by = ${userId}`;
  await sql`UPDATE support_tickets SET assigned_to = NULL WHERE assigned_to = ${userId}`;
  await sql`UPDATE support_tickets SET deleted_by = NULL WHERE deleted_by = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;
}

export async function getUserEmailAndRole(
  userId: string,
): Promise<{ email: string; role: string } | null> {
  const rows = await sql`SELECT email, role FROM users WHERE id = ${userId}`;
  return (rows[0] as { email: string; role: string }) ?? null;
}

/** Values validated by the caller (admin-actions.ts). */
export async function updateUserAccess(input: {
  userId: string;
  role: string;
  registeredSurface: string | null;
}): Promise<void> {
  await sql`
    UPDATE users SET
      role = ${input.role},
      registered_surface = ${input.registeredSurface},
      updated_at = now()
    WHERE id = ${input.userId}
  `;
}
