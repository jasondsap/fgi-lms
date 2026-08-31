import { notFound } from 'next/navigation';
import AccountView from '@/components/account/AccountView';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { requireSignIn } from '@/lib/lockdown';
import { tenantSurface } from '@/lib/surface';

// Per-learner page: never cached, always the current session's data.
export const dynamic = 'force-dynamic';

export default async function TenantAccountPage({ params }: { params: { tenant: string } }) {
  const surface = tenantSurface(params.tenant);
  if (!surface) notFound();
  await requireSignIn(surface.basePath);
  return (
    <>
      <AccountView surface={surface} />
      <TenantShellFooter tenant={surface.tenant!} />
    </>
  );
}
