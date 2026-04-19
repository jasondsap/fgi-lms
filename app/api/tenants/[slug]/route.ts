// GET /api/tenants/[slug] — tenant config for portal theming
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const rows = await sql`
      SELECT id, slug, name, logo_url, brand_color
      FROM tenants
      WHERE slug = ${params.slug} AND is_active = TRUE
      LIMIT 1
    `;
    if (!rows[0]) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/tenants/[slug]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
