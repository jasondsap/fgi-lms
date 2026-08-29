// =============================================================================
// Moodle REST web-services client — SERVER-SIDE ONLY.
// Never import from a client component: MOODLE_WS_TOKEN must not reach the
// browser. All calls go through Moodle's single REST endpoint
// (webservice/rest/server.php) using the token bound to the
// "FGI Front-End API" external service. See docs/CLAUDE.md §3–4.
// =============================================================================
import { randomBytes } from 'crypto';
import { setMoodleUserId, type AppUser } from '@/lib/users';

const BASE_URL = process.env.MOODLE_BASE_URL;
const WS_TOKEN = process.env.MOODLE_WS_TOKEN;

/** True when the Moodle env vars are configured (same pattern as authEnabled). */
export const moodleEnabled = Boolean(BASE_URL && WS_TOKEN);

// ---------------------------------------------------------------------------
// Low-level call
// ---------------------------------------------------------------------------

/**
 * Moodle REST encodes nested structures with bracket notation:
 *   users[0][email]=x&users[0][firstname]=y
 * Flatten any JSON-ish params object into those pairs.
 */
function flattenParams(value: unknown, prefix: string, out: URLSearchParams): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flattenParams(v, `${prefix}[${i}]`, out));
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flattenParams(v, prefix ? `${prefix}[${k}]` : k, out);
    }
  } else {
    out.append(prefix, String(value));
  }
}

export class MoodleApiError extends Error {
  constructor(
    public wsfunction: string,
    public errorcode: string,
    message: string,
  ) {
    super(`Moodle ${wsfunction} failed [${errorcode}]: ${message}`);
    this.name = 'MoodleApiError';
  }
}

/**
 * Per-attempt timeout. The first course-contents request after a Moodle cache
 * purge (every content-load operation ends with one) rebuilds course caches
 * and can run several seconds; anything past this is treated as a transient
 * failure and retried rather than hanging the Vercel function.
 */
const ATTEMPT_TIMEOUT_MS = 7000;
const RETRY_DELAY_MS = 300;

/**
 * Only pure reads are retried. A write whose *response* was lost may have
 * been applied server-side — retrying user-create or enrol could double-apply
 * or surface a duplicate error, so those keep single-shot semantics.
 */
function isRetryable(wsfunction: string): boolean {
  // The SSO call is also safe: each call mints a fresh one-time key, and a
  // key whose response was lost is simply never used.
  return wsfunction.includes('_get_') || wsfunction === 'auth_userkey_request_login_url';
}

