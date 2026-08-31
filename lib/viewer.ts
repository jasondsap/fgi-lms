// =============================================================================
// Who is looking? — role + tenant of the signed-in user, for content that is
// hidden from ordinary learners (resources.internal, 8-29-26: the Colorado
// Code of Ethics course is visible only to FGI admins and ORH-CO admins).
// SERVER-SIDE ONLY.
// =============================================================================
import { getSession } from '@/auth';
import { sql } from '@/lib/db';

export interface Viewer {
  userId: string | null;
  /** users.role: learner | staff | admin | tenant_admin */
  role: string | null;
  /** Slug of the tenant a tenant_admin administers (users.tenant_id → tenants). */
  tenantSlug: string | null;
  /** Home surface (users.registered_surface): fgi | colorado | scarr. */
  surface: string | null;
}

export const ANONYMOUS: Viewer = { userId: null, role: null, tenantSlug: null, surface: null };

/** Session → viewer. One indexed lookup; only tenant_admins need the join. */
export async function getViewer(): Promise<Viewer> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return ANONYMOUS;
  const rows = await sql`
    SELECT u.role, u.registered_surface, t.slug AS tenant_slug
    FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
    WHERE u.id = ${userId}
  `;
  const row = rows[0];
  if (!row) return ANONYMOUS;
  return {
    userId,
    role: row.role as string,
    tenantSlug: (row.tenant_slug as string) ?? null,
    surface: (row.registered_surface as string) ?? null,
  };
}

/**
 * Portals are members-only (Jason, 8-31-26 surface enforcement): admins go
 * everywhere; a tenant_admin enters their own portal; everyone else only the
 * portal matching their home surface — FGI-registered users included.
 * Anonymous visitors pass (the portal landing is the sign-in/sign-up door,
 * and the content gate still blocks everything behind it).
 */
export function canEnterPortal(viewer: Viewer, portalSlug: string): boolean {
  if (!viewer.userId) return true;
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'tenant_admin' && viewer.tenantSlug === portalSlug) return true;
  return viewer.surface === portalSlug;
}

/** Where a bounced visitor belongs: their portal, or the FGI home. */
export function viewerHome(viewer: Viewer): string {
  return viewer.surface && viewer.surface !== 'fgi' ? `/${viewer.surface}` : '/';
}

/**
 * May this viewer see `internal` resources on the given surface?
 * Admins everywhere; FGI staff on the FGI library (Jason's 8-31-26 role
 * model: "FGI Staff can see all items in the FGI portal, including internal
 * and private"); a tenant admin only on their own portal.
 */
export function canSeeInternal(viewer: Viewer, surface: string): boolean {
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'staff' && surface === 'fgi') return true;
  return viewer.role === 'tenant_admin' && viewer.tenantSlug === surface;
}
