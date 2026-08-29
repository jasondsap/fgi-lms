import Link from 'next/link';
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
  // The greeting doubles as the link to the learner's own page (8-29-26),
  // on whichever surface they are browsing.
  const accountHref = surface === 'fgi' ? '/account' : `/${surface}/account`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap' }}>
      <Link
        href={accountHref}
        title="My Learning"
        style={{ color, fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}
      >
        Hi, {displayName}
      </Link>
      <Link
        href={accountHref}
        style={{ color, fontSize: '15px', fontWeight: 400, textDecoration: 'none', opacity: 0.92 }}
      >
        My Learning
      </Link>
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
