// =============================================================================
// Portal Admin reporting (Jennifer, 9-19-26) — /<portal>/admin. SERVER-ONLY.
//
// Read-only views of ONE portal's people: the registration roster, and each
// person's progress through items. Same two source tables as the FGI-wide
// admin Activity report (lib/admin-activity.ts):
//   user_resource_events   view / course_open / complete / share / download
//   user_course_progress   Moodle course mirror — started, pct, completed_at
//
// THE BOUNDARY: every query here is scoped to users.registered_surface =
// <portal>. The portal slug is always this module's first bound parameter
// and comes from the route AFTER canAdminPortal() passed — never from a
// filter or the request body. A Portal Admin must not be able to see another
// surface's people by any combination of filters.
//
// A portal user's activity is shown wherever it happened (their portal's
// items and the Fletcher Group Library they reach through it); `on_portal`
// says which.
//
// Dynamic SQL follows lib/resources.ts: user input only through bind(),
// interpolated fragments only from this file's own constants.
// =============================================================================
import { sql } from '@/lib/db';
import { USER_ROLE_LABELS, type UserRole } from '@/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const STATUS_VALUES = ['completed', 'in_progress'] as const;
export type StatusFilter = (typeof STATUS_VALUES)[number] | '';

/** What the date range applies to (Jennifer's 6a "Date" and 6i "Date(s) item was accessed"). */
export const DATE_FIELDS = [
  { value: 'accessed',  label: 'Item accessed' },
  { value: 'completed', label: 'Item completed' },
  { value: 'created',   label: 'Account created' },
] as const;
export type DateField = (typeof DATE_FIELDS)[number]['value'];

export interface PortalFilters {
  /** User — name or email substring. */
  q: string;
  /** Organization / county — free text at registration, so substring matches. */
  org: string;
  county: string;
  zips: string[];
  /** "I am a…" keys; a user matches when they hold ANY of them. */
  roles: string[];
  /** Resource ids; a row matches ANY of them. */
  items: string[];
  status: StatusFilter;
  dateField: DateField;
  from: string | null;
  to: string | null;
}

type ParamValue = string | string[] | undefined;
const many = (v: ParamValue): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const one = (v: ParamValue): string => (many(v)[0] ?? '').trim().slice(0, 100);

/** Query string → filters. Everything is whitelisted or shape-checked here. */
export function parseFilters(p: Record<string, ParamValue>): PortalFilters {
  const status = one(p.status);
  const dateField = one(p.datefield);
  const from = one(p.from);
  const to = one(p.to);
  return {
    q: one(p.q),
    org: one(p.org),
    county: one(p.county),
    zips: many(p.zip).map((z) => z.trim()).filter((z) => /^\d{5}(-\d{4})?$/.test(z)).slice(0, 200),
    roles: many(p.role).filter((r) => r in USER_ROLE_LABELS),
    items: many(p.item).filter((i) => UUID.test(i)).slice(0, 200),
    status: (STATUS_VALUES as readonly string[]).includes(status) ? (status as StatusFilter) : '',
    dateField: DATE_FIELDS.some((d) => d.value === dateField) ? (dateField as DateField) : 'accessed',
    from: ISO_DATE.test(from) ? from : null,
    to: ISO_DATE.test(to) ? to : null,
  };
}

/** Filters → query string (export links, tab links). Omits empty values. */
export function filterQuery(f: PortalFilters, extra: Record<string, string> = {}): string {
  const qs = new URLSearchParams(extra);
  if (f.q) qs.set('q', f.q);
  if (f.org) qs.set('org', f.org);
  if (f.county) qs.set('county', f.county);
  f.zips.forEach((z) => qs.append('zip', z));
  f.roles.forEach((r) => qs.append('role', r));
  f.items.forEach((i) => qs.append('item', i));
  if (f.status) qs.set('status', f.status);
  if (f.from || f.to) qs.set('datefield', f.dateField);
  if (f.from) qs.set('from', f.from);
  if (f.to) qs.set('to', f.to);
  return qs.toString();
}

export function hasFilters(f: PortalFilters): boolean {
  return Boolean(f.q || f.org || f.county || f.zips.length || f.roles.length
    || f.items.length || f.status || f.from || f.to);
}

// -----------------------------------------------------------------------------
// SQL building blocks
// -----------------------------------------------------------------------------

/**
 * One row per (user, item) a portal user has touched: library events and the
 * course mirror FULL JOINed, because a course opened before 8-29-26 has a
 * progress row and no events, and a PDF has events and no progress row.
 * `completed_at` is the course completion, else a logged 'complete' event
 * (the pre-cert Part → library video mirror, 9-2-26).
 * `$1` is the portal slug.
 */
