// =============================================================================
// Admin: learner activity reporting (Jennifer, 9-17-26). SERVER-ONLY.
//
// Answers "what did this person / organization access, share, download?" and
// "who accessed this resource?" from two tables that already exist:
//   user_resource_events   view / course_open / complete / share / download
//   user_course_progress   Moodle course mirror — started, pct, completed_at
// Only signed-in activity is attributed, and nothing predates 8-29-26 (the
// My Resources build that started logging). Share/download events start
// 9-17-26.
// =============================================================================
import { sql } from '@/lib/db';

/** "All time" is expressed as a very large window so every query has one shape. */
export const RANGE_DAYS = [30, 90, 365, 36500] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];
export const RANGE_LABEL: Record<RangeDays, string> = {
  30: '30 days', 90: '90 days', 365: '12 months', 36500: 'All time',
};
export function parseRange(v: string | undefined): RangeDays {
  const n = Number(v);
  return (RANGE_DAYS as readonly number[]).includes(n) ? (n as RangeDays) : 90;
}

export interface PersonRow {
  id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  organization: string | null;
  role: string;
  views: number;
  shares: number;
  downloads: number;
  completions: number;
  last_seen: string | null;
}

export function personName(p: { given_name: string | null; family_name: string | null; email: string }): string {
  return [p.given_name, p.family_name].filter(Boolean).join(' ') || p.email;
}

/**
 * People matching a name / email / organization substring, with their
 * activity counts inside the window. An organization search therefore
 * returns everyone at that org — the org roll-up is the sum of the rows.
 */
export async function searchPeople(q: string, days: RangeDays, limit = 200): Promise<PersonRow[]> {
  const term = q.trim();
  const like = `%${term}%`;
  const rows = await sql`
    SELECT u.id, u.email, u.given_name, u.family_name, u.organization, u.role,
           COALESCE(ev.views, 0)::int       AS views,
           COALESCE(ev.shares, 0)::int      AS shares,
           COALESCE(ev.downloads, 0)::int   AS downloads,
           COALESCE(cp.completions, 0)::int AS completions,
           GREATEST(ev.last_seen, cp.last_completed) AS last_seen
    FROM users u
    LEFT JOIN (
      SELECT user_id,
             COUNT(*) FILTER (WHERE event = 'view')     AS views,
             COUNT(*) FILTER (WHERE event = 'share')    AS shares,
             COUNT(*) FILTER (WHERE event = 'download') AS downloads,
             MAX(created_at) AS last_seen
      FROM user_resource_events
      WHERE created_at >= now() - make_interval(days => ${days})
      GROUP BY user_id
    ) ev ON ev.user_id = u.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS completions, MAX(completed_at) AS last_completed
      FROM user_course_progress
      WHERE completed_at IS NOT NULL
        AND completed_at >= now() - make_interval(days => ${days})
      GROUP BY user_id
    ) cp ON cp.user_id = u.id
    WHERE ${term} = ''
       OR u.email ILIKE ${like}
       OR u.organization ILIKE ${like}
       OR CONCAT_WS(' ', u.given_name, u.family_name) ILIKE ${like}
    ORDER BY last_seen DESC NULLS LAST, u.created_at DESC
    LIMIT ${limit}
  `;
  return rows as PersonRow[];
}

export interface ResourceRow {
  id: string;
  slug: string;
  title: string;
  type: string;
  course_code: string | null;
  views: number;
  viewers: number;
  shares: number;
  downloads: number;
  completions: number;
  last_seen: string | null;
}

