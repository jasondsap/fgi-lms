import { getTenantConfig, type TenantConfig } from '@/lib/tenants';

/**
 * A "surface" is which branded site the visitor is currently inside: the main
 * FGI library, or one of the tenant portals (/colorado, /scarr).
 *
 * The resource detail page and the course player are shared by all three, so
 * they take a Surface and use `basePath` for every in-surface link. Without
 * that, a Colorado learner clicking through to a course would land on FGI
 * chrome mid-flow.
 */
export interface Surface {
  /** 'fgi', or the tenant slug. */
  key: string;
  /** Link prefix: '' on FGI, '/colorado' on a tenant. */
  basePath: string;
  /** null on FGI. */
  tenant: TenantConfig | null;
  /** Where breadcrumbs and "Back to Library" point. */
  libraryHref: string;
  /** Primary button/link colour for this surface. */
  primary: string;
  /**
   * "Share Your Feedback" pill on resource pages. FGI amber; tenants reuse
   * their Contact-pill colours (CO #ffd100, SCARR #f5d300 — Jason 9-4-26).
   */
  feedbackButton: { bg: string; fg: string };
}

const FGI_FEEDBACK_BUTTON = { bg: 'var(--fgi-amber)', fg: '#ffffff' };

export const FGI_SURFACE: Surface = {
  key: 'fgi',
  basePath: '',
  tenant: null,
  libraryHref: '/library',
  primary: 'var(--fgi-blue)',
  feedbackButton: FGI_FEEDBACK_BUTTON,
};

/** Returns null for an unknown slug so routes can 404. */
export function tenantSurface(slug: string): Surface | null {
  const tenant = getTenantConfig(slug);
  if (!tenant) return null;
  return {
    key: tenant.slug,
    basePath: `/${tenant.slug}`,
    tenant,
    // Dedicated tenant library page since 8-31-26 (was a landing-page section).
    libraryHref: `/${tenant.slug}/library`,
    primary: tenant.primary,
    feedbackButton: tenant.v3?.contactButton ?? FGI_FEEDBACK_BUTTON,
  };
}
