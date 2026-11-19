// GET /media/presenters/<file> — images uploaded from /admin/content
//
// Guest headshots and org logos used to be committed under public/images and
// only reached production on a git push. Ones uploaded through the admin page
// live in the private bucket under `media/`, and this route is their public
// face: it streams the object so `photo_url` can stay a plain site-relative
// path, exactly like the committed files.
//
// Only the `media/presenters/` prefix is reachable, and only image names this
// app generates — the rest of the bucket (PDFs, MP3s) stays behind presigned
// URLs as before.
import { NextRequest, NextResponse } from 'next/server';
import { MEDIA_URL } from '@/lib/admin-content-shared';
import { getObjectBytes } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest, { params }: { params: { key: string[] } },
) {
  const path = `/media/${params.key.join('/')}`;
  if (!MEDIA_URL.test(path)) return new NextResponse('Not found', { status: 404 });
  try {
    const object = await getObjectBytes(path.slice(1));
    if (!object) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(object.bytes as unknown as BodyInit, {
      headers: {
        'Content-Type': path.endsWith('.png') ? 'image/png' : 'image/webp',
        // Names carry a random id and are never rewritten, so cache hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error('[GET /media]', e);
    return new NextResponse('Error', { status: 500 });
  }
}
