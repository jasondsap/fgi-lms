import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TenantHeader from '@/components/tenant/TenantHeader';
import TenantFooter from '@/components/tenant/TenantFooter';
import TenantLanding from '@/components/tenant/TenantLanding';
import { getTenantConfig } from '@/lib/tenants';

export const metadata: Metadata = {
  title: 'SCARR Learning Center — South Carolina Alliance for Recovery Residences',
};

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ScarrPage({ searchParams }: PageProps) {
  const tenant = getTenantConfig('scarr');
  if (!tenant) notFound();
  return (
    <>
      <TenantHeader tenant={tenant} />
      <main>
        <TenantLanding tenant={tenant} searchParams={searchParams} />
      </main>
      <TenantFooter tenant={tenant} />
    </>
  );
}
