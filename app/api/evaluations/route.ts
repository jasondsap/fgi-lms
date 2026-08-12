// POST /api/evaluations — Learning Center evaluation submissions.
//
// Open to anonymous visitors on purpose: nothing on the site is behind a login
// yet, and a feedback form that demands an account collects nothing. When a
// session does exist the response is attributed to it, which is also what makes
// the eventual merge with Moodle's answers possible (users.moodle_user_id).
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/auth';
import { EvaluationError, parseSubmission, saveEvaluation } from '@/lib/evaluation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let submission;
  try {
    submission = parseSubmission(await request.json());
  } catch (error) {
    const message = error instanceof EvaluationError
      ? error.message
      : 'We could not read that submission.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const session = await getSession();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    await saveEvaluation(submission, userId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('Evaluation save failed:', error);
    return NextResponse.json(
      { error: 'Your feedback could not be saved. Please try again.' },
      { status: 500 },
    );
  }
}
