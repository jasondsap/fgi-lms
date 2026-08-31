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
