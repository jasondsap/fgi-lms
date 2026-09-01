/**
 * Self-registration kill switch (8-28-26). While this is `false`, the auth
 * modal hides the "New? Create Account" tab, the content gate opens on Log In
 * with account-required copy instead of "Create a Free Account", and
 * `registerAction` refuses to create accounts (staff-allowlisted emails
 * excepted) — so only people who already hold a username + password can get
 * in. Flip to `true` to reopen signup.
 *
 * REOPENED 8-31-26 (Jason): Colorado, Staff, and SCARR go live 9-1.
 *
 * Plain constant (not an env var) so client and server components read the
 * same value with no NEXT_PUBLIC_ plumbing; it's meant to be temporary.
 */
export const SELF_REGISTRATION_OPEN = true;

/** Copy shown in place of the signup CTA while registration is closed. */
export const REGISTRATION_CLOSED_MESSAGE =
  'New account sign-ups are temporarily paused. If you already have an account, log in to continue.';
