import { notFound, redirect } from 'next/navigation';
import { authEnabled, getSession } from '@/auth';
import { getUserById } from '@/lib/users';
import { getCourseResource } from '@/lib/resources';
import {
  moodleEnabled,
  ensureMoodleUser,
  enrolUser,
  getCourseContents,
  getActivitiesCompletion,
  getActivityEmbedUrl,
  getUserKeyLoginUrl,
} from '@/lib/moodle';
import CoursePlayer, {
  type PlayerModule,
  type PlayerGroup,
  type PlayerSection,
} from '@/components/course/CoursePlayer';
import type { Surface } from '@/lib/surface';

/**
 * Moodle's web services return activity and section names HTML-escaped
 * ("Policies &amp; Procedures"), and we render them as text — so they have to
 * be decoded or the entity shows through literally. Server-side, so no DOM
 * parser is available.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Activities that carry the teaching — each one opens a new sidebar group. */
const LESSON_MODNAMES = new Set(['scorm', 'page', 'videotime', 'lesson', 'book']);
/** Assessment — pulled out of the flow into its own trailing group. */
const EVALUATION_MODNAMES = new Set(['quiz', 'assign', 'feedback', 'questionnaire']);

/**
 * Turn Moodle's flat module list into lesson groups.
 *
 * Every course we build puts its modules in section 0 (see docs/CLAUDE.md §6q),
 * so Moodle sections give us no structure to work with — the grouping has to
 * come from module order and type. `build-course2.js` emits each lesson
 * followed by its own handouts, which is exactly the shape this relies on.
 */
function groupModules(modules: PlayerModule[]): PlayerGroup[] {
  const groups: PlayerGroup[] = [];
  const evaluation: PlayerModule[] = [];
  let current: PlayerGroup | null = null;

  for (const m of modules) {
    if (EVALUATION_MODNAMES.has(m.modname)) {
      evaluation.push(m);
      continue;
    }
    if (LESSON_MODNAMES.has(m.modname)) {
      current = { key: `lesson-${m.cmid}`, kind: 'lesson', lead: m, label: null, items: [] };
      groups.push(current);
      continue;
    }
    // A handout with no lesson above it to hang from — give it a group of its
    // own rather than dropping it off the sidebar.
    if (!current) {
      current = { key: `resources-${m.cmid}`, kind: 'resources', lead: null, label: 'Resources', items: [] };
      groups.push(current);
    }
    current.items.push(m);
  }

  if (evaluation.length) {
    groups.push({ key: 'evaluation', kind: 'evaluation', lead: null, label: 'Evaluation', items: evaluation });
  }
  return groups;
}

/**
 * Course player body, shared by the FGI site and both tenant portals.
 * Bounces back to the resource page *on the same surface* so a tenant learner
 * never gets dropped into FGI chrome.
 */
export default async function CourseView(
  { slug, surface }: { slug: string; surface: Surface },
) {
  const resource = await getCourseResource(slug);
  if (!resource || !resource.moodle_course_id) notFound();

  // Course pages require login; bounce to the resource page, which carries
  // the sign-in gate. Also used while auth/Moodle env is unconfigured.
  if (!authEnabled || !moodleEnabled) redirect(`${surface.basePath}/resource/${slug}`);
  const session = await getSession();
  if (!session?.user?.id) redirect(`${surface.basePath}/resource/${slug}`);
  const user = await getUserById(session.user.id);
  if (!user) redirect(`${surface.basePath}/resource/${slug}`);

  const courseId = resource.moodle_course_id;

  // Mirror into Moodle on first course access, then make sure they're enrolled
  const moodleUserId = await ensureMoodleUser(user);
  try {
    await enrolUser(courseId, moodleUserId);
  } catch (e) {
    // Enrolment is best-effort here — an already-enrolled user must not
    // block the player from loading.
    console.error('Moodle enrol error:', e);
  }

  const [sections, completion] = await Promise.all([
    getCourseContents(courseId),
    getActivitiesCompletion(courseId, moodleUserId).catch(() => []),
  ]);

  const completionByCmid = new Map(completion.map((c) => [c.cmid, c.state]));

  const playerSections: PlayerSection[] = sections
    .filter((s) => s.visible)
    .map((s) => {
      // Moodle default section names are blank or bare numbers — hide those
      const name = decodeEntities(s.name?.trim() ?? '');
      const modules = s.modules
        // Moodle auto-creates an Announcements forum in every course. It is
        // site scaffolding, not coursework — without this the player opens on
        // an empty forum instead of the first lesson.
        .filter((m) => m.visible && m.url && m.modname !== 'forum')
        .map(
          (m): PlayerModule => ({
            cmid: m.id,
            name: decodeEntities(m.name),
            modname: m.modname,
            url: getActivityEmbedUrl(m) ?? m.url!,
            // 0 incomplete, 1 complete, 2 complete-pass, 3 complete-fail
            state: completionByCmid.get(m.id) ?? 0,
          }),
        );
      return {
        id: s.id,
        name: /^\d*$/.test(name) ? '' : name,
        groups: groupModules(modules),
      };
    })
    .filter((s) => s.groups.length > 0);

  // Open on the first lesson in course order. The evaluation group is moved to
  // the end of its section, so this can never land on the quiz.
  const firstGroup = playerSections[0]?.groups[0];
  const firstModule = firstGroup ? (firstGroup.lead ?? firstGroup.items[0]) : undefined;
  if (!firstModule) notFound();

  // One-time SSO URL establishes the Moodle session inside the iframe and
  // lands on the first activity; later module clicks reuse that session.
  const initialSrc = await getUserKeyLoginUrl(user.email, firstModule.url);

  return (
    <CoursePlayer
      title={resource.title}
      slug={resource.slug}
      basePath={surface.basePath}
      sections={playerSections}
      initialSrc={initialSrc}
      initialCmid={firstModule.cmid}
    />
  );
}
