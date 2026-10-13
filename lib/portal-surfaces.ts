// =============================================================================
// Portal Admin surfaces (10-13-26, Jason: "add the same report for FGI").
// The Portal Admin reports were written against a tenant config; the FGI
// library has no tenant config but IS a surface — users.registered_surface
// = 'fgi' and a `tenants` row named fgi exist already, so every query in
// lib/portal-admin.ts works for it unchanged. This file is the one place
// that says what a reportable surface looks like, so the pages, the export
// route, the saved-report actions and the cron can all take 'fgi' too.
// =============================================================================
import { TENANT_SLUGS, getTenantConfig, type TenantConfig } from '@/lib/tenants';

export interface PortalSurface {
  slug: string;
  name: string;
  /** Accent colour for headings / buttons on the report pages. */
  primary: string;
  /** Where requireSignIn sends a signed-out visitor. */
  home: string;
  /** The report page itself; `/user/<id>` hangs off it. */
  adminBase: string;
  /** The tenant config when this is a tenant portal; null for FGI. */
  tenant: TenantConfig | null;
}

const FGI: PortalSurface = {
  slug: 'fgi',
  name: 'Fletcher Group',
  primary: '#0e72a2',   // --fgi-blue
  home: '/',
  adminBase: '/admin/portal',
  tenant: null,
};

/** FGI first, then the tenant portals — the order of the portal switcher. */
export const PORTAL_SURFACE_SLUGS: string[] = ['fgi', ...TENANT_SLUGS];

export function getPortalSurface(slug: string): PortalSurface | null {
  if (slug === 'fgi') return FGI;
  const tenant = getTenantConfig(slug);
  if (!tenant) return null;
  return {
    slug: tenant.slug,
    name: tenant.name,
    primary: tenant.primary,
    home: `/${tenant.slug}`,
    adminBase: `/${tenant.slug}/admin`,
    tenant,
  };
}
