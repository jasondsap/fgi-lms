import CourseView, { parseCm } from '@/components/course/CourseView';
import { requireSignIn } from '@/lib/lockdown';
import { FGI_SURFACE } from '@/lib/surface';

// Every request must re-check the learner's Moodle completion state
export const dynamic = 'force-dynamic';

export default async function CoursePlayerPage(
  { params, searchParams }: {
    params: { slug: string };
    searchParams?: { cm?: string | string[] };
  },
) {
  await requireSignIn('/');
  return (
    <CourseView slug={params.slug} surface={FGI_SURFACE} openCmid={parseCm(searchParams?.cm)} />
  );
}
