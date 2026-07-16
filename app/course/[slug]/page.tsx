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
import CoursePlayer, { type PlayerModule, type PlayerSection } from '@/components/course/CoursePlayer';

// Every request must re-check the learner's Moodle completion state
export const dynamic = 'force-dynamic';

export default async function CoursePlayerPage({ params }: { params: { slug: string } }) {
  const resource = await getCourseResource(params.slug);
  if (!resource || !resource.moodle_course_id) notFound();

  // Course pages require login; bounce to the resource page, which carries
  // the sign-in gate. Also used while auth/Moodle env is unconfigured.
  if (!authEnabled || !moodleEnabled) redirect(`/resource/${params.slug}`);
  const session = await getSession();
  if (!session?.user?.id) redirect(`/resource/${params.slug}`);
  const user = await getUserById(session.user.id);
  if (!user) redirect(`/resource/${params.slug}`);

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
      const name = s.name?.trim() ?? '';
      return {
        id: s.id,
        name: /^\d*$/.test(name) ? '' : name,
        modules: s.modules
          .filter((m) => m.visible && m.url)
          .map(
            (m): PlayerModule => ({
              cmid: m.id,
              name: m.name,
              modname: m.modname,
              url: getActivityEmbedUrl(m) ?? m.url!,
              // 0 incomplete, 1 complete, 2 complete-pass, 3 complete-fail
              state: completionByCmid.get(m.id) ?? 0,
            }),
          ),
      };
    })
    .filter((s) => s.modules.length > 0);

  const firstModule = playerSections[0]?.modules[0];
  if (!firstModule) notFound();

  // One-time SSO URL establishes the Moodle session inside the iframe and
  // lands on the first activity; later module clicks reuse that session.
  const initialSrc = await getUserKeyLoginUrl(user.email, firstModule.url);

  return (
    <CoursePlayer
      title={resource.title}
      slug={resource.slug}
      sections={playerSections}
      initialSrc={initialSrc}
      initialCmid={firstModule.cmid}
    />
  );
}
