// =============================================================================
// Monthly report (Jennifer, 10-1-26). SERVER-ONLY.
// =============================================================================
// Jennifer files a monthly report on the Learning Resource Center; her 10-1
// email asked for podcast plays, the "I am a…" registration breakdown, and
// evaluation results for September. This module pulls one calendar month of
// everything we hold on those plus the activity log and Vercel traffic, so
// /admin/reports/monthly can show it and the export route can hand it over as
// Excel / CSV. Every query is bounded by [since, until) in UTC.
//
// Data origins (caveats the page repeats): view history starts 8-29-26,
// share/download 9-17-26, podcast 'play' 10-1-26; registrations and
// evaluations are complete from launch. Staff and admin accounts are left out
// of the registration counts — they are not learners.
// =============================================================================
import { sql } from './db';
import {
  getDailyTraffic, getTopBy, vercelAnalyticsEnabled, type DimRow,
} from './vercel-analytics';
import { getTenantConfig } from './tenants';
import { USER_ROLE_LABELS, type UserRole } from '@/types';

// -----------------------------------------------------------------------------
// Month window
// -----------------------------------------------------------------------------

export interface MonthWindow {
  /** 'YYYY-MM' */
  key: string;
  /** 'September 2026' */
  label: string;
  /** First day, 'YYYY-MM-DD' (inclusive). */
  since: string;
  /** First day of the next month, 'YYYY-MM-DD' (exclusive). */
  until: string;
  /** Same as `key` when already at the earliest month. */
  prev: string;
  /** null when this is the current month. */
  next: string | null;
  isCurrent: boolean;
}

/** Earliest month that can hold anything — first registrations landed July 2026. */
const FIRST_MONTH = '2026-07';

const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;

function shift(y: number, m: number, by: number): [number, number] {
  const idx = y * 12 + (m - 1) + by;
  return [Math.floor(idx / 12), (idx % 12) + 1];
}

/**
 * Parse a 'YYYY-MM' query value. Default is the previous calendar month — the
 * one the report is about — unless a month is named. Clamped to
 * [FIRST_MONTH, this month] so a typo can't build an empty or future report.
 */
export function parseMonth(raw: string | undefined, now = new Date()): MonthWindow {
  const curY = now.getUTCFullYear();
  const curM = now.getUTCMonth() + 1;
  const current = monthKey(curY, curM);

  let y: number; let m: number;
  const match = /^(\d{4})-(\d{2})$/.exec(raw ?? '');
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    y = Number(match[1]); m = Number(match[2]);
  } else {
    [y, m] = shift(curY, curM, -1);
  }
  let key = monthKey(y, m);
  if (key < FIRST_MONTH) {
    [y, m] = FIRST_MONTH.split('-').map(Number) as [number, number];
    key = FIRST_MONTH;
  }
  if (key > current) { y = curY; m = curM; key = current; }

  const [ny, nm] = shift(y, m, 1);
  const [py, pm] = shift(y, m, -1);
  const prevKey = monthKey(py, pm);
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  return {
    key, label,
    since: `${key}-01`,
    until: `${monthKey(ny, nm)}-01`,
    prev: prevKey >= FIRST_MONTH ? prevKey : key,
    next: key < current ? monthKey(ny, nm) : null,
    isCurrent: key === current,
  };
}

/** Available months, newest first, for the picker. */
export function monthOptions(now = new Date()): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = [];
  let w = parseMonth(monthKey(now.getUTCFullYear(), now.getUTCMonth() + 1), now);
  for (;;) {
    out.push({ key: w.key, label: w.label });
    if (w.prev === w.key) break;
    w = parseMonth(w.prev, now);
  }
  return out;
}

// -----------------------------------------------------------------------------
// Sections
// -----------------------------------------------------------------------------

export interface SurfaceCount { surface: string; label: string; count: number }
export interface RoleCount { role: string; label: string; users: number }

export interface RegistrationSection {
  /** Learner accounts that completed registration in the month. */
  total: number;
  /** Staff / admin accounts registered in the month, excluded from the rest. */
  excludedStaff: number;
  bySurface: SurfaceCount[];
  /** "I am a…" picks — multi-select, so these sum past `total`. */
  byRole: RoleCount[];
  /** How many of `total` ticked more than one category. */
  multiRole: number;
  /** Free-text "Other" answers, most recent first. */
  otherTexts: string[];
}

