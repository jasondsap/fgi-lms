import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FgiLibraryView from '@/components/tenant/FgiLibraryView';
import TenantFooterV3 from '@/components/tenant/v3/Footer';
import { getTenantConfig } from '@/lib/tenants';

interface PageProps {
  params: { tenant: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const tenant = getTenantConfig(params.tenant);
  return { title: tenant ? `Fletcher Group Library — ${tenant.name}` : 'Fletcher Group Library' };
}

// Per-visitor (completion checkmarks) and filter-driven — never cached.
export const dynamic = 'force-dynamic';

/**
 * /<tenant>/library — the full FGI catalogue inside the tenant's chrome
 * (header from app/[tenant]/layout.tsx, the tenant's own big footer). Only
 * the v3 tenants carry the "Other Libraries" link that leads here.
 */
export default function TenantFgiLibraryPage({ params, searchParams }: PageProps) {
  const tenant = getTenantConfig(params.tenant);
  if (!tenant?.v3) notFound();
  return (
    <>
      <FgiLibraryView tenant={tenant} searchParams={searchParams} />
      <TenantFooterV3 tenant={tenant} />
    </>
  );
}
