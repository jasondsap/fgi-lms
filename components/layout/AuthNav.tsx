import { authEnabled, getSession } from '@/auth';
import LoginModal from '@/components/auth/LoginModal';
import { getUserById } from '@/lib/users';
import { signOutAction } from './auth-actions';
import UserMenu from './UserMenu';

// Header account area. Renders nothing until the Cognito env vars are
// configured, so the header is unchanged while auth is being set up.
// `color` lets tenant headers (light background) reuse it with dark text;
// `signOutRedirect` keeps tenant users on their portal after sign-out.
//
// 8-30-26 (Jason's reference): signed in = a circle with the user's initials
// that opens a menu (name/email, My Learning, Sign Out); signed out = a
// "Sign In" pill that opens the login modal.
export default async function AuthNav({
  color = '#ffffff',
  signOutRedirect = '/',
  surface = 'fgi',
}: { color?: string; signOutRedirect?: string; surface?: string } = {}) {
  if (!authEnabled) return null;
  const session = await getSession();

  if (!session?.user?.id) {
    // On-site login modal (8-20-26 auth rebuild) — no more hosted-UI redirect.
    // `surface` stamps users.registered_surface when someone registers here.
    return <LoginModal color={color} surface={surface} triggerLabel="Sign In" />;
  }

  // The initials come from the Neon row (given + family name); the session
  // only carries the given name.
  const user = await getUserById(session.user.id);
  const given = user?.given_name ?? session.user.givenName ?? '';
  const family = user?.family_name ?? '';
  const name = [given, family].filter(Boolean).join(' ') || session.user.email || 'Account';
  const email = user?.email ?? session.user.email ?? '';
  const initials = ((given[0] ?? '') + (family[0] ?? '')).toUpperCase() || name.slice(0, 2).toUpperCase();
  const accountHref = surface === 'fgi' ? '/account' : `/${surface}/account`;

  return (
    <UserMenu
      initials={initials}
      name={name}
      email={email}
      accountHref={accountHref}
      // Admins get the Admin entry (8-31-26) — always FGI-chromed /admin.
      adminHref={user?.role === 'admin' ? '/admin' : undefined}
      // Bound arg, not a closure — see auth-actions.ts for why.
      signOut={signOutAction.bind(null, signOutRedirect)}
      chevronColor={color}
    />
  );
}