/** Resources matching a title / ID substring, with activity counts inside the window. */
export async function searchResources(q: string, days: RangeDays, limit = 200): Promise<ResourceRow[]> {
  const term = q.trim();
  const like = `%${term}%`;
  const rows = await sql`
    SELECT r.id, r.slug, r.title, r.type, r.course_code,
           COALESCE(ev.views, 0)::int       AS views,
           COALESCE(ev.viewers, 0)::int     AS viewers,
           COALESCE(ev.shares, 0)::int      AS shares,
           COALESCE(ev.downloads, 0)::int   AS downloads,
           COALESCE(cp.completions, 0)::int AS completions,
           GREATEST(ev.last_seen, cp.last_completed) AS last_seen
    FROM resources r
    LEFT JOIN (
      SELECT resource_id,
             COUNT(*) FILTER (WHERE event = 'view')                 AS views,
             COUNT(DISTINCT user_id) FILTER (WHERE event = 'view')  AS viewers,
             COUNT(*) FILTER (WHERE event = 'share')                AS shares,
             COUNT(*) FILTER (WHERE event = 'download')             AS downloads,
             MAX(created_at) AS last_seen
      FROM user_resource_events
      WHERE created_at >= now() - make_interval(days => ${days})
      GROUP BY resource_id
    ) ev ON ev.resource_id = r.id
    LEFT JOIN (
      SELECT resource_id, COUNT(*) AS completions, MAX(completed_at) AS last_completed
      FROM user_course_progress
      WHERE completed_at IS NOT NULL
        AND completed_at >= now() - make_interval(days => ${days})
      GROUP BY resource_id
    ) cp ON cp.resource_id = r.id
    WHERE r.published = TRUE
      AND (${term} = '' OR r.title ILIKE ${like} OR r.course_code ILIKE ${like})
    ORDER BY views DESC, completions DESC, r.title
    LIMIT ${limit}
  `;
  return rows as ResourceRow[];
}

export interface EventRow {
  id: number;
  event: string;
  surface: string;
  created_at: string;
  resource_id: string | null;
  slug: string | null;
  title: string | null;
  type: string | null;
  course_code: string | null;
}

/** One person's event log, newest first. Resources deleted since show with no title. */
export async function getUserEvents(userId: string, days: RangeDays, limit = 1000): Promise<EventRow[]> {
  const rows = await sql`
    SELECT e.id, e.event, e.surface, e.created_at,
           e.resource_id, r.slug, r.title, r.type, r.course_code
    FROM user_resource_events e
    LEFT JOIN resources r ON r.id = e.resource_id
    WHERE e.user_id = ${userId}
      AND e.created_at >= now() - make_interval(days => ${days})
    ORDER BY e.created_at DESC
    LIMIT ${limit}
  `;
  return rows as EventRow[];
}

export interface ResourceUserRow {
  user_id: string;
  email: string;
  given_name: string | null;
  family_name: string | null;
  organization: string | null;
  views: number;
  shares: number;
  downloads: number;
  first_seen: string | null;
  last_seen: string | null;
  started_at: string | null;
  pct: number | null;
  completed_at: string | null;
}

/** Everyone who touched one resource inside the window, with course status where it is a course. */
export async function getResourceUsers(resourceId: string, days: RangeDays): Promise<ResourceUserRow[]> {
  const rows = await sql`
    SELECT u.id AS user_id, u.email, u.given_name, u.family_name, u.organization,
           COALESCE(ev.views, 0)::int     AS views,
           COALESCE(ev.shares, 0)::int    AS shares,
           COALESCE(ev.downloads, 0)::int AS downloads,
           ev.first_seen, ev.last_seen,
           p.started_at, p.pct, p.completed_at
    FROM users u
    LEFT JOIN (
      SELECT user_id,
             COUNT(*) FILTER (WHERE event = 'view')     AS views,
             COUNT(*) FILTER (WHERE event = 'share')    AS shares,
             COUNT(*) FILTER (WHERE event = 'download') AS downloads,
             MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
      FROM user_resource_events
      WHERE resource_id = ${resourceId}
        AND created_at >= now() - make_interval(days => ${days})
      GROUP BY user_id
    ) ev ON ev.user_id = u.id
    LEFT JOIN user_course_progress p
      ON p.user_id = u.id AND p.resource_id = ${resourceId}
     AND COALESCE(p.last_activity_at, p.started_at) >= now() - make_interval(days => ${days})
    WHERE ev.user_id IS NOT NULL OR p.user_id IS NOT NULL
    ORDER BY GREATEST(ev.last_seen, p.last_activity_at, p.started_at) DESC NULLS LAST
  `;
  return rows.map((r) => ({ ...r, pct: r.pct === null ? null : Number(r.pct) })) as ResourceUserRow[];
}

export const EVENT_LABEL: Record<string, string> = {
  view: 'Viewed',
  course_open: 'Opened course',
  complete: 'Completed',
  share: 'Shared',
  download: 'Downloaded',
};