export interface PodcastRow {
  id: string;
  slug: string;
  title: string;
  /** Distinct signed-in users who pressed play. */
  players: number;
  plays: number;
  /** Distinct signed-in users who opened the page. */
  openers: number;
  opens: number;
}

export type EvalRatingKey = 'made_sense' | 'can_apply' | 'presented_well' | 'overall_impression' | 'would_recommend';

export interface EvaluationSummary extends Record<EvalRatingKey, number | null> {
  responses: number;
  users: number;
  items: number;
  may_contact: number;
  with_text: number;
}

export interface EvaluationItemRow extends Record<EvalRatingKey, number> {
  resource_id: string | null;
  title: string;
  course_code: string | null;
  type: string | null;
  responses: number;
}

export interface EvaluationComment {
  created_at: string;
  title: string;
  liked: string | null;
  disliked: string | null;
  future_topics: string | null;
}

export interface TopResourceRow {
  id: string;
  title: string;
  type: string;
  course_code: string | null;
  viewers: number;
  views: number;
  downloads: number;
  shares: number;
  completions: number;
}

export interface ActivitySection {
  activeUsers: number;
  views: number;
  downloads: number;
  shares: number;
  plays: number;
  completions: number;
  topResources: TopResourceRow[];
}

export interface TrafficSection {
  pageviews: number;
  visitors: number;
  devices: DimRow[];
  topPages: DimRow[];
  countries: DimRow[];
}

export interface MonthlyReport {
  month: MonthWindow;
  generatedAt: string;
  registrations: RegistrationSection;
  podcast: PodcastRow[];
  evaluations: { summary: EvaluationSummary; byItem: EvaluationItemRow[]; comments: EvaluationComment[] };
  activity: ActivitySection;
  /** null when Vercel isn't configured; `{ error }` when the API call failed. */
  traffic: TrafficSection | { error: string } | null;
}

const surfaceLabel = (slug: string): string =>
  slug === 'fgi' ? 'Fletcher Group Library' : getTenantConfig(slug)?.name ?? slug;

const n = (v: unknown): number => Number(v ?? 0);
const avg = (v: unknown): number | null =>
  v === null || v === undefined ? null : Math.round(Number(v) * 10) / 10;

/**
 * Accounts that count as learners for reporting: not staff, not admins.
 * Hardcoded fragment, never user input.
 */
const LEARNER_ROLES = "('learner', 'tenant_admin')";

async function registrations(w: MonthWindow): Promise<RegistrationSection> {
  const [totals, bySurface, byRole, multi, other] = await Promise.all([
    sql(
      `SELECT COUNT(*) FILTER (WHERE role IN ${LEARNER_ROLES})::int AS learners,
              COUNT(*) FILTER (WHERE role NOT IN ${LEARNER_ROLES})::int AS staff
       FROM users
       WHERE registration_completed_at >= $1 AND registration_completed_at < $2`,
      [w.since, w.until],
    ),
    sql(
      `SELECT COALESCE(registered_surface, 'fgi') AS surface, COUNT(*)::int AS count
       FROM users
       WHERE registration_completed_at >= $1 AND registration_completed_at < $2
         AND role IN ${LEARNER_ROLES}
       GROUP BY 1 ORDER BY 2 DESC`,
      [w.since, w.until],
    ),
    sql(
      `SELECT ur.role, COUNT(DISTINCT ur.user_id)::int AS users
       FROM user_roles ur JOIN users u ON u.id = ur.user_id
       WHERE u.registration_completed_at >= $1 AND u.registration_completed_at < $2
         AND u.role IN ${LEARNER_ROLES}
       GROUP BY 1 ORDER BY 2 DESC`,
      [w.since, w.until],
    ),
    sql(
      `SELECT COUNT(*)::int AS multi FROM (
         SELECT ur.user_id FROM user_roles ur JOIN users u ON u.id = ur.user_id
         WHERE u.registration_completed_at >= $1 AND u.registration_completed_at < $2
           AND u.role IN ${LEARNER_ROLES}
         GROUP BY ur.user_id HAVING COUNT(*) > 1
       ) x`,
      [w.since, w.until],
    ),
    sql(
      `SELECT role_other FROM users
       WHERE registration_completed_at >= $1 AND registration_completed_at < $2
         AND role IN ${LEARNER_ROLES}
         AND role_other IS NOT NULL AND btrim(role_other) <> ''
       ORDER BY registration_completed_at DESC`,
      [w.since, w.until],
    ),
  ]);
  const t = totals[0] as { learners: number; staff: number };
  // Every category appears, even at zero.
  const roleMap = new Map((byRole as Array<{ role: string; users: number }>).map((r) => [r.role, r.users]));
  const roles: RoleCount[] = (Object.keys(USER_ROLE_LABELS) as UserRole[])
    .map((role) => ({ role, label: USER_ROLE_LABELS[role], users: roleMap.get(role) ?? 0 }))
    .sort((a, b) => b.users - a.users);
  return {
    total: n(t.learners),
    excludedStaff: n(t.staff),
    bySurface: (bySurface as Array<{ surface: string; count: number }>).map((r) => ({
      surface: r.surface, label: surfaceLabel(r.surface), count: r.count,
    })),
    byRole: roles,
    multiRole: n((multi[0] as { multi: number }).multi),
    otherTexts: (other as Array<{ role_other: string }>).map((r) => r.role_other.trim()),
  };
}

