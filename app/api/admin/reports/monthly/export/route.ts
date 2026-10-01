// =============================================================================
// GET /api/admin/reports/monthly/export?month=YYYY-MM&format=xlsx|csv
// The monthly report (Jennifer, 10-1-26) as a multi-sheet workbook or one
// stacked CSV. Session role must be admin — same gate as the page.
// =============================================================================
import { NextRequest } from 'next/server';
import { getMonthlyReport, parseMonth } from '@/lib/monthly-report';
import { monthlyReportCsv, monthlyReportTables } from '@/lib/monthly-report-export';
import { tablesToXlsx } from '@/lib/portal-admin-export';
import { getViewer } from '@/lib/viewer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.role !== 'admin') return new Response('Not found', { status: 404 });

  const p = request.nextUrl.searchParams;
  const month = parseMonth(p.get('month') ?? undefined);
  const format = p.get('format') === 'csv' ? 'csv' : 'xlsx';

  const report = await getMonthlyReport(month);
  const tables = monthlyReportTables(report);
  const base = `fgi-monthly-report-${month.key}`;

  if (format === 'csv') {
    return new Response(monthlyReportCsv(tables), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${base}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  const buf = await tablesToXlsx(tables, `FGI Learning Resource Center — ${month.label}`);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${base}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
