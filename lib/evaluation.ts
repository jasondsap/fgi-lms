// =============================================================================
// Learning Center evaluation — validation and the one write path
// =============================================================================
// SERVER ONLY: this imports the Neon driver. A client component that needs the
// questions imports `lib/evaluation-items` instead.
import { sql } from './db';
import {
  INSTRUMENT_VERSION, RATING_ITEMS, TEXT_ITEMS,
  type RatingKey, type TextKey,
} from './evaluation-items';

export * from './evaluation-items';

export interface EvaluationSubmission {
  slug: string;
  surface: string;
  ratings: Record<RatingKey, number>;
  texts: Partial<Record<TextKey, string>>;
  may_contact: boolean;
  contact_email?: string | null;
}

/** Free-text answers are trimmed to this before storage. */
const MAX_TEXT = 2000;

export class EvaluationError extends Error {}

/**
 * Validate a submission coming off the wire. Throws EvaluationError with a
 * message safe to show the submitter; returns the cleaned shape.
 */
export function parseSubmission(body: any): EvaluationSubmission {
  if (!body || typeof body !== 'object') throw new EvaluationError('Malformed submission.');

  const slug = typeof body.slug === 'string' ? body.slug.slice(0, 200) : '';
  if (!slug) throw new EvaluationError('Missing resource.');

  const ratings = {} as Record<RatingKey, number>;
  for (const item of RATING_ITEMS) {
    const value = Number(body?.ratings?.[item.key]);
    if (!Number.isInteger(value) || value < 0 || value > 10) {
      throw new EvaluationError('Please answer every rating question.');
    }
    ratings[item.key] = value;
  }

  const texts: Partial<Record<TextKey, string>> = {};
  for (const item of TEXT_ITEMS) {
    const value = body?.texts?.[item.key];
    if (typeof value === 'string' && value.trim()) {
      texts[item.key] = value.trim().slice(0, MAX_TEXT);
    }
  }

  if (typeof body.may_contact !== 'boolean') {
    throw new EvaluationError('Please answer the contact question.');
  }

  // Only kept when they said yes — an address volunteered and then retracted
  // by flipping the answer should not be stored.
  const email = typeof body.contact_email === 'string' ? body.contact_email.trim().slice(0, 320) : '';

  return {
    slug,
    surface: typeof body.surface === 'string' ? body.surface.slice(0, 40) : 'fgi',
    ratings,
    texts,
    may_contact: body.may_contact,
    contact_email: body.may_contact && email ? email : null,
  };
}

/**
 * Store one submission. `userId` comes from the session, or null for the
 * anonymous case — nothing on the site is behind a login yet.
 *
 * A signed-in learner evaluating the same resource twice hits the partial
 * unique index and is silently absorbed: they already told us, and an error
 * dialog would be a worse answer than a thank-you.
 */
export async function saveEvaluation(
  submission: EvaluationSubmission,
  userId: string | null,
  opts: { source?: string; moodleCourseId?: number | null } = {},
): Promise<void> {
  const { slug, surface, ratings, texts, may_contact, contact_email } = submission;

  const rows = await sql`SELECT id FROM resources WHERE slug = ${slug} LIMIT 1`;
  const resourceId = (rows[0] as { id: string } | undefined)?.id ?? null;

  await sql`
    INSERT INTO evaluation_responses (
      resource_id, resource_slug, surface, user_id, source, moodle_course_id,
      instrument_version,
      made_sense, can_apply, presented_well, overall_impression, would_recommend,
      liked, disliked, future_topics, may_contact, contact_email
    ) VALUES (
      ${resourceId}, ${slug}, ${surface}, ${userId},
      ${opts.source ?? 'web'}, ${opts.moodleCourseId ?? null}, ${INSTRUMENT_VERSION},
      ${ratings.made_sense}, ${ratings.can_apply}, ${ratings.presented_well},
      ${ratings.overall_impression}, ${ratings.would_recommend},
      ${texts.liked ?? null}, ${texts.disliked ?? null}, ${texts.future_topics ?? null},
      ${may_contact}, ${contact_email}
    )
    ON CONFLICT DO NOTHING
  `;
}