/** Every published podcast row, newest first, with the month's plays and page opens (zeros kept). */
async function podcast(w: MonthWindow): Promise<PodcastRow[]> {
  const rows = await sql(
    `SELECT r.id, r.slug, r.title,
            COUNT(DISTINCT e.user_id) FILTER (WHERE e.event = 'play')::int AS players,
            COUNT(e.id)               FILTER (WHERE e.event = 'play')::int AS plays,
            COUNT(DISTINCT e.user_id) FILTER (WHERE e.event = 'view')::int AS openers,
            COUNT(e.id)               FILTER (WHERE e.event = 'view')::int AS opens
     FROM resources r
     LEFT JOIN user_resource_events e
       ON e.resource_id = r.id AND e.created_at >= $1 AND e.created_at < $2
     WHERE r.type = 'podcast' AND r.published = TRUE
     GROUP BY r.id, r.slug, r.title, r.event_date, r.published_at
     ORDER BY COALESCE(r.event_date, r.published_at) DESC NULLS LAST, r.title`,
    [w.since, w.until],
  );
  return rows as PodcastRow[];
}

async function evaluations(w: MonthWindow): Promise<MonthlyReport['evaluations']> {
  const [summary, byItem, comments] = await Promise.all([
    sql(
      `SELECT COUNT(*)::int AS responses,
              COUNT(DISTINCT user_id)::int AS users,
              COUNT(DISTINCT COALESCE(resource_id::text, resource_slug))::int AS items,
              AVG(made_sense) AS made_sense, AVG(can_apply) AS can_apply,
              AVG(presented_well) AS presented_well, AVG(overall_impression) AS overall_impression,
              AVG(would_recommend) AS would_recommend,
              COUNT(*) FILTER (WHERE may_contact)::int AS may_contact,
              COUNT(*) FILTER (WHERE liked IS NOT NULL OR disliked IS NOT NULL OR future_topics IS NOT NULL)::int AS with_text
       FROM evaluation_responses
       WHERE created_at >= $1 AND created_at < $2`,
      [w.since, w.until],
    ),
    sql(
      `SELECT e.resource_id, COALESCE(r.title, e.resource_slug) AS title, r.course_code, r.type::text AS type,
              COUNT(*)::int AS responses,
              ROUND(AVG(e.made_sense)::numeric, 1)::float AS made_sense,
              ROUND(AVG(e.can_apply)::numeric, 1)::float AS can_apply,
              ROUND(AVG(e.presented_well)::numeric, 1)::float AS presented_well,
              ROUND(AVG(e.overall_impression)::numeric, 1)::float AS overall_impression,
              ROUND(AVG(e.would_recommend)::numeric, 1)::float AS would_recommend
       FROM evaluation_responses e
       LEFT JOIN resources r ON r.id = e.resource_id
       WHERE e.created_at >= $1 AND e.created_at < $2
       GROUP BY e.resource_id, COALESCE(r.title, e.resource_slug), r.course_code, r.type
       ORDER BY responses DESC, title`,
      [w.since, w.until],
    ),
    sql(
      `SELECT e.created_at, COALESCE(r.title, e.resource_slug) AS title, e.liked, e.disliked, e.future_topics
       FROM evaluation_responses e
       LEFT JOIN resources r ON r.id = e.resource_id
       WHERE e.created_at >= $1 AND e.created_at < $2
         AND (e.liked IS NOT NULL OR e.disliked IS NOT NULL OR e.future_topics IS NOT NULL)
       ORDER BY e.created_at DESC`,
      [w.since, w.until],
    ),
  ]);
  const s = summary[0] as Record<string, unknown>;
  return {
    summary: {
      responses: n(s.responses), users: n(s.users), items: n(s.items),
      made_sense: avg(s.made_sense), can_apply: avg(s.can_apply), presented_well: avg(s.presented_well),
      overall_impression: avg(s.overall_impression), would_recommend: avg(s.would_recommend),
      may_contact: n(s.may_contact), with_text: n(s.with_text),
    },
    byItem: byItem as EvaluationItemRow[],
    comments: (comments as Array<Omit<EvaluationComment, 'created_at'> & { created_at: Date | string }>)
      .map((c) => ({ ...c, created_at: new Date(c.created_at).toISOString() })),
  };
}

