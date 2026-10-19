// =============================================================================
// Course acknowledgments — the write path and the lookups. SERVER ONLY.
// =============================================================================
import { sql } from './db';
import { acknowledgmentKeys, type CourseAcknowledgment } from './acknowledgment-items';

export * from './acknowledgment-items';

/**
 * True when `agreed` covers every statement of the instrument. Anything less
 * is not stored (Jason, 10-18-26: "store nothing" until they agree to all).
 */
export function isCompleteAgreement(a: CourseAcknowledgment, agreed: unknown): agreed is string[] {
  if (!Array.isArray(agreed)) return false;
  const set = new Set(agreed.filter((k): k is string => typeof k === 'string'));
  return acknowledgmentKeys(a).every((k) => set.has(k));
}

export interface SaveAcknowledgmentInput {
  userId: string;
  resourceId: string;
  surface: string;
  moodleCourseId: number;
  ack: CourseAcknowledgment;
}

/**
 * Record the agreement. Re-submitting (e.g. the Moodle mark failed the first
 * time and the pane was shown again) keeps the original timestamp — the date
 * they first agreed is the fact Portal Admins report on.
 */
export async function saveAcknowledgment(input: SaveAcknowledgmentInput): Promise<{ created_at: Date }> {
  const rows = await sql`
    INSERT INTO course_acknowledgments (
      user_id, resource_id, moodle_course_id, moodle_cmid, surface, instrument_version, agreed_keys
    ) VALUES (
      ${input.userId}, ${input.resourceId}, ${input.moodleCourseId}, ${input.ack.cmid},
      ${input.surface}, ${input.ack.version}, ${acknowledgmentKeys(input.ack)}
    )
    ON CONFLICT (user_id, moodle_cmid) DO UPDATE
      SET instrument_version = EXCLUDED.instrument_version,
          agreed_keys        = EXCLUDED.agreed_keys
    RETURNING created_at
  `;
  return { created_at: new Date(rows[0].created_at as string) };
}

/** Remember that the Moodle activity was completed for this agreement. */
export async function markAcknowledgmentMirrored(userId: string, cmid: number): Promise<void> {
  await sql`
    UPDATE course_acknowledgments SET moodle_marked = TRUE
    WHERE user_id = ${userId} AND moodle_cmid = ${cmid}
  `;
}

/** When this learner agreed (null if they have not). */
export async function getAcknowledgedAt(userId: string, cmid: number): Promise<Date | null> {
  const rows = await sql`
    SELECT created_at FROM course_acknowledgments
    WHERE user_id = ${userId} AND moodle_cmid = ${cmid}
  `;
  return rows.length ? new Date(rows[0].created_at as string) : null;
}
