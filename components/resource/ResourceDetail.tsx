import { notFound } from 'next/navigation';
import { authEnabled, getSession } from '@/auth';
import CourseDetail from '@/components/resource/CourseDetail';
import PdfDetail from '@/components/resource/PdfDetail';
import PodcastDetail from '@/components/resource/PodcastDetail';
import ResourceGate from '@/components/resource/ResourceGate';
import VideoDetail from '@/components/resource/VideoDetail';
import WebinarDetail from '@/components/resource/WebinarDetail';
import BookmarkButton from '@/components/account/BookmarkButton';
import { isBookmarked, logResourceEvent } from '@/lib/progress';
import { canSeeInternal, getViewer } from '@/lib/viewer';
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
  const session = authEnabled ? await getSession() : null;
  if (authEnabled && !session?.user) {
    const teaser = await getResourceTeaser(slug);
    if (!teaser) notFound();
    return <ResourceGate resource={teaser} surface={surface} />;
  }

  // Query the DB directly — a server component must never fetch its own API
  // route at runtime (see docs/CLAUDE.md architecture notes).
  const resource = await getResourceBySlug(slug);
  if (!resource) notFound();
  // Internal rows (8-29-26): admins and the tenant's own admins only.
  if (resource.internal && !canSeeInternal(await getViewer(), surface.key)) notFound();

  // My Learning (8-29-26): record the view and find out whether the learner
  // has saved this resource. Both are one cheap query; logging never throws.
  const userId = session?.user?.id;
  let saved = false;
  if (userId) {
    [saved] = await Promise.all([
      isBookmarked(userId, resource.id),
      logResourceEvent(userId, resource.id, 'view', surface.key),
    ]);
  }

  let shell: React.ReactNode;
  switch (resource.type) {
    case 'webinar':
      shell = <WebinarDetail resource={resource} surface={surface} />;
      break;
    case 'podcast':
      shell = <PodcastDetail resource={resource} surface={surface} />;
      break;
    case 'course':
    case 'naadac_ce':
      shell = <CourseDetail resource={resource} surface={surface} />;
      break;
    case 'video':
      shell = <VideoDetail resource={resource} surface={surface} />;
      break;
    default:
      shell = <PdfDetail resource={resource} surface={surface} />;
  }

  return (
    <>
      {shell}
      {userId && (
        <BookmarkButton
          resourceId={resource.id}
          initialSaved={saved}
          accent={surface.primary}
          accountHref={`${surface.basePath}/account`}
        />
      )}
    </>
  );
}