async function activity(w: MonthWindow): Promise<ActivitySection> {
  const [totals, top] = await Promise.all([
    sql(
      `SELECT COUNT(DISTINCT user_id)::int AS active_users,
              COUNT(*) FILTER (WHERE event = 'view')::int        AS views,
              COUNT(*) FILTER (WHERE event = 'download')::int    AS downloads,
              COUNT(*) FILTER (WHERE event = 'share')::int       AS shares,
              COUNT(*) FILTER (WHERE event = 'play')::int        AS plays,
              COUNT(*) FILTER (WHERE event = 'complete')::int    AS completions
       FROM user_resource_events
       WHERE created_at >= $1 AND created_at < $2`,
      [w.since, w.until],
    ),
    sql(
      `SELECT r.id, r.title, r.type::text AS type, r.course_code,
              COUNT(DISTINCT e.user_id) FILTER (WHERE e.event = 'view')::int AS viewers,
              COUNT(*) FILTER (WHERE e.event = 'view')::int     AS views,
              COUNT(*) FILTER (WHERE e.event = 'download')::int AS downloads,
              COUNT(*) FILTER (WHERE e.event = 'share')::int    AS shares,
              COUNT(*) FILTER (WHERE e.event = 'complete')::int AS completions
       FROM user_resource_events e
       JOIN resources r ON r.id = e.resource_id
       WHERE e.created_at >= $1 AND e.created_at < $2
       GROUP BY r.id, r.title, r.type, r.course_code
       ORDER BY viewers DESC, views DESC, r.title
       LIMIT 25`,
      [w.since, w.until],
    ),
  ]);
  const t = totals[0] as Record<string, number>;
  return {
    activeUsers: n(t.active_users), views: n(t.views), downloads: n(t.downloads), shares: n(t.shares),
    plays: n(t.plays), completions: n(t.completions),
    topResources: top as TopResourceRow[],
  };
}

/**
 * Vercel Web Analytics for the month. `until` is read as that morning UTC and
 * is exclusive, so the first of the next month covers the whole last day
 * (same quirk /admin/analytics works around).
 */
async function traffic(w: MonthWindow): Promise<MonthlyReport['traffic']> {
  if (!vercelAnalyticsEnabled) return null;
  try {
    const [daily, devices, topPages, countries] = await Promise.all([
      getDailyTraffic(w.since, w.until),
      getTopBy('deviceType', w.since, w.until, 4),
      getTopBy('requestPath', w.since, w.until, 15),
      getTopBy('country', w.since, w.until, 8),
    ]);
    // Vercel returns dimension rows in its own order with an "Others" bucket;
    // sort by views so the tables read top-down, Others last.
    const byViews = (rows: DimRow[]) => [...rows].sort((a, b) =>
      (a.key === 'Others' ? 1 : 0) - (b.key === 'Others' ? 1 : 0) || b.pageviews - a.pageviews);
    return {
      pageviews: daily.reduce((s, d) => s + d.pageviews, 0),
      visitors: daily.reduce((s, d) => s + d.visitors, 0),
      devices: byViews(devices), topPages: byViews(topPages), countries: byViews(countries),
    };
  } catch (err) {
    console.error('[monthly-report] vercel', err);
    return { error: 'Could not load traffic from Vercel — the token may be invalid or expired.' };
  }
}

export async function getMonthlyReport(w: MonthWindow): Promise<MonthlyReport> {
  const [reg, pod, evals, act, tra] = await Promise.all([
    registrations(w), podcast(w), evaluations(w), activity(w), traffic(w),
  ]);
  return {
    month: w, generatedAt: new Date().toISOString(),
    registrations: reg, podcast: pod, evaluations: evals, activity: act, traffic: tra,
  };
}
