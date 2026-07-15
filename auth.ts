// =============================================================================
// Site auth — Cognito via Auth.js (NextAuth v5)
// Distinct from lib/auth.ts, which is the admin-API JWT auth.
//
// Feature-flagged: until the COGNITO_* env vars exist, authEnabled is
// false, getSession() always returns null, and no login UI renders — so the
// site behaves exactly as before the auth build.
// =============================================================================
import NextAuth from 'next-auth';
import Cognito from 'next-auth/providers/cognito';
import { upsertUser } from '@/lib/users';

export const authEnabled = Boolean(
  process.env.COGNITO_CLIENT_ID &&
  process.env.COGNITO_CLIENT_SECRET &&
  process.env.COGNITO_ISSUER
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: authEnabled
    ? [
        Cognito({
          clientId: process.env.COGNITO_CLIENT_ID,
          clientSecret: process.env.COGNITO_CLIENT_SECRET,
          issuer: process.env.COGNITO_ISSUER,
          // All three scopes must be enabled on the Cognito app client
          // (profile carries given_name/family_name for CE certificates)
          authorization: { params: { scope: 'openid email profile' } },
        }),
      ]
    : [],
  // Fallback secret keeps auth() from throwing while the feature is disabled;
  // never used to sign a real session (no provider is registered without it)
  secret: process.env.AUTH_SECRET ?? 'auth-disabled-placeholder',
  trustHost: true,
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account, profile }) {
      // First sign-in only: mirror the Cognito user into the Neon users table
      if (account && profile?.sub && profile.email) {
        const user = await upsertUser({
          cognitoSub: profile.sub,
          email: profile.email,
          givenName: (profile.given_name as string | undefined) ?? null,
          familyName: (profile.family_name as string | undefined) ?? null,
        });
        token.userId = user.id;
        token.givenName = user.given_name;
        token.moodleUserId = user.moodle_user_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
        session.user.givenName = token.givenName ?? null;
        session.user.moodleUserId = token.moodleUserId ?? null;
      }
      return session;
    },
  },
});

/** Session lookup that is safe to call whether or not auth is configured. */
export async function getSession() {
  if (!authEnabled) return null;
  return auth();
}
