import type { Metadata } from 'next';
import AccountView from '@/components/account/AccountView';
import { requireSignIn } from '@/lib/lockdown';
import { FGI_SURFACE } from '@/lib/surface';

export const metadata: Metadata = { title: 'My Learning — FGI Learning Resource Center' };

// Per-learner page: never cached, always the current session's data.
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  await requireSignIn('/');
  return <AccountView surface={FGI_SURFACE} />;
}
