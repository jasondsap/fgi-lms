// =============================================================================
// GET /api/cron/portal-reports — daily job for scheduled Portal Admin reports
// (phase 3, 9-19-26). Fired by Vercel Cron (vercel.json, 12:00 UTC), which
// sends `Authorization: Bearer $CRON_SECRET` when that env var is set on the
// project. Without the secret configured the route refuses to run at all —
// it emails learner data, so it must never be an open URL.
// =============================================================================
import { NextRequest } from 'next/server';
import { runDueReports } from '@/lib/portal-reports';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('CRON_SECRET is not configured', { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Not found', { status: 404 });
  }
  const tally = await runDueReports(new Date());
  console.log('[portal-reports] daily run', JSON.stringify(tally));
  return Response.json(tally);
}
