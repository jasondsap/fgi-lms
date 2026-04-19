// GET /api/resources — public filtered resource list
import { NextRequest, NextResponse } from 'next/server';
import { getPublicResources } from '@/lib/resources';
import type { ResourceListParams } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const params: ResourceListParams = {
      type:     (searchParams.get('type')     as any) || undefined,
      duration: (searchParams.get('duration') as any) || undefined,
      search:   searchParams.get('search')            || undefined,
      tenant:   searchParams.get('tenant')            || undefined,
      match:    (searchParams.get('match')    as any) || 'any',
      page:     parseInt(searchParams.get('page')     || '1',  10),
      per_page: parseInt(searchParams.get('per_page') || '12', 10),
    };

    // audience and topic can be multi-value: ?audience=house_owner&audience=clinical
    const audience = searchParams.getAll('audience');
    const topic    = searchParams.getAll('topic');
    if (audience.length) params.audience = audience as any;
    if (topic.length)    params.topic    = topic    as any;

    const result = await getPublicResources(params);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('[GET /api/resources]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
