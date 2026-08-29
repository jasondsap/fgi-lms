// =============================================================================
// GET /api/account/transcript — the signed-in learner's completed courses as
// CSV (the fields a NAADAC CE audit asks for). User id comes from the session
// only; there is no way to request another learner's transcript.
// =============================================================================
import { getSession } from '@/auth';
import { getUserProgress, transcriptCsv } from '@/lib/progress';
import { getUserById } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return new Response('Not signed in', { status: 401 });

  const [user, rows] = await Promise.all([getUserById(userId), getUserProgress(userId)]);
  if (!user) return new Response('Not signed in', { status: 401 });

  const name = [user.given_name, user.family_name].filter(Boolean).join(' ') || user.email;
  const csv = transcriptCsv({ name, email: user.email }, rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fgi-ce-transcript-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
