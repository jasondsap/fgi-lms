import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TenantLibrarySection from '@/components/tenant/v3/LibrarySection';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { requireSignIn } from '@/lib/lockdown';
import { getTenantConfig } from '@/lib/tenants';

export const metadata: Metadata = { title: 'Library — Learning Resource Center' };

interface PageProps {
  params: { tenant: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

/**
 * Dedicated tenant library page (Jason, 8-31-26): the header's Library link
 * behaves like FGI's — the library sits right under the sticky header and
 * stays there until Home. Same section the landing embeds; the tenant layout
 * supplies the portal header.
 */
export default async function TenantLibraryPage({ params, searchParams }: PageProps) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant?.v3) notFound();
  await requireSignIn(`/${tenant.slug}`);
  return (
    <>
      <TenantLibrarySection
        tenant={tenant}
        searchParams={searchParams}
        targetPath={`/${tenant.slug}/library`}
      />
      <TenantShellFooter tenant={tenant} />
    </>
  );
}