export async function moodleCall<T>(
  wsfunction: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  if (!moodleEnabled) {
    throw new Error('Moodle is not configured (MOODLE_BASE_URL / MOODLE_WS_TOKEN missing)');
  }
  const body = new URLSearchParams({
    wstoken: WS_TOKEN!,
    wsfunction,
    moodlewsrestformat: 'json',
  });
  flattenParams(params, '', body);

  const attempts = isRetryable(wsfunction) ? 2 : 1;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
    try {
      const res = await fetch(`${BASE_URL}/webservice/rest/server.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        cache: 'no-store',
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
      if (!res.ok) {
        // 5xx is transient (proxy hiccup, Moodle restarting) — retryable.
        // 4xx is deterministic and retrying would just repeat it.
        const err = new MoodleApiError(wsfunction, `http_${res.status}`, res.statusText);
        if (res.status >= 500) {
          lastError = err;
          continue;
        }
        throw err;
      }
      const data = await res.json();
      // Moodle returns HTTP 200 with an exception payload on failure —
      // an application-level error, deterministic, never retried.
      if (data && typeof data === 'object' && 'exception' in data) {
        throw new MoodleApiError(wsfunction, data.errorcode ?? 'unknown', data.message ?? 'unknown');
      }
      return data as T;
    } catch (e) {
      if (e instanceof MoodleApiError) throw e;
      // Network failure or attempt timeout — transient, retry if allowed.
      lastError = e;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Courses & contents
// ---------------------------------------------------------------------------

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  categoryid: number;
  summary: string;
  visible: number;
  format: string; // e.g. 'topics', 'singleactivity'
}

export interface MoodleModule {
  id: number;          // course-module id (cmid)
  name: string;
  modname: string;     // 'scorm' | 'quiz' | 'page' | 'videotime' | ...
  instance: number;    // module-type-specific instance id (e.g. scorm.id)
  url?: string;        // view URL, e.g. .../mod/scorm/view.php?id=1
  visible: number;
  completion: number;  // 0 none, 1 manual, 2 automatic
  completiondata?: {
    state: number;     // 0 incomplete, 1 complete, 2 complete-pass, 3 complete-fail
    timecompleted: number;
  };
}

export interface MoodleSection {
  id: number;
  name: string;
  section: number;
  summary: string;
  visible: number;
  modules: MoodleModule[];
}

export async function getCourses(): Promise<MoodleCourse[]> {
  return moodleCall<MoodleCourse[]>('core_course_get_courses');
}

/** Full section/module outline of one course — drives the player sidebar. */
export async function getCourseContents(courseId: number): Promise<MoodleSection[]> {
  return moodleCall<MoodleSection[]>('core_course_get_contents', { courseid: courseId });
}

/**
 * Best in-iframe URL for an activity. SCORM packages open through the
 * chrome-free popup player (no Moodle navbar inside our course player);
 * other module types fall back to their regular view URL.
 */
export function getActivityEmbedUrl(module: Pick<MoodleModule, 'modname' | 'instance' | 'url'>): string | null {
  if (module.modname === 'scorm') {
    return `${BASE_URL}/mod/scorm/player.php?a=${module.instance}&display=popup&mode=normal&scoid=0`;
  }
  return module.url ?? null;
}

// ---------------------------------------------------------------------------
// Users — lookup, creation, mirroring
// ---------------------------------------------------------------------------

export interface MoodleUser {
  id: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
}

export async function getMoodleUserByEmail(email: string): Promise<MoodleUser | null> {
  const users = await moodleCall<MoodleUser[]>('core_user_get_users_by_field', {
    field: 'email',
    values: [email.toLowerCase()],
  });
  return users[0] ?? null;
}

/**
 * Random password satisfying Moodle's default policy (8+ chars, upper, lower,
 * digit, non-alphanumeric). Never stored or shown — mirrored users sign in
 * through the site (Cognito), and reach Moodle via auth_userkey SSO.
 */
function randomMoodlePassword(): string {
  return `Aa1!${randomBytes(18).toString('base64')}`;
}

export async function createMoodleUser(input: {
  email: string;
  firstname: string;
  lastname: string;
}): Promise<number> {
  const created = await moodleCall<Array<{ id: number; username: string }>>(
    'core_user_create_users',
    {
      users: [
        {
          username: input.email.toLowerCase(),
          email: input.email.toLowerCase(),
          firstname: input.firstname,
          lastname: input.lastname,
          password: randomMoodlePassword(),
          auth: 'manual',
        },
      ],
    },
  );
  return created[0].id;
}

/**
 * Ensure the signed-in site user has a Moodle account; returns its Moodle
 * user id. Mirrors lazily (first course access), adopts a pre-existing
 * Moodle account with the same email, and persists the id in Neon users.
 */
export async function ensureMoodleUser(user: AppUser): Promise<number> {
  if (user.moodle_user_id) return user.moodle_user_id;

  const existing = await getMoodleUserByEmail(user.email);
  const moodleId = existing
    ? existing.id
    : await createMoodleUser({
        email: user.email,
        firstname: user.given_name ?? 'Learner',
        lastname: user.family_name ?? '',
      });

  await setMoodleUserId(user.id, moodleId);
  return moodleId;
}

// ---------------------------------------------------------------------------
// Enrolment & completion
// ---------------------------------------------------------------------------

const STUDENT_ROLE_ID = 5; // Moodle default "student" role

export async function enrolUser(courseId: number, moodleUserId: number): Promise<void> {
  await moodleCall('enrol_manual_enrol_users', {
    enrolments: [{ roleid: STUDENT_ROLE_ID, userid: moodleUserId, courseid: courseId }],
  });
}

export interface ActivityCompletion {
  cmid: number;
  modname: string;
  state: number; // 0 incomplete, 1 complete, 2 complete-pass, 3 complete-fail
  timecompleted: number;
}

export async function getActivitiesCompletion(
  courseId: number,
  moodleUserId: number,
): Promise<ActivityCompletion[]> {
  const res = await moodleCall<{ statuses: ActivityCompletion[] }>(
    'core_completion_get_activities_completion_status',
    { courseid: courseId, userid: moodleUserId },
  );
  return res.statuses;
}

// ---------------------------------------------------------------------------
// auth_userkey SSO (requires the auth_userkey plugin on the Moodle server)
// ---------------------------------------------------------------------------

/**
 * One-time login URL that establishes a Moodle session for the user, then
 * redirects to wantsUrl (e.g. the SCORM player). Feed it to the course-player
 * iframe src so the embed never shows a Moodle login page.
 */
export async function getUserKeyLoginUrl(email: string, wantsUrl?: string): Promise<string> {
  const res = await moodleCall<{ loginurl: string }>('auth_userkey_request_login_url', {
    user: { email: email.toLowerCase() },
  });
  return wantsUrl
    ? `${res.loginurl}&wantsurl=${encodeURIComponent(wantsUrl)}`
    : res.loginurl;
}

// ---------------------------------------------------------------------------
// Grades (My Learning page) — needs `gradereport_user_get_grade_items` granted
// to the fgi_frontend service (scripts/moodle/grantws.php). Callers treat a
// failure as "no grade yet" so the page never depends on the grant.
// ---------------------------------------------------------------------------

export interface MoodleGradeItem {
  id: number;
  itemname: string | null;
  itemtype: string;        // 'mod' | 'course' | ...
  itemmodule: string | null;
  iteminstance: number | null;
  cmid: number | null;
  graderaw: number | null;
  grademin: number;
  grademax: number;
  percentageformatted: string; // e.g. "80.00 %" or "-"
  gradedategraded: number | null;
}

/** Every grade item (quiz, course total, …) for one learner in one course. */
export async function getUserGradeItems(
  courseId: number,
  moodleUserId: number,
): Promise<MoodleGradeItem[]> {
  const res = await moodleCall<{ usergrades: Array<{ gradeitems: MoodleGradeItem[] }> }>(
    'gradereport_user_get_grade_items',
    { courseid: courseId, userid: moodleUserId },
  );
  return res.usergrades?.[0]?.gradeitems ?? [];
}
