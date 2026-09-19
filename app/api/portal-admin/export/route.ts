// =============================================================================
// GET /api/portal-admin/export?portal=<slug>&report=users|progress&format=csv|xlsx
//     …plus the same filter params the /<portal>/admin page uses, or &user=<id>.
// Portal Admin exports (Jennifer, 9-19-26). Same gate as the page
// (canAdminPortal): an FGI admin for any portal, a Portal Admin only for the
// portal they are bound to — asking for another portal's slug is a 404. The
// slug only scopes the queries AFTER that check. Never s3_key or anything
// presigned.
// =============================================================================
import { NextRequest } from 'next/server';
import { listPortalProgress, listPortalUsers, parseFilters } from '@/lib/portal-admin';
import { progressTable, tableToCsv, tableToXlsx, usersTable } from '@/lib/portal-admin-export';
import { getTenantConfig } from '@/lib/tenants';
import { canAdminPortal, getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/i;
const stamp = () => new Date().toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const tenant = getTenantConfig(p.get('portal') ?? '');
  const viewer = await getViewer();
  if (!tenant || !canAdminPortal(viewer, tenant.slug)) return new Response('Not found', { status: 404 });

  const params: Record<string, string[]> = {};
  p.forEach((v, k) => { (params[k] ??= []).push(v); });
  const filters = parseFilters(params);

  const report = p.get('report') === 'progress' ? 'progress' : 'users';
  // &user=<id> narrows either report to one person (the user detail page).
  // The queries still scope it to this portal, so a foreign id exports nothing.
  const onlyUser = UUID.test(p.get('user') ?? '') ? (p.get('user') as string) : undefined;
  const table = report === 'progress'
    ? progressTable(await listPortalProgress(tenant.slug, filters, 20000, onlyUser), tenant.name)
    : usersTable(await listPortalUsers(tenant.slug, filters, 5000, onlyUser));
  const base = `${tenant.slug}-${report}-${stamp()}`;

  if (p.get('format') === 'xlsx') {
    const body = await tableToXlsx(table, `${tenant.name} — ${table.sheet}`);
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${base}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  return new Response(tableToCsv(table), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${base}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
