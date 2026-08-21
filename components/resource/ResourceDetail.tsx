import { notFound } from 'next/navigation';
import { authEnabled, getSession } from '@/auth';
import CourseDetail from '@/components/resource/CourseDetail';
import PdfDetail from '@/components/resource/PdfDetail';
import PodcastDetail from '@/components/resource/PodcastDetail';
import ResourceGate from '@/components/resource/ResourceGate';
import VideoDetail from '@/components/resource/VideoDetail';
import WebinarDetail from '@/components/resource/WebinarDetail';
import { getResourceBySlug, getResourceTeaser } from '@/lib/resources';
import type { Surface } from '@/lib/surface';

/**
 * Resource detail page body, shared by the FGI site and both tenant portals —
 * a pure dispatcher since 8-19, when the video shell retired the last user of
 * the old generic template. All in-surface links go through `surface.basePath`
 * so a tenant learner stays in tenant chrome all the way to the course player.
 *
 * Routing by type:
 *  - webinar            → WebinarDetail (8-11-26 shell; launcher for Moodle)
 *  - podcast            → PodcastDetail (Recovery Ecosystem Radio shell)
 *  - course / naadac_ce → CourseDetail  (8-11-26 course shell)
 *  - video              → VideoDetail   (webinar shell + inline player)
 *  - everything else    → PdfDetail     (8-11-26 document shell; also serves
 *    unhosted publications, which are citation + abstract + DOI link)
 */
export default async function ResourceDetail(
  { slug, surface }: { slug: string; surface: Surface },
) {
  // Content gate (8-20-26 auth rebuild, phase 4): browsing the library is
  // free, opening a resource requires an account. Signed out, only the
  // card-level teaser is fetched — the full row (and its presigned URLs) is
  // never touched. No-op while auth is unconfigured (authEnabled flag).
  if (authEnabled && !(await getSession())?.user) {
    const teaser = await getResourceTeaser(slug);
    if (!teaser) notFound();
    return <ResourceGate resource={teaser} surface={surface} />;
  }

  // Query the DB directly — a server component must never fetch its own API
  // route at runtime (see docs/CLAUDE.md architecture notes).
  const resource = await getResourceBySlug(slug);
  if (!resource) notFound();

  switch (resource.type) {
    case 'webinar':
      return <WebinarDetail resource={resource} surface={surface} />;
    case 'podcast':
      return <PodcastDetail resource={resource} surface={surface} />;
    case 'course':
    case 'naadac_ce':
      return <CourseDetail resource={resource} surface={surface} />;
    case 'video':
      return <VideoDetail resource={resource} surface={surface} />;
    default:
      return <PdfDetail resource={resource} surface={surface} />;
  }
}
