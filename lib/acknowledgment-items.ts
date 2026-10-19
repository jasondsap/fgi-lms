// =============================================================================
// Course acknowledgments — the instrument itself (client-safe)
// =============================================================================
// A consent-style step inside a course: the learner must agree to every
// statement before the course can complete. It replaces the Moodle quiz that
// used to play this role on the Colorado pre-certification course (Gino's
// 10-18-26 ticket: "Yes" vs "No" to a statement about yourself is ambiguous,
// and Moodle's quiz chrome — Attempt quiz, Highest grade, Re-attempt quiz —
// never said "you passed"). Wording is Jennifer's, from
// `docs/10-18 work/ORH-CO_10-15-26_Certification Prerequisite Acknowledgment.docx`.
//
// The site renders the pane in the course player, stores the agreement in
// Neon (course_acknowledgments) and override-completes the Moodle activity so
// the certificate gate opens — the same pattern as the site evaluation
// (lib/evaluation-items.ts). Keep this file free of server imports: the pane
// is a client component.
//
// If Jennifer revises a statement, bump `version` rather than editing history.

export interface AcknowledgmentStatement {
  /** Stored key — never renumber. */
  key: string;
  text: string;
}

export interface CourseAcknowledgment {
  /** Moodle course id this applies to. */
  courseId: number;
  /** The Moodle activity (cmid) the agreement completes. */
  cmid: number;
  version: number;
  /** Activity name shown in the sidebar and as the pane heading. */
  title: string;
  /** Sidebar group label (Jennifer: "ACKNOWLEDGMENT", not "EVALUATION"). */
  groupLabel: string;
  intro: string[];
  statements: AcknowledgmentStatement[];
  agreeLabel: string;
  disagreeLabel: string;
  /** Under the counter while statements remain. */
  requirement: string;
  /** Shown when at least one statement is set to "do not agree". */
  disagreeNote: string;
  submitLabel: string;
  done: { heading: string; lines: string[] };
}

/** Colorado Pre-Certification Requirements (Moodle course 133, quiz cm 804). */
const COLORADO_PREREQ: CourseAcknowledgment = {
  courseId: 133,
  cmid: 804,
  version: 1,
  title: 'Certification Prerequisite Acknowledgment',
  groupLabel: 'Acknowledgment',
  intro: [
    'Before applying for recovery residence certification, please review the following four statements and indicate whether you agree with each one.',
    'You must agree to all four statements to receive your Certificate of Completion (COC) and proceed with the certification process. Save your COC. You will need it to access the certification portal.',
  ],
  statements: [
    {
      key: 'sud_residence',
      text: 'I am applying to certify a recovery residence for individuals with substance use disorder (SUD), not a group home or assisted living facility.',
    },
    {
      key: 'no_clinical_services',
      text: 'I understand that the recovery residence cannot operate as a treatment facility providing professional clinical services.',
    },
    {
      key: 'no_housing_offset',
      text: 'I understand that if billable services are provided, reimbursements cannot be used to offset housing costs, fund scholarships, or reduce rent.',
    },
    {
      key: 'freedom_of_choice',
      text: 'I understand that recovery residences must respect each resident’s freedom of choice in their recovery, and residents shall not be required to participate in billable recovery support services or billable peer recovery services.',
    },
  ],
  agreeLabel: 'I Agree',
  disagreeLabel: 'I Do Not Agree',
  requirement: 'All four statements must be acknowledged to proceed.',
  disagreeNote: 'Certification requires agreement with every statement. If you have a question about one of them, contact Fletcher Group before continuing — nothing is recorded until all four are agreed.',
  submitLabel: 'Continue',
  done: {
    heading: 'Acknowledgment Complete',
    lines: [
      'You have successfully completed the Certification Prerequisite Acknowledgment. All required responses have been recorded.',
      'You may now proceed to download your Certificate of Completion for the Pre-Certification Requirements course.',
    ],
  },
};

const COURSE_ACKNOWLEDGMENTS: readonly CourseAcknowledgment[] = [COLORADO_PREREQ];

/** The acknowledgment configured for a Moodle course, if any. */
export function getCourseAcknowledgment(courseId: number): CourseAcknowledgment | null {
  return COURSE_ACKNOWLEDGMENTS.find((a) => a.courseId === courseId) ?? null;
}

/** Keys of every statement, in order — what a complete submission must carry. */
export function acknowledgmentKeys(a: CourseAcknowledgment): string[] {
  return a.statements.map((s) => s.key);
}
