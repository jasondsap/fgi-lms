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
import Credentials from 'next-auth/providers/credentials';
import { upsertUser } from '@/lib/users';

export const authEnabled = Boolean(
  process.env.COGNITO_CLIENT_ID &&
  process.env.COGNITO_CLIENT_SECRET &&
  process.env.COGNITO_ISSUER
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: authEnabled
    ? [
        // Hosted-UI OAuth — kept as a fallback while the on-site modal beds
        // in; the course-gate buttons still route through it (phase 4 unifies).
        Cognito({
          clientId: process.env.COGNITO_CLIENT_ID,
          clientSecret: process.env.COGNITO_CLIENT_SECRET,
          issuer: process.env.COGNITO_ISSUER,
          // All three scopes must be enabled on the Cognito app client
          // (profile carries given_name/family_name for CE certificates)
          authorization: { params: { scope: 'openid email profile' } },
        }),
        // On-site email + password login (8-20-26 auth rebuild, phase 2):
        // the modal posts here; lib/cognito.ts does the actual Cognito call.
        Credentials({
          credentials: { email: {}, password: {} },
          async authorize(credentials) {
            const email = String(credentials?.email ?? '').trim().toLowerCase();
            const password = String(credentials?.password ?? '');
            if (!email || !password) return null;
            // Lazy import keeps the AWS SDK out of edge/middleware bundles.
            const { signInWithPassword, decodeIdToken } = await import('@/lib/cognito');
            try {
              const { idToken } = await signInWithPassword(email, password);
              const claims = decodeIdToken(idToken);
              const user = await upsertUser({
                cognitoSub: claims.sub,
                email: claims.email ?? email,
                givenName: claims.given_name,
                familyName: claims.family_name,
              });
              return {
                id: user.id,
                email: user.email,
                userId: user.id,
                givenName: user.given_name,
                moodleUserId: user.moodle_user_id,
                role: user.role,
              };
            } catch {
              return null; // surfaces to the caller as CredentialsSignin
            }
          },
        }),
      ]
    : [],
  // Fallback secret keeps auth() from throwing while the feature is disabled;
  // never used to sign a real session (no provider is registered without it)
  secret: process.env.AUTH_SECRET ?? 'auth-disabled-placeholder',
  trustHost: true,
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Hosted-UI first sign-in: mirror the Cognito user into Neon.
      if (account?.provider === 'cognito' && profile?.sub && profile.email) {
        const dbUser = await upsertUser({
          cognitoSub: profile.sub,
          email: profile.email,
          givenName: (profile.given_name as string | undefined) ?? null,
          familyName: (profile.family_name as string | undefined) ?? null,
        });
        token.userId = dbUser.id;
        token.givenName = dbUser.given_name;
        token.moodleUserId = dbUser.moodle_user_id;
        token.role = dbUser.role;
      }
      // Credentials sign-in: authorize() already upserted; its return value
      // arrives here as `user`.
      if (account?.provider === 'credentials' && user) {
        const u = user as {
          userId?: string; givenName?: string | null;
          moodleUserId?: number | null; role?: string;
        };
        token.userId = u.userId;
        token.givenName = u.givenName ?? null;
        token.moodleUserId = u.moodleUserId ?? null;
        token.role = u.role ?? 'learner';
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
        session.user.givenName = token.givenName ?? null;
        session.user.moodleUserId = token.moodleUserId ?? null;
        session.user.role = token.role ?? 'learner';
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
