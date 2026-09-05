import { notFound } from 'next/navigation';
import CourseView, { parseCm } from '@/components/course/CourseView';
import { TenantShellFooter } from '@/components/layout/ShellFooter';
import { requireSignIn } from '@/lib/lockdown';
import { tenantSurface } from '@/lib/surface';

// Every request must re-check the learner's Moodle completion state
export const dynamic = 'force-dynamic';

export default async function TenantCoursePage(
  { params, searchParams }: {
    params: { tenant: string; slug: string };
    searchParams?: { cm?: string | string[] };
  },
) {
  const surface = tenantSurface(params.tenant);
  if (!surface) notFound();
  await requireSignIn(surface.basePath, `${surface.basePath}/course/${params.slug}`);
  return (
    <>
      <CourseView slug={params.slug} surface={surface} openCmid={parseCm(searchParams?.cm)} />
      <TenantShellFooter tenant={surface.tenant!} />
    </>
  );
}
