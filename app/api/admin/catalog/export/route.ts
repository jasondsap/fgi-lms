// =============================================================================
// GET /api/admin/catalog/export?format=xlsx|csv
// Every LRC item with its ID, filters, tags, and portal visibility (Jennifer,
// 10-12-26). Session role must be admin. CSV is the Catalog sheet only.
// =============================================================================
import { NextRequest } from 'next/server';
import { getCatalogTables } from '@/lib/catalog-export';
import { tableToCsv, tablesToXlsx } from '@/lib/portal-admin-export';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') return new Response('Not found', { status: 404 });

  const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
  const tables = await getCatalogTables();
  const base = `fgi-lrc-catalog-${new Date().toISOString().slice(0, 10)}`;

  if (format === 'csv') {
    return new Response(tableToCsv(tables[0]), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${base}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  const buf = await tablesToXlsx(tables, 'FGI Learning Resource Center — Catalog');
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${base}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
