// =============================================================================
// My Learning — per-learner course progress, bookmarks, and library activity.
// SERVER-SIDE ONLY (imports lib/moodle).
//
// Moodle stays the source of truth for completion; `user_course_progress` is a
// Neon mirror refreshed every time the course player loads (CourseView already
// has the contents + completion in hand) and on demand from the account page.
// Mirroring is what makes the page fast, gives CE totals in SQL, keeps a
// completion-time snapshot of CE hours for transcripts, and leaves an admin
// completions report one query away. See docs/CLAUDE.md §6cm.
// =============================================================================
import { sql } from '@/lib/db';
import {
  getActivitiesCompletion,
  getCourseContents,
  getUserGradeItems,
  type ActivityCompletion,
  type MoodleSection,
} from '@/lib/moodle';
import { getTenantConfig } from '@/lib/tenants';
import type { CourseResource } from '@/lib/resources';

// ---------------------------------------------------------------------------
// Derivation — one place that decides what "done" means, matching the
// player's rules: tracked = completion > 0, certificate excluded, forums out.
// ---------------------------------------------------------------------------

const QUIZ_MODNAMES = new Set(['quiz']);
const EVAL_MODNAMES = new Set(['feedback', 'questionnaire']);
const CERT_MODNAMES = new Set(['customcert']);

const isDone = (state: number | undefined) => state === 1 || state === 2;

export interface DerivedProgress {
  tracked_total: number;
  tracked_done: number;
  pct: number;
  next_cmid: number | null;
  next_module_name: string | null;
  all_done: boolean;
  last_activity_at: Date | null;
  quiz_cmid: number | null;
  quiz_state: number | null;
  eval_cmid: number | null;
  eval_submitted: boolean;
  cert_cmid: number | null;
  cert_earned: boolean;
}

/** Moodle web services return activity names HTML-escaped. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function deriveProgress(
  sections: MoodleSection[],
  completion: ActivityCompletion[],
): DerivedProgress {
  const byCmid = new Map(completion.map((c) => [c.cmid, c]));
  const modules = sections
    .filter((s) => s.visible)
    .flatMap((s) => s.modules)
    .filter((m) => m.visible && m.url && m.modname !== 'forum');

  const tracked = modules.filter(
    (m) => (m.completion ?? 0) > 0 && !CERT_MODNAMES.has(m.modname),
  );
  const doneList = tracked.filter((m) => isDone(byCmid.get(m.id)?.state));
  const next = tracked.find((m) => !isDone(byCmid.get(m.id)?.state)) ?? null;

  let lastTs = 0;
  for (const m of tracked) {
    const t = byCmid.get(m.id)?.timecompleted ?? 0;
    if (t > lastTs) lastTs = t;
  }

  const quiz = modules.find((m) => QUIZ_MODNAMES.has(m.modname)) ?? null;
  const evalMod = modules.find((m) => EVAL_MODNAMES.has(m.modname)) ?? null;
  const cert = modules.find((m) => CERT_MODNAMES.has(m.modname)) ?? null;
  const allDone = tracked.length > 0 && doneList.length === tracked.length;

  return {
    tracked_total: tracked.length,
    tracked_done: doneList.length,
    pct: tracked.length ? Math.round((doneList.length / tracked.length) * 100) : 0,
    next_cmid: next?.id ?? null,
    next_module_name: next ? decodeEntities(next.name) : null,
    all_done: allDone,
    last_activity_at: lastTs ? new Date(lastTs * 1000) : null,
    quiz_cmid: quiz?.id ?? null,
    quiz_state: quiz ? (byCmid.get(quiz.id)?.state ?? 0) : null,
    eval_cmid: evalMod?.id ?? null,
    eval_submitted: evalMod ? isDone(byCmid.get(evalMod.id)?.state) : false,
    cert_cmid: cert?.id ?? null,
    // Mirrors the Moodle availability gate: the certificate is restricted on
    // every tracked activity, so "all done" is exactly "earned".
    cert_earned: Boolean(cert) && allDone,
  };
}

// ---------------------------------------------------------------------------
// Sync — upsert the mirror row for one learner × course
// ---------------------------------------------------------------------------

export interface SyncInput {
  userId: string;
  moodleUserId: number;
  resource: Pick<CourseResource, 'id' | 'moodle_course_id' | 'ceu_credits' | 'is_naadac_ce'>;
  surface: string;
  sections: MoodleSection[];
  completion: ActivityCompletion[];
}

/**
 * Course → library mirror for the tenant certification series (Jason,
 * 8-31-26): a "Part N" video page completed inside the pre-cert course (the
 * watch-gated, authoritative copy) also stamps the matching standalone
 * library video as viewed, so My Learning's "n of 7 viewed" line agrees with
 * the course. One direction only — opening the library page never completes
 * anything in the course, because the library has no 90% watch tracking.
 * Never throws; a mirror failure must not break the player.
 */
