// =============================================================================
// Neon users table — site accounts (Cognito-backed), keyed by cognito_sub.
// moodle_user_id is populated when the user is mirrored into Moodle
// (course-player integration), tenant_id when tenant binding is built.
// =============================================================================
import { sql } from '@/lib/db';
import type { UserRole } from '@/types';

export interface AppUser {
  id: string;
  cognito_sub: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  moodle_user_id: number | null;
  tenant_id: string | null;
  organization: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  role_other: string | null;
  registration_completed_at: string | null;
  /** Access level: learner (default) | staff | admin. */
  role: string;
  /** Surface the account registered from: fgi | colorado | scarr. */
  registered_surface: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Pre-provisioned access role for an email (8-31-26, Jason's staff list).
 * Rows in `staff_allowlist` mean: when this person's account is created —
 * self-registration or first hosted-UI sign-in — their users row starts with
 * this role instead of 'learner'. Also lets a listed email register while the
 * public self-registration kill switch is closed.
 */
export async function getAllowlistedRole(email: string): Promise<string | null> {
  const rows = await sql`
    SELECT role FROM staff_allowlist WHERE email = ${email.trim().toLowerCase()}
  `;
  return (rows[0]?.role as string) ?? null;
}

export async function upsertUser(input: {
  cognitoSub: string;
  email: string;
  givenName: string | null;
  familyName: string | null;
}): Promise<AppUser> {
  const allowRole = await getAllowlistedRole(input.email);
  // A learner on the allowlist is upgraded; staff/admin are never downgraded.
  const rows = await sql`
    INSERT INTO users (cognito_sub, email, given_name, family_name, role)
    VALUES (${input.cognitoSub}, ${input.email}, ${input.givenName}, ${input.familyName},
            ${allowRole ?? 'learner'})
    ON CONFLICT (cognito_sub) DO UPDATE SET
      email       = EXCLUDED.email,
      given_name  = COALESCE(EXCLUDED.given_name,  users.given_name),
      family_name = COALESCE(EXCLUDED.family_name, users.family_name),
      role        = CASE WHEN users.role = 'learner' THEN EXCLUDED.role ELSE users.role END,
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

// -----------------------------------------------------------------------------
// Registration — the one-time profile captured by the blocking modal.
// -----------------------------------------------------------------------------

export interface RegistrationInput {
  givenName: string;
  familyName: string;
  organization: string;
  state: string;
  zip: string;
  county: string;
  roles: UserRole[];
  roleOther: string | null;
}

/**
 * One-shot registration (8-20-26 rebuild, phase 3): the Cognito account was
 * just created, so this writes the whole profile — including which surface
 * the person registered from — and marks registration complete in a single
 * insert. ON CONFLICT covers a retry after a mid-flight failure.
 */
export async function createRegisteredUser(input: {
  cognitoSub: string;
  email: string;
  givenName: string;
  familyName: string;
  organization: string;
  state: string;
  zip: string;
  county: string;
  roles: UserRole[];
  roleOther: string | null;
  registeredSurface: string;
}): Promise<AppUser> {
  const allowRole = await getAllowlistedRole(input.email);
  const rows = await sql`
    INSERT INTO users (
      cognito_sub, email, given_name, family_name,
      organization, state, zip, county, role_other,
      registered_surface, registration_completed_at, role
    ) VALUES (
      ${input.cognitoSub}, ${input.email}, ${input.givenName}, ${input.familyName},
      ${input.organization}, ${input.state}, ${input.zip}, ${input.county}, ${input.roleOther},
      ${input.registeredSurface}, now(), ${allowRole ?? 'learner'}
    )
    ON CONFLICT (cognito_sub) DO UPDATE SET
      email                     = EXCLUDED.email,
      given_name                = EXCLUDED.given_name,
      family_name               = EXCLUDED.family_name,
      organization              = EXCLUDED.organization,
      state                     = EXCLUDED.state,
      zip                       = EXCLUDED.zip,
      county                    = EXCLUDED.county,
      role_other                = EXCLUDED.role_other,
      registered_surface        = COALESCE(users.registered_surface, EXCLUDED.registered_surface),
      registration_completed_at = COALESCE(users.registration_completed_at, now()),
      role                      = CASE WHEN users.role = 'learner' THEN EXCLUDED.role ELSE users.role END,
      updated_at                = now()
    RETURNING *
  `;
  const user = rows[0] as AppUser;

  await sql`DELETE FROM user_roles WHERE user_id = ${user.id}`;
  for (const role of input.roles) {
    await sql`
      INSERT INTO user_roles (user_id, role) VALUES (${user.id}, ${role})
      ON CONFLICT DO NOTHING
    `;
  }
  return user;
}

/**
 * Has this user completed registration? Called on every page load for a
 * signed-in user, so it stays a single indexed lookup by primary key.
 */
export async function isRegistered(userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT registration_completed_at FROM users WHERE id = ${userId}
  `;
  return Boolean(rows[0]?.registration_completed_at);
}

/** Role keys the learner picked at registration (My Learning profile card). */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const rows = await sql`SELECT role FROM user_roles WHERE user_id = ${userId}`;
  return rows.map((r) => r.role as UserRole);
}

/** Profile fields the modal prefills from the Cognito-sourced user record. */
export async function getRegistrationDefaults(userId: string) {
  const rows = await sql`
    SELECT given_name, family_name, email FROM users WHERE id = ${userId}
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    name: [row.given_name, row.family_name].filter(Boolean).join(' '),
    email: row.email as string,
  };
}

/**
 * Persist a completed registration. Idempotent — re-submitting replaces the
 * role set rather than appending to it.
 */
export async function saveRegistration(userId: string, input: RegistrationInput): Promise<void> {
  await sql`
    UPDATE users SET
      given_name                = ${input.givenName},
      family_name               = ${input.familyName},
      organization              = ${input.organization},
      state                     = ${input.state},
      zip                       = ${input.zip},
      county                    = ${input.county},
      role_other                = ${input.roleOther},
      registration_completed_at = now(),
      updated_at                = now()
    WHERE id = ${userId}
  `;

  await sql`DELETE FROM user_roles WHERE user_id = ${userId}`;
  for (const role of input.roles) {
    await sql`
      INSERT INTO user_roles (user_id, role) VALUES (${userId}, ${role})
      ON CONFLICT DO NOTHING
    `;
  }
}
