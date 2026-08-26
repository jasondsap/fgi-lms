// GET /api/resources — public filtered resource list
import { NextRequest, NextResponse } from 'next/server';
import { getPublicResources } from '@/lib/resources';
import { getTenantConfig } from '@/lib/tenants';
import type { ResourceListParams } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const params: ResourceListParams = {
      duration: (searchParams.get('duration') as any) || undefined,
      search:   searchParams.get('search')            || undefined,
      tenant:   searchParams.get('tenant')            || undefined,
      match:    (searchParams.get('match')    as any) || 'any',
      page:     parseInt(searchParams.get('page')     || '1',  10),
      per_page: parseInt(searchParams.get('per_page') || '12', 10),
    };

    // type, audience and topic can be multi-value:
    //   ?type=toolkit&type=webinar&audience=house_owner&audience=clinical
    // getAll is required — get() silently returns only the first value.
    const type     = searchParams.getAll('type');
    const audience = searchParams.getAll('audience');
    const topic    = searchParams.getAll('topic');
    if (type.length)     params.type     = type     as any;
    if (audience.length) params.audience = audience as any;
    if (topic.length)    params.topic    = topic    as any;

    // A tenant's curated collection (?collection=post-certification&tenant=scarr)
    // resolves to its slug list from the tenant config — the list itself never
    // comes from the request.
    const collection = searchParams.get('collection');
    if (collection && params.tenant) {
      const slugs = getTenantConfig(params.tenant)?.v3?.collections?.[collection]?.slugs;
      if (slugs) params.slugs = slugs;
    }

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