async function mirrorRequiredVideoViews(
  userId: string,
  surface: string,
  sections: MoodleSection[],
  completion: ActivityCompletion[],
): Promise<void> {
  try {
    const slugs = getTenantConfig(surface)?.v3?.collections?.['required-videos']?.slugs;
    if (!slugs?.length) return;
    const byCmid = new Map(completion.map((c) => [c.cmid, c]));
    const watched: string[] = [];
    for (const s of sections) {
      for (const m of s.modules) {
        if (m.modname !== 'page') continue;
        const match = /^Part (\d+)\b/.exec(decodeEntities(m.name));
        if (!match) continue;
        // Match by part number in the slug, not list position, so the
        // collection order can never mis-map a video.
        const slug = slugs.find((sl) => sl.includes(`-part-${match[1]}-`));
        if (slug && isDone(byCmid.get(m.id)?.state)) watched.push(slug);
      }
    }
    if (watched.length === 0) return;
    // One 'view' row per resource is all getViewedSlugs needs — skip any the
    // learner already has, so repeated player loads don't grow the table.
    await sql`
      INSERT INTO user_resource_events (user_id, resource_id, event, surface)
      SELECT ${userId}, r.id, 'view', ${surface}
      FROM resources r
      WHERE r.slug = ANY(${watched})
        AND NOT EXISTS (
          SELECT 1 FROM user_resource_events e
          WHERE e.user_id = ${userId} AND e.resource_id = r.id
        )
    `;
  } catch (e) {
    console.warn('Required-video mirror skipped:', (e as Error).message);
  }
}

/**
 * Persist the learner's state for one course. Cheap enough to run on every
 * player load: one upsert, plus one grade lookup only once the quiz has been
 * attempted (a grade cannot exist before that).
 */
