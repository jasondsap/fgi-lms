'use server';

// Module-level server actions for the on-site login modal. Deliberately not
// inline 'use server' closures — closure capture broke in the production
// build once before (see components/layout/auth-actions.ts).

import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import {
  CognitoAuthError, confirmPasswordReset, requestPasswordReset,
} from '@/lib/cognito';

export type AuthActionResult = { ok: true } | { ok: false; error: string };

const GENERIC = 'Something went wrong. Please try again.';

/**
 * Email + password login. redirect:false — the modal closes itself and
 * refreshes the page, so the visitor stays exactly where they were.
 */
export async function loginAction(
  email: string, password: string,
): Promise<AuthActionResult> {
  if (!email?.trim() || !password) {
    return { ok: false, error: 'Enter your email and password.' };
  }
  try {
    await signIn('credentials', { email: email.trim(), password, redirect: false });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: 'Incorrect email or password.' };
    }
    throw e;
  }
}

/** Step 1 of forgot-password: Cognito emails a reset code. */
export async function requestResetAction(email: string): Promise<AuthActionResult> {
  if (!email?.trim()) return { ok: false, error: 'Enter your email address.' };
  try {
    await requestPasswordReset(email.trim());
    return { ok: true };
  } catch (e) {
    if (e instanceof CognitoAuthError && e.kind === 'RATE_LIMITED') {
      return { ok: false, error: 'Too many attempts — please wait a few minutes and try again.' };
    }
    return { ok: false, error: GENERIC };
  }
}

/** Step 2: emailed code + new password, then straight into a session. */
export async function confirmResetAction(
  email: string, code: string, newPassword: string,
): Promise<AuthActionResult> {
  if (!email?.trim() || !code?.trim() || !newPassword) {
    return { ok: false, error: 'Enter the code from your email and a new password.' };
  }
  try {
    await confirmPasswordReset(email.trim(), code.trim(), newPassword);
  } catch (e) {
    if (e instanceof CognitoAuthError) {
      switch (e.kind) {
        case 'CODE_MISMATCH':
          return { ok: false, error: 'That code doesn’t match — check the email and try again.' };
        case 'CODE_EXPIRED':
          return { ok: false, error: 'That code has expired — request a new one.' };
        case 'WEAK_PASSWORD':
          return { ok: false, error: 'Password needs at least 8 characters, with upper and lower case letters and a number.' };
        case 'RATE_LIMITED':
          return { ok: false, error: 'Too many attempts — please wait a few minutes and try again.' };
      }
    }
    return { ok: false, error: GENERIC };
  }
  // Password is reset — sign them in with it rather than making them retype.
  return loginAction(email, newPassword);
}
