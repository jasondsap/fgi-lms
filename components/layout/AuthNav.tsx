import { authEnabled, getSession } from '@/auth';
import LoginModal from '@/components/auth/LoginModal';
import { signOutAction } from './auth-actions';

// Header account area. Renders nothing until the Cognito env vars are
// configured, so the header is unchanged while auth is being set up.
// `color` lets tenant headers (light background) reuse it with dark text;
// `signOutRedirect` keeps tenant users on their portal after sign-out.
export default async function AuthNav({
  color = '#ffffff',
  signOutRedirect = '/',
  surface = 'fgi',
}: { color?: string; signOutRedirect?: string; surface?: string } = {}) {
  if (!authEnabled) return null;
  const session = await getSession();

  if (!session?.user) {
    // On-site login modal (8-20-26 auth rebuild) — no more hosted-UI redirect.
    // `surface` stamps users.registered_surface when someone registers here.
    return <LoginModal color={color} surface={surface} />;
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