export async function syncCourseProgress(input: SyncInput): Promise<DerivedProgress> {
  const d = deriveProgress(input.sections, input.completion);
  const courseId = input.resource.moodle_course_id!;

  // Quiz result — best-effort; the grant may be missing (see grantws.php).
  let quizBest: number | null = null;
  let quizMax: number | null = null;
  let quizPassed: boolean | null = null;
  if (d.quiz_cmid && d.quiz_state && d.quiz_state > 0) {
    try {
      const items = await getUserGradeItems(courseId, input.moodleUserId);
      const item = items.find((g) => g.cmid === d.quiz_cmid);
      if (item && item.graderaw !== null) {
        quizBest = Number(item.graderaw);
        quizMax = Number(item.grademax);
      }
    } catch (e) {
      console.warn('Grade lookup skipped:', (e as Error).message);
    }
    // Completion state carries pass/fail when the quiz completes on a passing
    // grade (2 = complete-pass, 3 = complete-fail).
    if (d.quiz_state === 2) quizPassed = true;
    else if (d.quiz_state === 3) quizPassed = false;
    else if (quizBest !== null && quizMax) quizPassed = quizBest / quizMax >= 0.7;
  }

  // Completion time comes from Moodle when it reports one; otherwise "now".
  const completedAt = d.all_done ? (d.last_activity_at ?? new Date()) : null;
  const ceHours = d.all_done ? input.resource.ceu_credits : null;
  const naadac = d.all_done ? input.resource.is_naadac_ce : null;

  await sql`
    INSERT INTO user_course_progress (
      user_id, resource_id, moodle_course_id, surface,
      tracked_total, tracked_done, pct, next_cmid, next_module_name,
      completed_at, last_activity_at,
      quiz_cmid, quiz_best, quiz_max, quiz_passed,
      eval_cmid, eval_submitted,
      cert_cmid, cert_earned,
      ce_hours, is_naadac_ce, synced_at
    ) VALUES (
      ${input.userId}, ${input.resource.id}, ${courseId}, ${input.surface},
      ${d.tracked_total}, ${d.tracked_done}, ${d.pct}, ${d.next_cmid}, ${d.next_module_name},
      ${completedAt}, ${d.last_activity_at},
      ${d.quiz_cmid}, ${quizBest}, ${quizMax}, ${quizPassed},
      ${d.eval_cmid}, ${d.eval_submitted},
      ${d.cert_cmid}, ${d.cert_earned},
      ${ceHours}, ${naadac}, now()
    )
    ON CONFLICT (user_id, resource_id) DO UPDATE SET
      moodle_course_id = EXCLUDED.moodle_course_id,
      surface          = EXCLUDED.surface,
      tracked_total    = EXCLUDED.tracked_total,
      tracked_done     = EXCLUDED.tracked_done,
      pct              = EXCLUDED.pct,
      next_cmid        = EXCLUDED.next_cmid,
      next_module_name = EXCLUDED.next_module_name,
      -- first completion wins; a later re-open never rewrites the date
      completed_at     = COALESCE(user_course_progress.completed_at, EXCLUDED.completed_at),
      last_activity_at = GREATEST(user_course_progress.last_activity_at, EXCLUDED.last_activity_at),
      quiz_cmid        = EXCLUDED.quiz_cmid,
      quiz_best        = COALESCE(EXCLUDED.quiz_best, user_course_progress.quiz_best),
      quiz_max         = COALESCE(EXCLUDED.quiz_max, user_course_progress.quiz_max),
      quiz_passed      = COALESCE(EXCLUDED.quiz_passed, user_course_progress.quiz_passed),
      eval_cmid        = EXCLUDED.eval_cmid,
      eval_submitted   = EXCLUDED.eval_submitted OR user_course_progress.eval_submitted,
      cert_cmid        = EXCLUDED.cert_cmid,
      cert_earned      = EXCLUDED.cert_earned OR user_course_progress.cert_earned,
      -- CE snapshot is taken once, at completion
      ce_hours         = COALESCE(user_course_progress.ce_hours, EXCLUDED.ce_hours),
      is_naadac_ce     = COALESCE(user_course_progress.is_naadac_ce, EXCLUDED.is_naadac_ce),
      synced_at        = now()
  `;
  await mirrorRequiredVideoViews(input.userId, input.surface, input.sections, input.completion);
  return d;
}

/**
 * Re-pull every course the learner has opened from Moodle. Used by the
 * "Refresh progress" button; N courses → 2N reads, run four at a time.
 */
export async function refreshAllProgress(userId: string, moodleUserId: number): Promise<number> {
  const rows = (await sql`
    SELECT p.resource_id, p.moodle_course_id, p.surface,
           r.ceu_credits, r.is_naadac_ce
    FROM user_course_progress p JOIN resources r ON r.id = p.resource_id
    WHERE p.user_id = ${userId}
  `) as Array<{
    resource_id: string; moodle_course_id: number; surface: string;
    ceu_credits: number | null; is_naadac_ce: boolean;
  }>;

  let synced = 0;
  const queue = [...rows];
  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      try {
        const [sections, completion] = await Promise.all([
          getCourseContents(row.moodle_course_id),
          getActivitiesCompletion(row.moodle_course_id, moodleUserId),
        ]);
        await syncCourseProgress({
          userId, moodleUserId, surface: row.surface, sections, completion,
          resource: {
            id: row.resource_id, moodle_course_id: row.moodle_course_id,
            ceu_credits: row.ceu_credits, is_naadac_ce: row.is_naadac_ce,
          },
        });
        synced++;
      } catch (e) {
        console.error(`Progress refresh failed (course ${row.moodle_course_id}):`, e);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, rows.length) }, worker));
  return synced;
}

