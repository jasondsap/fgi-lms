// =============================================================================
// Learning Center evaluation — the instrument itself
// =============================================================================
// Client-safe on purpose: the modal renders these, so this module must not
// reach lib/db.ts. The write path lives in lib/evaluation.ts, which is
// server-only — a 'use client' component importing that one bundles the Neon
// driver into the browser, where it throws on the connection string it can't
// see. Keep this file free of server imports.
// Source: `docs/SharePoint/Evaluation for everything except the Podcast.docx`.
// The same nine items are already live in Moodle as the `Course Evaluation`
// feedback activity on all 88 courses (docs/CLAUDE.md §6ab), so the wording,
// the order and the 0-10 scale here are deliberately identical: the two sets of
// answers have to stack in one table for reporting.
//
// If Jennifer revises a question, bump INSTRUMENT_VERSION rather than editing
// history — old rows were answering the old wording.

export const INSTRUMENT_VERSION = 1;

export const EVALUATION_INTRO = [
  'Thank you for visiting the Learning Center. Your feedback is greatly appreciated!',
  'Please take a few minutes to share your thoughts so we can continue to improve and provide the content you find relevant.',
];

export const EVALUATION_THANKS = 'Thank you for your time. Have a great day!';

/** The five 0-10 items, in Moodle's order. Keys are the DB column names. */
export const RATING_ITEMS = [
  { key: 'made_sense',         prompt: 'The information provided made sense to me' },
  { key: 'can_apply',          prompt: 'I will be able to apply the information' },
  { key: 'presented_well',     prompt: 'The information was presented effectively' },
  { key: 'overall_impression', prompt: 'My overall impression of the information is excellent' },
  { key: 'would_recommend',    prompt: 'How likely are you to recommend this information to someone in a similar role?' },
] as const;

/** The three optional open-ended items. Keys are the DB column names. */
export const TEXT_ITEMS = [
  { key: 'liked',         prompt: 'What did you LIKE?' },
  { key: 'disliked',      prompt: 'What did you NOT LIKE?' },
  { key: 'future_topics', prompt: 'Are there other topics or suggestions for what you would like to see in the Learning Center in the future?' },
] as const;

export const CONTACT_ITEM = {
  key: 'may_contact',
  prompt: 'May a representative contact you about your experience?',
} as const;

export type RatingKey = typeof RATING_ITEMS[number]['key'];
export type TextKey   = typeof TEXT_ITEMS[number]['key'];
