// =============================================================================
// Neon users table — site accounts (Cognito-backed), keyed by cognito_sub.
// moodle_user_id is populated when the user is mirrored into Moodle
// (course-player integration), tenant_id when tenant binding is built.
// =============================================================================
import { sql } from '@/lib/db';

export interface AppUser {
  id: string;
  cognito_sub: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  moodle_user_id: number | null;
  tenant_id: string | null;
}

export async function upsertUser(input: {
  cognitoSub: string;
  email: string;
  givenName: string | null;
  familyName: string | null;
}): Promise<AppUser> {
  const rows = await sql`
    INSERT INTO users (cognito_sub, email, given_name, family_name)
    VALUES (${input.cognitoSub}, ${input.email}, ${input.givenName}, ${input.familyName})
    ON CONFLICT (cognito_sub) DO UPDATE SET
      email       = EXCLUDED.email,
      given_name  = COALESCE(EXCLUDED.given_name,  users.given_name),
      family_name = COALESCE(EXCLUDED.family_name, users.family_name),
      updated_at  = now()
    RETURNING *
  `;
  return rows[0] as AppUser;
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
  return (rows[0] as AppUser) ?? null;
}

export async function setMoodleUserId(id: string, moodleUserId: number): Promise<void> {
  await sql`UPDATE users SET moodle_user_id = ${moodleUserId}, updated_at = now() WHERE id = ${id}`;
}