// ---------------------------------------------------------------------------
// Reads for the account page
// ---------------------------------------------------------------------------

export interface CourseProgressRow {
  resource_id: string;
  slug: string;
  title: string;
  type: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  course_code: string | null;
  surface: string;
  tracked_total: number;
  tracked_done: number;
  pct: number;
  next_cmid: number | null;
  next_module_name: string | null;
  started_at: string;
  completed_at: string | null;
  last_activity_at: string | null;
  quiz_cmid: number | null;
  quiz_best: number | null;
  quiz_max: number | null;
  quiz_passed: boolean | null;
  eval_cmid: number | null;
  eval_submitted: boolean;
  cert_cmid: number | null;
  cert_earned: boolean;
  cert_code: string | null;
  /** Snapshot at completion, else the catalogue value ("worth N hours"). */
  ce_hours: number | null;
  is_naadac_ce: boolean;
  synced_at: string;
}

export async function getUserProgress(userId: string): Promise<CourseProgressRow[]> {
  const rows = await sql`
    SELECT p.resource_id, r.slug, r.title, r.type, r.thumbnail_url, r.duration_minutes,
           r.course_code, p.surface,
           p.tracked_total, p.tracked_done, p.pct, p.next_cmid, p.next_module_name,
           p.started_at, p.completed_at, p.last_activity_at,
           p.quiz_cmid, p.quiz_best, p.quiz_max, p.quiz_passed,
           p.eval_cmid, p.eval_submitted,
           p.cert_cmid, p.cert_earned, p.cert_code,
           COALESCE(p.ce_hours, r.ceu_credits)        AS ce_hours,
           COALESCE(p.is_naadac_ce, r.is_naadac_ce)   AS is_naadac_ce,
           p.synced_at
    FROM user_course_progress p
    JOIN resources r ON r.id = p.resource_id
    WHERE p.user_id = ${userId}
    ORDER BY p.last_activity_at DESC NULLS LAST, p.started_at DESC
  `;
  return rows.map((r) => ({
    ...r,
    pct: Number(r.pct),
    tracked_total: Number(r.tracked_total),
    tracked_done: Number(r.tracked_done),
    quiz_best: r.quiz_best === null ? null : Number(r.quiz_best),
    quiz_max: r.quiz_max === null ? null : Number(r.quiz_max),
    ce_hours: r.ce_hours === null ? null : Number(r.ce_hours),
  })) as CourseProgressRow[];
}

/** Resource ids the learner has completed — the library cards' checkmark. */
export async function getCompletedResourceIds(userId: string): Promise<string[]> {
  const rows = await sql`
    SELECT resource_id FROM user_course_progress
    WHERE user_id = ${userId} AND completed_at IS NOT NULL
  `;
  return rows.map((r) => r.resource_id as string);
}

export interface CeYear { year: number; hours: number; courses: number }

