// GET /api/resources/[slug] — single resource detail.
//
// Content gate (8-20-26 auth rebuild, phase 4): the resource PAGE is walled
// for signed-out visitors, so this route must not hand the same content out
// the side door. Signed out it returns only the card-level teaser — the full
// row with presigned URLs and materials requires a session. No-op while auth
// is unconfigured (authEnabled), matching ResourceDetail.
import { NextRequest, NextResponse } from 'next/server';
import { authEnabled, getSession } from '@/auth';
import { getResourceBySlug, getResourceTeaser } from '@/lib/resources';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    if (authEnabled && !(await getSession())?.user) {
      const teaser = await getResourceTeaser(params.slug);
      if (!teaser) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ ...teaser, gated: true });
    }

    const resource = await getResourceBySlug(params.slug);
    if (!resource) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(resource);
  } catch (err) {
    console.error('[GET /api/resources/[slug]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
