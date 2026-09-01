'use server';

// Module-level server action (never an inline closure — see
// components/layout/auth-actions.ts for the production 500 that rule
// prevents). Identity comes from the session only.

import { getSession } from '@/auth';
import { markWelcomeSeen } from '@/lib/users';

export async function markWelcomeSeenAction(): Promise<void> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return;
  try {
    await markWelcomeSeen(userId);
  } catch (e) {
    // Losing the flag just means they see the cards once more — never throw
    // into the client over it.
    console.warn('markWelcomeSeen failed:', (e as Error).message);
  }
}
