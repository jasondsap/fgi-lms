// POST /api/evaluations — Learning Center evaluation submissions.
//
// Open to anonymous visitors on purpose: nothing on the site is behind a login
// yet, and a feedback form that demands an account collects nothing. When a
// session does exist the response is attributed to it, which is also what makes
// the eventual merge with Moodle's answers possible (users.moodle_user_id).
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth';
import { EvaluationError, parseSubmission, saveEvaluation } from '@/lib/evaluation';
import { getCourseContents, markActivityComplete, moodleEnabled } from '@/lib/moodle';
import { getCourseResource } from '@/lib/resources';
import { sql } from '@/lib/db';
import { getUserById } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let submission;
  let moodleCmid: number | null = null;
  try {
    const raw = await request.json();
    submission = parseSubmission(raw);
    const cm = Number(raw?.moodle_cmid);
    if (Number.isInteger(cm) && cm > 0) moodleCmid = cm;
  } catch (error) {
    const message = error instanceof EvaluationError
      ? error.message
      : 'We could not read that submission.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const session = await getSession();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    if (!moodleCmid) {
      await saveEvaluation(submission, userId);
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // Course-player path (8-30-26): the same survey replaces Moodle's
    // feedback UI. Requires a signed-in, Moodle-mirrored learner; the cmid
    // must be that course's evaluation activity (never a quiz — otherwise a
    // crafted request could self-complete coursework).
    if (!userId) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
    const user = await getUserById(userId);
    const resource = await getCourseResource(submission.slug);
    if (!user?.moodle_user_id || !resource?.moodle_course_id || !moodleEnabled) {
      return NextResponse.json({ error: 'This course evaluation is unavailable right now.' }, { status: 400 });
    }
    const sections = await getCourseContents(resource.moodle_course_id);
    const evalModule = sections
      .flatMap((s) => s.modules)
      .find((m) => m.id === moodleCmid && (m.modname === 'feedback' || m.modname === 'questionnaire'));
    if (!evalModule) {
      return NextResponse.json({ error: 'Not this course\'s evaluation.' }, { status: 400 });
    }

    await saveEvaluation(submission, userId, {
      source: 'course-player',
      moodleCourseId: resource.moodle_course_id,
    });

    // Best-effort mirror updates: the answers are safe in Neon either way.
    let completionMarked = true;
    try {
      await markActivityComplete(moodleCmid, user.moodle_user_id);
    } catch (e) {
      completionMarked = false;
      console.error(`Evaluation completion mark failed (cmid ${moodleCmid}, user ${user.moodle_user_id}):`, e);
    }
    try {
      await sql`
        UPDATE user_course_progress SET eval_submitted = TRUE, synced_at = now()
        WHERE user_id = ${userId} AND resource_id = ${resource.id}
      `;
    } catch (e) {
      console.error('eval_submitted mirror update failed:', e);
    }

    return NextResponse.json({ ok: true, completionMarked }, { status: 201 });
  } catch (error) {
    console.error('Evaluation save failed:', error);
    return NextResponse.json(
      { error: 'Your feedback could not be saved. Please try again.' },
      { status: 500 },
    );
  }
}
