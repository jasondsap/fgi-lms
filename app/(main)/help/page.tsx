import type { Metadata } from 'next';
import HelpView from '@/components/help/HelpView';
import { requireSignIn } from '@/lib/lockdown';

export const metadata: Metadata = {
  title: 'Help — FGI Learning Resource Center',
  description: 'How to use the Learning Resource Center: finding resources, courses and CE credits, your account, and the partner certification portals.',
};

// Static content (lib/help-content.ts) rendered by a client view; per-user
// only through the sign-in check — the 8-31-26 lockdown gates every page
// past the landing, help included.
export default async function HelpPage() {
  await requireSignIn('/');
  return <HelpView />;
}
