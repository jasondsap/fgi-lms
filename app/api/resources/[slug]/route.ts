// GET /api/resources/[slug] — single resource detail
import { NextRequest, NextResponse } from 'next/server';
import { getResourceBySlug } from '@/lib/resources';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
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
