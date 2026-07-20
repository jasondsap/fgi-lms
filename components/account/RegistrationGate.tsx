// =============================================================================
// Renders the blocking registration modal for a signed-in user who has not
// completed registration yet. Mounted once in the root layout, so it covers the
// library, resource pages, and the course player alike.
//
// The "registered" check is a live DB read rather than a flag on the Auth.js
// JWT: a token flag would go stale the moment the user submits, and they would
// keep getting the modal until the session refreshed.
// =============================================================================
import { getSession } from '@/auth';
import { getRegistrationDefaults, isRegistered } from '@/lib/users';
import RegistrationModal from './RegistrationModal';

export default async function RegistrationGate() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;                 // auth disabled or signed out

  if (await isRegistered(userId)) return null;

  const defaults = await getRegistrationDefaults(userId);
  if (!defaults) return null;

  return <RegistrationModal defaultName={defaults.name} email={defaults.email} />;
}
