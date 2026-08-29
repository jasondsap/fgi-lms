import CourseView, { parseCm } from '@/components/course/CourseView';
import { FGI_SURFACE } from '@/lib/surface';

// Every request must re-check the learner's Moodle completion state
export const dynamic = 'force-dynamic';

export default function CoursePlayerPage(
  { params, searchParams }: {
    params: { slug: string };
    searchParams?: { cm?: string | string[] };
  },
) {
  return (
    <CourseView slug={params.slug} surface={FGI_SURFACE} openCmid={parseCm(searchParams?.cm)} />
  );
}
