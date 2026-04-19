// PUT /api/admin/resources/[id] — update resource
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const {
      title, slug, type, description, duration_minutes,
      thumbnail_url, s3_key, vimeo_id, external_url,
      is_naadac_ce, audience_tags, topic_tags, published,
    } = body;

    const rows = await sql`
      UPDATE resources SET
        title            = COALESCE(${title},            title),
        slug             = COALESCE(${slug},             slug),
        type             = COALESCE(${type},             type),
        description      = COALESCE(${description},      description),
        duration_minutes = COALESCE(${duration_minutes}, duration_minutes),
        thumbnail_url    = COALESCE(${thumbnail_url},    thumbnail_url),
        s3_key           = COALESCE(${s3_key},           s3_key),
        vimeo_id         = COALESCE(${vimeo_id},         vimeo_id),
        external_url     = COALESCE(${external_url},     external_url),
        is_naadac_ce     = COALESCE(${is_naadac_ce},     is_naadac_ce),
        audience_tags    = COALESCE(${audience_tags},    audience_tags),
        topic_tags       = COALESCE(${topic_tags},       topic_tags),
        published        = COALESCE(${published},        published)
      WHERE id = ${params.id}
      RETURNING *
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[PUT /api/admin/resources/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
