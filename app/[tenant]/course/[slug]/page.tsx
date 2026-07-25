import { notFound } from 'next/navigation';
import CourseView from '@/components/course/CourseView';
import { tenantSurface } from '@/lib/surface';

// Every request must re-check the learner's Moodle completion state
export const dynamic = 'force-dynamic';

export default function TenantCoursePage(
  { params }: { params: { tenant: string; slug: string } },
) {
  const surface = tenantSurface(params.tenant);
  if (!surface) notFound();
  return <CourseView slug={params.slug} surface={surface} />;
}
