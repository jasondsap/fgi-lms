// =============================================================================
// GET /api/cron/weekly-additions — Monday staff notice of everything added to
// the library in the past week (Jennifer, burn-down 9-28 row 23). Fired by
// Vercel Cron (vercel.json, Mondays 13:00 UTC = 9 AM Eastern) with
// `Authorization: Bearer $CRON_SECRET`; refuses to run without the secret.
// Sends nothing when the week was quiet. `?days=N` widens the window for a
// manual re-run.
// =============================================================================
import { NextRequest } from 'next/server';
import { sendWeeklyDigest } from '@/lib/weekly-digest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('CRON_SECRET is not configured', { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Not found', { status: 404 });
  }
  const days = Math.min(90, Math.max(1, parseInt(request.nextUrl.searchParams.get('days') ?? '7', 10) || 7));
  const tally = await sendWeeklyDigest(days);
  console.log('[weekly-additions] run', JSON.stringify({ days, ...tally }));
  return Response.json({ days, ...tally });
}