const UI_CTE = `
  pu AS (SELECT id FROM users WHERE registered_surface = $1),
  ev AS (
    SELECT e.user_id, e.resource_id,
           COUNT(*) FILTER (WHERE e.event = 'view')     AS views,
           COUNT(*) FILTER (WHERE e.event = 'share')    AS shares,
           COUNT(*) FILTER (WHERE e.event = 'download') AS downloads,
           MIN(e.created_at) AS first_at,
           MAX(e.created_at) AS last_at,
           MAX(e.created_at) FILTER (WHERE e.event = 'complete') AS completed_event_at
    FROM user_resource_events e
    JOIN pu ON pu.id = e.user_id
    WHERE e.resource_id IS NOT NULL
    GROUP BY e.user_id, e.resource_id
  ),
  cp AS (
    SELECT p.* FROM user_course_progress p JOIN pu ON pu.id = p.user_id
  ),
  ui AS (
    SELECT COALESCE(ev.user_id, cp.user_id)         AS user_id,
           COALESCE(ev.resource_id, cp.resource_id) AS resource_id,
           (cp.user_id IS NOT NULL)                 AS is_course,
           COALESCE(ev.views, 0)::int               AS views,
           COALESCE(ev.shares, 0)::int              AS shares,
           COALESCE(ev.downloads, 0)::int           AS downloads,
           LEAST(ev.first_at, cp.started_at)        AS first_at,
           GREATEST(ev.last_at, cp.last_activity_at, cp.started_at, cp.completed_at) AS last_at,
           COALESCE(cp.completed_at, ev.completed_event_at) AS completed_at,
           cp.started_at, cp.last_activity_at, cp.pct, cp.tracked_done, cp.tracked_total,
           cp.quiz_best, cp.quiz_max, cp.quiz_passed, cp.eval_submitted,
           cp.cert_earned, cp.ce_hours
    FROM ev
    FULL JOIN cp ON cp.user_id = ev.user_id AND cp.resource_id = ev.resource_id
  )`;

interface Built { userConds: string[]; itemConds: string[]; values: unknown[] }

/**
 * Conditions + values in lockstep. `u` = users row, `ui` = the user-item row.
 * values[0] is ALWAYS the portal slug ($1, which UI_CTE reads).
 */
function build(portal: string, f: PortalFilters, onlyUserId?: string): Built {
  const values: unknown[] = [portal];
  const bind = (v: unknown): string => {
    values.push(v);
    return `$${values.length}`;
  };
  const userConds: string[] = ['u.registered_surface = $1'];
  const itemConds: string[] = [];
  if (onlyUserId) userConds.push(`u.id = ${bind(onlyUserId)}::uuid`);

  if (f.q) {
    const ph = bind(`%${f.q}%`);
    userConds.push(`(u.email ILIKE ${ph} OR CONCAT_WS(' ', u.given_name, u.family_name) ILIKE ${ph})`);
  }
  if (f.org) userConds.push(`u.organization ILIKE ${bind(`%${f.org}%`)}`);
  if (f.county) userConds.push(`u.county ILIKE ${bind(`%${f.county}%`)}`);
  if (f.zips.length) userConds.push(`left(u.zip, 5) = ANY(${bind(f.zips.map((z) => z.slice(0, 5)))}::text[])`);
  if (f.roles.length) {
    userConds.push(
      `EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = ANY(${bind(f.roles)}::text[]))`,
    );
  }

  if (f.items.length) itemConds.push(`ui.resource_id = ANY(${bind(f.items)}::uuid[])`);
  if (f.status === 'completed') itemConds.push('ui.completed_at IS NOT NULL');
  if (f.status === 'in_progress') itemConds.push('(ui.is_course AND ui.completed_at IS NULL)');

  if (f.from || f.to) {
    // Inclusive calendar days: [from 00:00, to + 1 day).
    const range = (col: string): string => {
      const parts: string[] = [];
      if (f.from) parts.push(`${col} >= ${bind(f.from)}::date`);
      if (f.to) parts.push(`${col} < (${bind(f.to)}::date + 1)`);
      return `(${parts.join(' AND ')})`;
    };
    if (f.dateField === 'created') userConds.push(range('u.created_at'));
    else if (f.dateField === 'completed') itemConds.push(range('ui.completed_at'));
    else {
      // "Accessed" means something actually happened inside the window, not
      // merely that first/last access straddle it.
      itemConds.push(`(
        EXISTS (SELECT 1 FROM user_resource_events e
                WHERE e.user_id = ui.user_id AND e.resource_id = ui.resource_id
                  AND ${range('e.created_at')})
        OR ${range('ui.started_at')} OR ${range('ui.last_activity_at')} OR ${range('ui.completed_at')}
      )`);
    }
  }
  return { userConds, itemConds, values };
}