/** CE hours earned, by completion year — NAADAC renews on a two-year cycle. */
export function summarizeCe(rows: CourseProgressRow[]): { total: number; years: CeYear[] } {
  const byYear = new Map<number, CeYear>();
  let total = 0;
  for (const r of rows) {
    if (!r.completed_at || !r.is_naadac_ce || !r.ce_hours) continue;
    const year = new Date(r.completed_at).getFullYear();
    const y = byYear.get(year) ?? { year, hours: 0, courses: 0 };
    y.hours += r.ce_hours;
    y.courses += 1;
    byYear.set(year, y);
    total += r.ce_hours;
  }
  return { total, years: [...byYear.values()].sort((a, b) => b.year - a.year) };
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export interface BookmarkRow {
  resource_id: string;
  slug: string;
  title: string;
  type: string;
  thumbnail_url: string | null;
  created_at: string;
}

export async function getBookmarks(userId: string): Promise<BookmarkRow[]> {
  const rows = await sql`
    SELECT b.resource_id, r.slug, r.title, r.type, r.thumbnail_url, b.created_at
    FROM user_bookmarks b JOIN resources r ON r.id = b.resource_id
    WHERE b.user_id = ${userId} AND r.published = TRUE
    ORDER BY b.created_at DESC
  `;
  return rows as BookmarkRow[];
}

export async function isBookmarked(userId: string, resourceId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM user_bookmarks WHERE user_id = ${userId} AND resource_id = ${resourceId}
  `;
  return rows.length > 0;
}

/** Returns the new state. */
export async function toggleBookmark(userId: string, resourceId: string): Promise<boolean> {
  const deleted = await sql`
    DELETE FROM user_bookmarks WHERE user_id = ${userId} AND resource_id = ${resourceId}
    RETURNING 1
  `;
  if (deleted.length > 0) return false;
  await sql`
    INSERT INTO user_bookmarks (user_id, resource_id) VALUES (${userId}, ${resourceId})
    ON CONFLICT DO NOTHING
  `;
  return true;
}

// ---------------------------------------------------------------------------
// Library activity
// ---------------------------------------------------------------------------

export type ResourceEvent = 'view' | 'course_open';

/** Never throws — a logging failure must not 500 a page. */
export async function logResourceEvent(
  userId: string,
  resourceId: string,
  event: ResourceEvent,
  surface: string,
): Promise<void> {
  try {
    await sql`
      INSERT INTO user_resource_events (user_id, resource_id, event, surface)
      VALUES (${userId}, ${resourceId}, ${event}, ${surface})
    `;
  } catch (e) {
    console.warn('Resource event not logged:', (e as Error).message);
  }
}

export interface RecentRow {
  resource_id: string;
  slug: string;
  title: string;
  type: string;
  thumbnail_url: string | null;
  last_seen: string;
}

/** Distinct library items (not courses) the learner viewed most recently. */
export async function getRecentlyViewed(userId: string, limit = 6): Promise<RecentRow[]> {
  const rows = await sql`
    SELECT e.resource_id, r.slug, r.title, r.type, r.thumbnail_url,
           MAX(e.created_at) AS last_seen
    FROM user_resource_events e JOIN resources r ON r.id = e.resource_id
    WHERE e.user_id = ${userId} AND e.event = 'view' AND r.published = TRUE
      AND r.type NOT IN ('course', 'naadac_ce')
    GROUP BY e.resource_id, r.slug, r.title, r.type, r.thumbnail_url
    ORDER BY last_seen DESC
    LIMIT ${limit}
  `;
  return rows as RecentRow[];
}

/**
 * Which of the given slugs the learner has opened at least once. The tenant
 * "Required Videos" series are library video resources, not Moodle courses,
 * so "watched" can only mean "opened the video page" here.
 */
export async function getViewedSlugs(userId: string, slugs: string[]): Promise<Set<string>> {
  if (slugs.length === 0) return new Set();
  const rows = await sql`
    SELECT DISTINCT r.slug
    FROM user_resource_events e JOIN resources r ON r.id = e.resource_id
    WHERE e.user_id = ${userId} AND r.slug = ANY(${slugs})
  `;
  return new Set(rows.map((r) => r.slug as string));
}

// ---------------------------------------------------------------------------
// CE transcript export
// ---------------------------------------------------------------------------

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Completed courses as CSV — the fields a NAADAC audit asks for. */
export function transcriptCsv(
  learner: { name: string; email: string },
  rows: CourseProgressRow[],
): string {
  const header = [
    'Learner', 'Email', 'Course', 'Course code', 'Completed on',
    'CE hours', 'NAADAC CE', 'Quiz score', 'Quiz result', 'Certificate',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    if (!r.completed_at) continue;
    const score = r.quiz_best !== null && r.quiz_max
      ? `${Math.round((r.quiz_best / r.quiz_max) * 100)}%`
      : '';
    lines.push([
      learner.name, learner.email, r.title, r.course_code ?? '',
      new Date(r.completed_at).toISOString().slice(0, 10),
      r.ce_hours ?? '', r.is_naadac_ce ? 'Yes' : 'No',
      score, r.quiz_passed === null ? '' : (r.quiz_passed ? 'Pass' : 'Fail'),
      r.cert_earned ? 'Earned' : '',
    ].map(csvCell).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
