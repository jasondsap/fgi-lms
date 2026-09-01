// =============================================================================
// Direct Cognito auth calls — the machinery behind the on-site login modal
// (8-20-26 auth rebuild, phase 2). Server-only: the client secret is used to
// compute SECRET_HASH, so none of this may reach a client bundle.
//
// Uses the USER_AUTH choice-based flow with a PASSWORD challenge — already
// enabled on the app client (ALLOW_USER_AUTH), so no client reconfiguration
// was needed. These are unauthenticated Cognito APIs: they need the client id
// and secret hash, not IAM credentials.
// =============================================================================
import crypto from 'crypto';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const REGION = process.env.AWS_REGION ?? 'us-east-2';

let _client: CognitoIdentityProviderClient | null = null;
function client(): CognitoIdentityProviderClient {
  if (!_client) _client = new CognitoIdentityProviderClient({ region: REGION });
  return _client;
}

function clientId(): string {
  const id = process.env.COGNITO_CLIENT_ID;
  if (!id) throw new Error('COGNITO_CLIENT_ID is not set');
  return id;
}

function secretHash(username: string): string {
  const secret = process.env.COGNITO_CLIENT_SECRET;
  if (!secret) throw new Error('COGNITO_CLIENT_SECRET is not set');
  return crypto.createHmac('sha256', secret).update(username + clientId()).digest('base64');
}

/** The pool id lives inside COGNITO_ISSUER — no separate env var needed. */
function poolId(): string {
  const issuer = process.env.COGNITO_ISSUER;
  const id = issuer?.split('/').pop();
  if (!id) throw new Error('COGNITO_ISSUER is not set');
  return id;
}

/**
 * The pool's live password policy (checked 8-20-26): min 8, upper, lower,
 * number, symbol. The regex mirrors it so weak passwords fail fast with a
 * clear message instead of a Cognito round-trip.
 */
export const PASSWORD_RULES =
  'At least 8 characters, with upper and lower case letters, a number, and a symbol.';
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/** Machine-readable failure kinds the UI maps to friendly copy. */
export type CognitoFailure =
  | 'BAD_CREDENTIALS'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'CODE_MISMATCH'
  | 'CODE_EXPIRED'
  | 'WEAK_PASSWORD'
  | 'EMAIL_TAKEN'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export class CognitoAuthError extends Error {
  constructor(public kind: CognitoFailure, message?: string) {
    super(message ?? kind);
    this.name = 'CognitoAuthError';
  }
}

function mapError(e: unknown): CognitoAuthError {
  const name = (e as { name?: string })?.name ?? '';
  switch (name) {
    case 'UsernameExistsException':
      return new CognitoAuthError('EMAIL_TAKEN');
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return new CognitoAuthError('BAD_CREDENTIALS');
    case 'PasswordResetRequiredException':
      return new CognitoAuthError('PASSWORD_CHANGE_REQUIRED');
    case 'CodeMismatchException':
      return new CognitoAuthError('CODE_MISMATCH');
    case 'ExpiredCodeException':
      return new CognitoAuthError('CODE_EXPIRED');
    case 'InvalidPasswordException':
      return new CognitoAuthError('WEAK_PASSWORD', (e as Error).message);
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return new CognitoAuthError('RATE_LIMITED');
    default:
      return new CognitoAuthError('UNKNOWN', (e as Error)?.message);
  }
}

/**
 * Email + password sign-in. Returns the ID token on success; throws
 * CognitoAuthError otherwise. The token comes to us straight from Cognito
 * over TLS, so its payload is trusted without a JWKS round-trip.
 */