// -----------------------------------------------------------------------------
// Overview tiles
// -----------------------------------------------------------------------------

export interface PortalStats {
  users: number;
  new_30: number;
  active_30: number;
  in_progress: number;
  completions: number;
  certificates: number;
}

export async function getPortalStats(portal: string): Promise<PortalStats> {
  const rows = await sql(
    `WITH ${UI_CTE}
     SELECT
       (SELECT COUNT(*) FROM pu)::int AS users,
       (SELECT COUNT(*) FROM users u
         WHERE u.registered_surface = $1 AND u.created_at >= now() - interval '30 days')::int AS new_30,
       (SELECT COUNT(DISTINCT user_id) FROM ui WHERE last_at >= now() - interval '30 days')::int AS active_30,
       (SELECT COUNT(*) FROM ui WHERE is_course AND completed_at IS NULL)::int AS in_progress,
       (SELECT COUNT(*) FROM ui WHERE completed_at IS NOT NULL)::int AS completions,
       (SELECT COUNT(*) FROM ui WHERE cert_earned)::int AS certificates`,
    [portal],
  );
  return rows[0] as PortalStats;
}

// -----------------------------------------------------------------------------
// Users (roster)
// -----------------------------------------------------------------------------

export interface PortalUserRow {
  id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  organization: string | null;
  state: string | null;
  county: string | null;
  zip: string | null;
  role: string;
  role_other: string | null;
  /** "I am a…" keys from registration. */
  roles: string[];
  created_at: string;
  registration_completed_at: string | null;
  last_active: string | null;
  items: number;
  in_progress: number;
  completed: number;
}

/**
 * The portal's accounts with everything registration captured. Item / status /
 * accessed-date filters keep a user who has AT LEAST ONE matching item; the
 * count columns stay that person's overall totals.
 */
export async function listPortalUsers(
  portal: string, f: PortalFilters, limit = 5000, onlyUserId?: string,
): Promise<PortalUserRow[]> {
  const { userConds, itemConds, values } = build(portal, f, onlyUserId);
  if (itemConds.length) {
    userConds.push(`EXISTS (SELECT 1 FROM ui WHERE ui.user_id = u.id AND ${itemConds.join(' AND ')})`);
  }
  values.push(limit);
  const rows = await sql(
    `WITH ${UI_CTE}
     SELECT u.id, u.email, u.given_name, u.family_name, u.organization, u.state, u.county, u.zip,
            u.role, u.role_other, u.created_at, u.registration_completed_at,
            COALESCE((SELECT array_agg(ur.role ORDER BY ur.role) FROM user_roles ur WHERE ur.user_id = u.id),
                     '{}') AS roles,
            a.last_active,
            COALESCE(a.items, 0)::int       AS items,
            COALESCE(a.in_progress, 0)::int AS in_progress,
            COALESCE(a.completed, 0)::int   AS completed
     FROM users u
     LEFT JOIN (
       SELECT user_id,
              MAX(last_at) AS last_active,
              COUNT(*) AS items,
              COUNT(*) FILTER (WHERE is_course AND completed_at IS NULL) AS in_progress,
              COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completed
       FROM ui GROUP BY user_id
     ) a ON a.user_id = u.id
     WHERE ${userConds.join(' AND ')}
     ORDER BY u.family_name NULLS LAST, u.given_name NULLS LAST, u.email
     LIMIT $${values.length}`,
    values,
  );
  return rows as PortalUserRow[];
}

/** One portal user, or null when the id is not one of THIS portal's accounts. */
export async function getPortalUser(portal: string, userId: string): Promise<PortalUserRow | null> {
  if (!UUID.test(userId)) return null;
  const rows = await listPortalUsers(portal, EMPTY_FILTERS, 1, userId);
  return rows[0] ?? null;
}

/** One portal user's items, newest first. Empty when the id is not this portal's account. */
export async function getPortalUserProgress(portal: string, userId: string): Promise<PortalProgressRow[]> {
  if (!UUID.test(userId)) return [];
  return listPortalProgress(portal, EMPTY_FILTERS, 2000, userId);
}

// -----------------------------------------------------------------------------
// Progress (one row per person per item)
// -----------------------------------------------------------------------------

