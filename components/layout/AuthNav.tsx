import { authEnabled, getSession, signIn } from '@/auth';
import { signOutAction } from './auth-actions';

// Header account area. Renders nothing until the Cognito env vars are
// configured, so the header is unchanged while auth is being set up.
// `color` lets tenant headers (light background) reuse it with dark text;
// `signOutRedirect` keeps tenant users on their portal after sign-out.
export default async function AuthNav({
  color = '#ffffff',
  signOutRedirect = '/',
}: { color?: string; signOutRedirect?: string } = {}) {
  if (!authEnabled) return null;
  const session = await getSession();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          'use server';
          await signIn('cognito');
        }}
      >
        <button
          type="submit"
          style={{
            background: 'transparent',
            color,
            border: `1.5px solid ${color}`,
            borderRadius: '20px',
            padding: '7px 20px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Log In
        </button>
      </form>
    );
  }

  const displayName =
    session.user.givenName || session.user.name || session.user.email || 'Account';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap' }}>
      <span style={{ color, fontSize: '15px', fontWeight: 700 }}>
        Hi, {displayName}
      </span>
      {/* Bound arg, not a closure — see auth-actions.ts for why. */}
      <form action={signOutAction.bind(null, signOutRedirect)}>
        <button
          type="submit"
          style={{
            background: 'transparent',
            color,
            border: 'none',
            padding: 0,
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}
