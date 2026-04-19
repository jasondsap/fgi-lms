// GET /api/admin/resources — full list including unpublished (admin only)
// POST /api/admin/resources — create a new resource
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const rows = await sql`
      SELECT * FROM resources ORDER BY created_at DESC
    `;
    return NextResponse.json({ resources: rows });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/admin/resources]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const {
      title, slug, type, description, duration_minutes,
      thumbnail_url, s3_key, vimeo_id, external_url,
      is_naadac_ce = false, audience_tags = [], topic_tags = [],
    } = body;

    if (!title || !slug || !type) {
      return NextResponse.json({ error: 'title, slug, and type are required' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO resources (
        title, slug, type, description, duration_minutes,
        thumbnail_url, s3_key, vimeo_id, external_url,
        is_naadac_ce, audience_tags, topic_tags
      ) VALUES (
        ${title}, ${slug}, ${type}, ${description || ''}, ${duration_minutes || null},
        ${thumbnail_url || null}, ${s3_key || null}, ${vimeo_id || null}, ${external_url || null},
        ${is_naadac_ce}, ${audience_tags}, ${topic_tags}
      )
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/admin/resources]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
