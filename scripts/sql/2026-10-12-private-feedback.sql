-- Jennifer burn-down (9-28 consolidation), applied 10-12-26.
-- Run with:  node scripts/apply-sql.js scripts/sql/2026-10-12-private-feedback.sql
--
-- 1. Row 19: a "Private" flag beside `internal`. Label only for now — it does
--    not change who can open the resource; cards and the detail page show a
--    PRIVATE pill (with Jennifer's HRSA pop-up) to staff and admins only.
--    Until this column exists, lib/resources.ts reads it defensively via
--    to_jsonb(resources)->>'private' (always false). Flip a row with
--    node scripts/set-private.js <code|slug> [--public].
ALTER TABLE resources ADD COLUMN IF NOT EXISTS private boolean NOT NULL DEFAULT false;

-- 2. Row 15: "Share feedback" ticket category. Until this runs, a feedback
--    ticket is filed as 'other' with "[Feedback]" in the title (lib/support-db.ts).
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_chk;

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_category_chk
  CHECK (category IN ('question', 'feedback', 'bug', 'access', 'content', 'certificate', 'feature', 'other'));
