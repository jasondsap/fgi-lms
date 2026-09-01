// =============================================================================
// One-time welcome cards (9-1-26 launch). Mounted once in the root layout,
// after RegistrationGate: a signed-in user sees them only once they have a
// completed registration and only until they dismiss them once (DB flag, so
// it holds across devices). Live DB read for the same staleness reason as
// RegistrationGate.
// =============================================================================
import { getSession } from '@/auth';
import { needsWelcome } from '@/lib/users';
import WelcomeCards from './WelcomeCards';

export default async function WelcomeGate() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  if (!(await needsWelcome(userId))) return null;
  return <WelcomeCards />;
}
