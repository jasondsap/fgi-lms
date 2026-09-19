// =============================================================================
// Role vocabulary for the LRC — PURE module (client-safe, no server imports).
// =============================================================================
//
// Three roles (Jason, 8-31-26):
// - admin:   sees everything across all portals + the admin tools.
// - staff:   FGI staff — sees everything in the FGI library, including
//            internal/private items (lib/viewer.ts canSeeInternal).
// - learner: their own portal plus what's public in the FGI library.
//
// Plus Portal Admin (Jennifer, 9-19-26): stored as `tenant_admin` — the value
// lib/viewer.ts has honoured since 8-29-26 — and bound to ONE portal through
// users.tenant_id, which the users page sets from the Home portal picker.
// Read-only reporting on that portal's users at /<portal>/admin, plus the
// portal's internal items; no FGI admin tools.

/** Stored value of the Portal Admin role. */
export const PORTAL_ADMIN_ROLE = 'tenant_admin';

export const USER_ROLES = [
  {
    value: 'admin',
    label: 'Admin',
    desc: 'Everything, everywhere — all portals, internal items, admin tools',
    bg: '#fdecec', fg: '#b3261e',
  },
  {
    value: 'staff',
    label: 'FGI Staff',
    desc: 'Everything in the FGI library, including internal items',
    bg: '#efe8f8', fg: '#6a3fa0',
  },
  {
    value: PORTAL_ADMIN_ROLE,
    label: 'Portal Admin',
    desc: 'Read-only reports on their own portal’s users — set the Home portal to the portal they administer',
    bg: '#fdf3dd', fg: '#8a6410',
  },
  {
    value: 'learner',
    label: 'Learner',
    desc: 'Their portal plus the public FGI library',
    bg: '#e8f2f8', fg: '#0e72a2',
  },
] as const;

export const ROLE_VALUES = new Set<string>(USER_ROLES.map((r) => r.value));

export function roleConfig(role: string) {
  return (
    USER_ROLES.find((r) => r.value === role)
    ?? { value: role, label: role, desc: '', bg: '#eef1f3', fg: '#5f6e7c' }
  );
}

/** Home-portal options for the surface picker. */
export const SURFACE_OPTIONS = [
  { value: 'fgi', label: 'FGI' },
  { value: 'colorado', label: 'Colorado' },
  { value: 'scarr', label: 'SCARR' },
] as const;

export const SURFACE_VALUES = new Set<string>(SURFACE_OPTIONS.map((s) => s.value));
