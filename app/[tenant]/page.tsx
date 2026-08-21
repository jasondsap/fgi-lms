import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TenantFooter from '@/components/tenant/TenantFooter';
import TenantLanding from '@/components/tenant/TenantLanding';
import TenantFooterV2 from '@/components/tenant/v2/Footer';
import TenantLandingV2 from '@/components/tenant/v2/Landing';
import TenantFooterV3 from '@/components/tenant/v3/Footer';
import TenantLandingV3 from '@/components/tenant/v3/Landing';
import { getTenantConfig } from '@/lib/tenants';

interface PageProps {
  params: { tenant: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Titles preserved verbatim from the old per-tenant page files.
const TITLES: Record<string, string> = {
  colorado: 'Colorado Learning Center — Ohio Recovery Housing',
  scarr: 'SCARR Learning Center — South Carolina Alliance for Recovery Residences',
};

export function generateMetadata({ params }: PageProps): Metadata {
  return { title: TITLES[params.tenant] ?? 'Learning Center' };
}

// The header comes from app/[tenant]/layout.tsx, shared with the resource and
// course pages; only the landing page carries the tenant footer.
export default function TenantPage({ params, searchParams }: PageProps) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant) notFound();
  if (tenant.v3) {
    return (
      <>
        <TenantLandingV3 tenant={tenant} searchParams={searchParams} />
        <TenantFooterV3 tenant={tenant} />
      </>
    );
  }
  if (tenant.v2) {
    return (
      <>
        <TenantLandingV2 tenant={tenant} searchParams={searchParams} />
        <TenantFooterV2 tenant={tenant} />
      </>
    );
  }
  return (
    <>
      <TenantLanding tenant={tenant} searchParams={searchParams} />
      <TenantFooter tenant={tenant} />
    </>
  );
}
