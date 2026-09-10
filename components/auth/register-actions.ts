'use server';

// One-shot registration (8-20-26 auth rebuild, phase 3): a single submit
// creates the Cognito account (already confirmed — no verification email),
// writes the full Neon profile with the surface the person registered from,
// and signs them straight in. Module-level server action — never an inline
// closure (see components/layout/auth-actions.ts).

import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import {
  CognitoAuthError, createConfirmedUser, PASSWORD_REGEX,
} from '@/lib/cognito';
import { createRegisteredUser, getAllowlistedRole } from '@/lib/users';
import { notifyWelcome, type WelcomeSurface } from '@/lib/notify';
import { REGISTRATION_CLOSED_MESSAGE, SELF_REGISTRATION_OPEN } from '@/lib/registration';
import { portalForState } from '@/lib/state-portals';
import { USER_ROLE_LABELS, US_STATES, type UserRole } from '@/types';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  /** Typed-twice check (9-7-26). Optional so older clients still submit. */
  confirmEmail?: string;
  password: string;
  confirmPassword?: string;
  organization: string;
  state: string;
  zip: string;
  county: string;
  roles: string[];
  roleOther: string;
  /** Which portal the modal was opened on — validated against the whitelist. */
  surface: string;
  /**
   * FGI form only (9-7-26): the person picked a state that has its own portal
   * and left "Register me with the … Learning Center" ticked. The account is
   * stamped with that portal instead of fgi.
   */
  joinStatePortal?: boolean;
}

export type RegisterResult =
  | { ok: true; /** Where to land after sign-in when the surface was switched. */ home?: string }
  | { ok: false; error: string };

const SURFACES = new Set(['fgi', 'colorado', 'scarr']);
const VALID_ROLES = new Set(Object.keys(USER_ROLE_LABELS));
const VALID_STATES = new Set(US_STATES.map((s) => s.code));

export async function registerAction(payload: RegisterPayload): Promise<RegisterResult> {
  const firstName = payload.firstName?.trim() ?? '';
  const lastName = payload.lastName?.trim() ?? '';
  const email = payload.email?.trim().toLowerCase() ?? '';

  // Server-side half of the kill switch: hiding the tab isn't enough, the
  // action is a public endpoint and must refuse on its own. Emails on the
  // staff allowlist (8-31-26) may register while the public switch is closed
  // — their users row picks up the pre-provisioned role in createRegisteredUser.
  if (!SELF_REGISTRATION_OPEN && !(email && await getAllowlistedRole(email))) {
    return { ok: false, error: REGISTRATION_CLOSED_MESSAGE };
  }
  const password = payload.password ?? '';
  const organization = payload.organization?.trim() ?? '';
  const state = payload.state ?? '';
  const zip = payload.zip?.trim() ?? '';
  const county = payload.county?.trim() ?? '';
  const roles = (payload.roles ?? []).filter((r): r is UserRole => VALID_ROLES.has(r));
  const roleOther = payload.roleOther?.trim() || null;
  let surface = SURFACES.has(payload.surface) ? payload.surface : 'fgi';
  // State-portal switch: only from the FGI form, only for SC / CO, only when
  // the box stayed ticked. Re-validated here — the client is just a hint.
  const statePortal = surface === 'fgi' && payload.joinStatePortal ? portalForState(payload.state) : null;
  if (statePortal) surface = statePortal.slug;

  if (!firstName || !lastName) return { ok: false, error: 'Enter your first and last name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (payload.confirmEmail !== undefined && payload.confirmEmail.trim().toLowerCase() !== email) {
    return { ok: false, error: 'The email addresses don\u2019t match.' };
  }
  if (payload.confirmPassword !== undefined && payload.confirmPassword !== password) {
    return { ok: false, error: 'The passwords don\u2019t match.' };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { ok: false, error: 'Password needs at least 8 characters, with upper and lower case letters, a number, and a symbol.' };
  }
  if (!organization) return { ok: false, error: 'Enter your organization.' };
  if (!VALID_STATES.has(state)) return { ok: false, error: 'Choose your state.' };
  if (!zip) return { ok: false, error: 'Enter your zip code.' };
  if (!county) return { ok: false, error: 'Enter your county.' };
  if (roles.length === 0) return { ok: false, error: 'Choose at least one role that describes you.' };

  let sub: string;
  try {
    ({ sub } = await createConfirmedUser({
      email, password, givenName: firstName, familyName: lastName,
    }));
  } catch (e) {
    if (e instanceof CognitoAuthError) {
      switch (e.kind) {
        case 'EMAIL_TAKEN':
          return { ok: false, error: 'An account with this email already exists — try logging in instead.' };
        case 'WEAK_PASSWORD':
          return { ok: false, error: 'Password needs at least 8 characters, with upper and lower case letters, a number, and a symbol.' };
        case 'RATE_LIMITED':
          return { ok: false, error: 'Too many attempts — please wait a few minutes and try again.' };
      }
    }
    console.error('registerAction: Cognito create failed', e);
    return { ok: false, error: 'Something went wrong creating your account. Please try again.' };
  }

  try {
    await createRegisteredUser({
      cognitoSub: sub, email, givenName: firstName, familyName: lastName,
      organization, state, zip, county, roles, roleOther,
      registeredSurface: surface,
    });
  } catch (e) {
    // The Cognito account exists; the credentials sign-in below still upserts
    // a minimal row, and the profile gate will re-collect what was lost.
    console.error('registerAction: Neon write failed', e);
  }

  // Welcome email for the surface they registered on (Jennifer's 9-4-26 copy)
  // — best-effort, never blocks sign-in.
  notifyWelcome({
    toEmail: email, firstName,
    surface: surface as WelcomeSurface,
    switchedToPortal: Boolean(statePortal),
  }).catch((e) => console.error('registerAction: welcome email failed', e));

  try {
    await signIn('credentials', { email, password, redirect: false });
    return statePortal ? { ok: true, home: `/${statePortal.slug}` } : { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: 'Your account was created — use Sign In to continue.' };
    }
    throw e;
  }
}