export async function signInWithPassword(
  email: string, password: string,
): Promise<{ idToken: string }> {
  try {
    const first = await client().send(new InitiateAuthCommand({
      ClientId: clientId(),
      AuthFlow: 'USER_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash(email),
        PREFERRED_CHALLENGE: 'PASSWORD',
      },
    }));
    if (first.AuthenticationResult?.IdToken) {
      return { idToken: first.AuthenticationResult.IdToken };
    }
    if (first.ChallengeName === 'PASSWORD') {
      const second = await client().send(new RespondToAuthChallengeCommand({
        ClientId: clientId(),
        ChallengeName: 'PASSWORD',
        Session: first.Session,
        ChallengeResponses: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: secretHash(email),
        },
      }));
      if (second.AuthenticationResult?.IdToken) {
        return { idToken: second.AuthenticationResult.IdToken };
      }
    }
    // Any other challenge (NEW_PASSWORD_REQUIRED from an admin-created temp
    // password, MFA, …) has no UI yet — surface as a password-change case.
    throw new CognitoAuthError('PASSWORD_CHANGE_REQUIRED');
  } catch (e) {
    if (e instanceof CognitoAuthError) throw e;
    throw mapError(e);
  }
}

/** The identity claims the site needs from a Cognito ID token. */
export function decodeIdToken(idToken: string): {
  sub: string; email: string | null; given_name: string | null; family_name: string | null;
} {
  const payload = JSON.parse(
    Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'),
  );
  return {
    sub: payload.sub,
    email: payload.email ?? null,
    given_name: payload.given_name ?? null,
    family_name: payload.family_name ?? null,
  };
}

/**
 * One-shot signup for the registration modal (phase 3): create the account
 * already confirmed — no verification email, per Jason's 8-20 decision. Needs
 * IAM cognito-idp Admin* permissions on the pool (unlike the sign-in calls).
 *
 * AdminCreateUser leaves the account in FORCE_CHANGE_PASSWORD, so
 * AdminSetUserPassword(Permanent) immediately finishes it; if that second
 * call fails the half-made account is deleted rather than left stranded.
 */
export async function createConfirmedUser(input: {
  email: string; password: string; givenName: string; familyName: string;
}): Promise<{ sub: string }> {
  const { email, password, givenName, familyName } = input;
  let created = false;
  try {
    const res = await client().send(new AdminCreateUserCommand({
      UserPoolId: poolId(),
      Username: email,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: givenName },
        { Name: 'family_name', Value: familyName },
      ],
    }));
    created = true;
    const sub = res.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
    if (!sub) throw new CognitoAuthError('UNKNOWN', 'no sub on created user');

    await client().send(new AdminSetUserPasswordCommand({
      UserPoolId: poolId(),
      Username: email,
      Password: password,
      Permanent: true,
    }));
    return { sub };
  } catch (e) {
    if (created) {
      try {
        await client().send(new AdminDeleteUserCommand({
          UserPoolId: poolId(), Username: email,
        }));
      } catch { /* best effort — an orphan here is visible in the pool */ }
    }
    if (e instanceof CognitoAuthError) throw e;
    throw mapError(e);
  }
}

/**
 * Delete a Cognito account (admin user deletion, 9-1-26). Returns whether
 * the pool actually removed one — an already-gone account is fine (the Neon
 * side still gets cleaned up), any other failure throws so the caller can
 * refuse: deleting only the Neon row would let the person sign back in and
 * upsert a fresh one.
 */
export async function deleteCognitoUser(email: string): Promise<boolean> {
  try {
    await client().send(new AdminDeleteUserCommand({
      UserPoolId: poolId(), Username: email,
    }));
    return true;
  } catch (e) {
    if ((e as { name?: string }).name === 'UserNotFoundException') return false;
    throw mapError(e);
  }
}

/**
 * Start a password reset — Cognito emails the user a code. A nonexistent
 * address is swallowed so the form can't be used to probe which emails have
 * accounts.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await client().send(new ForgotPasswordCommand({
      ClientId: clientId(),
      Username: email,
      SecretHash: secretHash(email),
    }));
  } catch (e) {
    const mapped = mapError(e);
    if (mapped.kind === 'BAD_CREDENTIALS') return; // unknown email — say nothing
    throw mapped;
  }
}

/** Complete a password reset with the emailed code. */
export async function confirmPasswordReset(
  email: string, code: string, newPassword: string,
): Promise<void> {
  try {
    await client().send(new ConfirmForgotPasswordCommand({
      ClientId: clientId(),
      Username: email,
      SecretHash: secretHash(email),
      ConfirmationCode: code,
      Password: newPassword,
    }));
  } catch (e) {
    throw mapError(e);
  }
}