export interface PortalProgressRow {
  user_id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  organization: string | null;
  county: string | null;
  zip: string | null;
  resource_id: string;
  title: string | null;
  type: string | null;
  course_code: string | null;
  /** Listed in this portal's library (else reached through the Fletcher Group Library). */
  on_portal: boolean;
  is_course: boolean;
  views: number;
  shares: number;
  downloads: number;
  first_at: string | null;
  last_at: string | null;
  completed_at: string | null;
  pct: number | null;
  tracked_done: number | null;
  tracked_total: number | null;
  quiz_best: number | null;
  quiz_max: number | null;
  quiz_passed: boolean | null;
  eval_submitted: boolean | null;
  cert_earned: boolean | null;
  ce_hours: number | null;
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export async function listPortalProgress(
  portal: string, f: PortalFilters, limit = 20000, onlyUserId?: string,
): Promise<PortalProgressRow[]> {
  const { userConds, itemConds, values } = build(portal, f, onlyUserId);
  values.push(limit);
  const rows = await sql(
    `WITH ${UI_CTE}
     SELECT ui.user_id, u.email, u.given_name, u.family_name, u.organization, u.county, u.zip,
            ui.resource_id, r.title, r.type::text AS type, r.course_code,
            EXISTS (SELECT 1 FROM resource_visibility rv JOIN tenants t ON t.id = rv.tenant_id
                    WHERE rv.resource_id = ui.resource_id AND t.slug = $1) AS on_portal,
            ui.is_course, ui.views, ui.shares, ui.downloads, ui.first_at, ui.last_at, ui.completed_at,
            ui.pct, ui.tracked_done, ui.tracked_total, ui.quiz_best, ui.quiz_max, ui.quiz_passed,
            ui.eval_submitted, ui.cert_earned, ui.ce_hours
     FROM ui
     JOIN users u ON u.id = ui.user_id
     LEFT JOIN resources r ON r.id = ui.resource_id
     WHERE ${[...userConds, ...itemConds].join(' AND ')}
     ORDER BY ui.last_at DESC NULLS LAST, u.email, r.title
     LIMIT $${values.length}`,
    values,
  );
  return rows.map((r) => ({
    ...r,
    pct: num(r.pct), quiz_best: num(r.quiz_best), quiz_max: num(r.quiz_max), ce_hours: num(r.ce_hours),
  })) as PortalProgressRow[];
}

/** "Completed" / "In progress 40%" / "Viewed" — one wording for page and export. */
export function statusLabel(row: Pick<PortalProgressRow, 'completed_at' | 'is_course' | 'pct'>): string {
  if (row.completed_at) return 'Completed';
  if (row.is_course) return `In progress ${Math.round(row.pct ?? 0)}%`;
  return 'Viewed';
}

// -----------------------------------------------------------------------------
// Filter option lists
// -----------------------------------------------------------------------------

export interface ItemOption { id: string; title: string; course_code: string | null; type: string; on_portal: boolean }

/** Items offered by the Item filter: the portal's own library plus anything its users have touched. */
export async function listItemOptions(portal: string): Promise<ItemOption[]> {
  const rows = await sql(
    `WITH ${UI_CTE},
     lib AS (
       SELECT rv.resource_id FROM resource_visibility rv
       JOIN tenants t ON t.id = rv.tenant_id WHERE t.slug = $1
     )
     SELECT r.id, r.title, r.course_code, r.type::text AS type,
            (r.id IN (SELECT resource_id FROM lib)) AS on_portal
     FROM resources r
     WHERE (r.published = TRUE AND r.id IN (SELECT resource_id FROM lib))
        OR r.id IN (SELECT resource_id FROM ui)
     ORDER BY on_portal DESC, r.title`,
    [portal],
  );
  return rows as ItemOption[];
}

/** Distinct 5-digit zips on the portal's accounts, for the Zip multi-select. */
export async function listZipOptions(portal: string): Promise<Array<{ zip: string; n: number }>> {
  const rows = await sql(
    `SELECT left(zip, 5) AS zip, COUNT(*)::int AS n
     FROM users
     WHERE registered_surface = $1 AND zip ~ '^[0-9]{5}'
     GROUP BY 1 ORDER BY 1`,
    [portal],
  );
  return rows as Array<{ zip: string; n: number }>;
}

export const EMPTY_FILTERS: PortalFilters = {
  q: '', org: '', county: '', zips: [], roles: [], items: [],
  status: '', dateField: 'accessed', from: null, to: null,
};

export function roleLabels(roles: string[], roleOther: string | null): string {
  return roles
    .map((r) => (r === 'other' && roleOther ? `Other: ${roleOther}` : USER_ROLE_LABELS[r as UserRole] ?? r))
    .join('; ');
}
