import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HelpView from '@/components/help/HelpView';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { getTenantConfig } from '@/lib/tenants';

export const metadata: Metadata = { title: 'Help — Learning Resource Center' };

/**
 * Tenant-chromed Help Center (Jason, 8-31-26): the tenant layout supplies the
 * portal header, so Home leads back to the portal — the "?" icon must never
 * strand a SCARR/Colorado visitor on FGI chrome. Same content as /help;
 * Fletch's help pill wears the tenant's colours.
 */
export default function TenantHelpPage({ params }: { params: { tenant: string } }) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) notFound();
  return (
    <>
      <HelpView
        accent={tenant.primary}
        pillBg={tenant.primary}
        pillText="#ffffff"
        basePath={`/${tenant.slug}`}
      />
      <TenantShellFooter tenant={tenant} />
    </>
  );
}
