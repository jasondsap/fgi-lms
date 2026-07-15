import { authEnabled, getSession, signIn, signOut } from '@/auth';

// Header account area. Renders nothing until the Cognito env vars are
// configured, so the header is unchanged while auth is being set up.
export default async function AuthNav() {
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
            color: '#ffffff',
            border: '1.5px solid rgba(255,255,255,0.85)',
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
      <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: '14px' }}>
        Hi, {displayName}
      </span>
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}
      >
        <button
          type="submit"
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.85)',
            border: 'none',
            padding: 0,
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}
