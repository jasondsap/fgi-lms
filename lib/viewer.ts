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
}

export const ANONYMOUS: Viewer = { userId: null, role: null, tenantSlug: null };

/** Session → viewer. One indexed lookup; only tenant_admins need the join. */
export async function getViewer(): Promise<Viewer> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return ANONYMOUS;
  const rows = await sql`
    SELECT u.role, t.slug AS tenant_slug
    FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
    WHERE u.id = ${userId}
  `;
  const row = rows[0];
  if (!row) return ANONYMOUS;
  return { userId, role: row.role as string, tenantSlug: (row.tenant_slug as string) ?? null };
}

/**
 * May this viewer see `internal` resources on the given surface?
 * FGI admins everywhere; a tenant admin only on their own portal.
 */
export function canSeeInternal(viewer: Viewer, surface: string): boolean {
  if (viewer.role === 'admin') return true;
  return viewer.role === 'tenant_admin' && viewer.tenantSlug === surface;
}
