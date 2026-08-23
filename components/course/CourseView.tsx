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
/** The completion certificate — its own group after the evaluation. */
const CERTIFICATE_MODNAMES = new Set(['customcert']);

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
  const certificates: PlayerModule[] = [];
  let current: PlayerGroup | null = null;

  for (const m of modules) {
    if (CERTIFICATE_MODNAMES.has(m.modname)) {
      certificates.push(m);
      continue;
    }
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
  if (certificates.length) {
    groups.push({ key: 'certificate', kind: 'certificate', lead: null, label: 'Certificate', items: certificates });
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

  // Everything from here talks to Moodle live. A transient failure (slow
  // cache rebuild after a purge, box restart, network blip) used to escape as
  // a bare server exception — the generic digest page. moodleCall now retries
  // reads once, and anything that still fails lands on a retry panel instead.
  let sections: Awaited<ReturnType<typeof getCourseContents>>;
  let completion: Awaited<ReturnType<typeof getActivitiesCompletion>>;
  let moodleUserId: number;
  try {
    // Mirror into Moodle on first course access, then make sure they're enrolled
    moodleUserId = await ensureMoodleUser(user);
    try {
      await enrolUser(courseId, moodleUserId);
    } catch (e) {
      // Enrolment is best-effort here — an already-enrolled user must not
      // block the player from loading.
      console.error('Moodle enrol error:', e);
    }

    [sections, completion] = await Promise.all([
      getCourseContents(courseId),
      getActivitiesCompletion(courseId, moodleUserId).catch(() => []),
    ]);
  } catch (e) {
    console.error(`Moodle course load failed (course ${courseId}, ${slug}):`, e);
    return <CourseLoadError href={`${surface.basePath}/course/${slug}`} />;
  }

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
            // 0 none, 1 manual, 2 automatic — untracked modules stay out of
            // the progress figure and the certificate gate.
            completion: m.completion ?? 0,
          }),
        );
      return {
        id: s.id,
        name: /^\d*$/.test(name) ? '' : name,
        groups: groupModules(modules),
      };
    })
    .filter((s) => s.groups.length > 0);

  // The certificate is availability-gated in Moodle on completing every
  // tracked activity; the contents fetch runs under the service token, so
  // that gate has to be mirrored here from the learner's own states.
  const everyModule = playerSections.flatMap((s) => s.groups).flatMap((g) => (g.lead ? [g.lead, ...g.items] : g.items));
  const gatesDone = everyModule
    .filter((m) => m.modname !== 'customcert' && m.completion > 0)
    .every((m) => m.state === 1 || m.state === 2);
  for (const m of everyModule) {
    if (m.modname === 'customcert') m.locked = !gatesDone;
  }

  // Open on the first lesson in course order. The evaluation group is moved to
  // the end of its section, so this can never land on the quiz.
  const firstGroup = playerSections[0]?.groups[0];
  const firstModule = firstGroup ? (firstGroup.lead ?? firstGroup.items[0]) : undefined;
  if (!firstModule) notFound();

  // One-time SSO URL establishes the Moodle session inside the iframe and
  // lands on the first activity; later module clicks reuse that session.
  let initialSrc: string;
  try {
    initialSrc = await getUserKeyLoginUrl(user.email, firstModule.url);
  } catch (e) {
    console.error(`Moodle SSO URL failed (course ${courseId}, ${slug}):`, e);
    return <CourseLoadError href={`${surface.basePath}/course/${slug}`} />;
  }

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

/**
 * Shown when the learning platform doesn't answer in time — a transient
 * condition, so the message asks for a retry instead of surfacing Next.js's
 * generic server-exception page. The link is a plain full reload on purpose:
 * the page is force-dynamic, so following it re-runs the whole fetch.
 */
function CourseLoadError({ href }: { href: string }) {
  return (
    <div style={{
      minHeight: '55vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '460px', textAlign: 'center', background: '#ffffff',
        border: '1px solid #dfe5ea', borderRadius: '12px', padding: '2.25rem 2rem',
        boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '0.6rem', color: '#16232c' }}>
          The course is taking longer than usual to load
        </h1>
        <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#4d616f', marginBottom: '1.4rem' }}>
          Our learning platform didn&rsquo;t respond in time. This is usually
          momentary &mdash; trying again almost always works.
        </p>
        <a
          href={href}
          style={{
            display: 'inline-block', background: 'var(--fgi-blue, #0e72a2)', color: '#ffffff',
            borderRadius: '999px', padding: '10px 28px', fontSize: '15px',
            fontWeight: 600, textDecoration: 'none',
          }}
        >
          Try again
        </a>
      </div>
    </div>
  );
}
