// POST /api/acknowledgments — a course acknowledgment agreed in the player.
//
// Mirrors /api/evaluations' course-player path (8-30-26): signed-in,
// Moodle-mirrored learner only; the cmid must be the acknowledgment configured
// for that course (lib/acknowledgment-items.ts) — never an arbitrary activity,
// otherwise a crafted request could self-complete coursework; every statement
// must be agreed. Stores the agreement in Neon, then override-completes the
// Moodle activity so the certificate gate opens. The row is safe even if the
// Moodle mark fails (logged; returns completionMarked:false), and a repeat
// submission retries the mark without moving the original date.
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth';
import {
  getCourseAcknowledgment, isCompleteAgreement,
  markAcknowledgmentMirrored, saveAcknowledgment,
} from '@/lib/acknowledgment';
import { markActivityComplete, moodleEnabled } from '@/lib/moodle';
import { getCourseResource } from '@/lib/resources';
import { getUserById } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'We could not read that submission.' }, { status: 400 });
  }
  const slug = typeof raw?.slug === 'string' ? raw.slug.slice(0, 200) : '';
  const cmid = Number(raw?.moodle_cmid);
  const surface = typeof raw?.surface === 'string' ? raw.surface.slice(0, 40) : 'fgi';
  if (!slug || !Number.isInteger(cmid) || cmid <= 0) {
    return NextResponse.json({ error: 'Malformed submission.' }, { status: 400 });
  }

  try {
    const session = await getSession();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    if (!userId) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

    const user = await getUserById(userId);
    const resource = await getCourseResource(slug);
    if (!user?.moodle_user_id || !resource?.moodle_course_id || !moodleEnabled) {
      return NextResponse.json({ error: 'This acknowledgment is unavailable right now.' }, { status: 400 });
    }
    const ack = getCourseAcknowledgment(resource.moodle_course_id);
    if (!ack || ack.cmid !== cmid) {
      return NextResponse.json({ error: 'Not this course’s acknowledgment.' }, { status: 400 });
    }
    if (!isCompleteAgreement(ack, raw?.agreed)) {
      return NextResponse.json({ error: 'All statements must be agreed to continue.' }, { status: 400 });
    }

    await saveAcknowledgment({
      userId, resourceId: resource.id, surface, moodleCourseId: resource.moodle_course_id, ack,
    });

    // Best-effort mirror: the agreement is safe in Neon either way.
    let completionMarked = true;
    try {
      await markActivityComplete(cmid, user.moodle_user_id);
      await markAcknowledgmentMirrored(userId, cmid);
    } catch (e) {
      completionMarked = false;
      console.error(`Acknowledgment completion mark failed (cmid ${cmid}, user ${user.moodle_user_id}):`, e);
    }

    return NextResponse.json({ ok: true, completionMarked }, { status: 201 });
  } catch (error) {
    console.error('Acknowledgment save failed:', error);
    return NextResponse.json(
      { error: 'Your acknowledgment could not be saved. Please try again.' },
      { status: 500 },
    );
  }
}
