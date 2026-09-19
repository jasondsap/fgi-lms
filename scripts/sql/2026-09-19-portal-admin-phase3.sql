-- =============================================================================
-- Portal Admin phase 3 — 2026-09-19
-- Apply with:  node scripts/apply-sql.js scripts/sql/2026-09-19-portal-admin-phase3.sql
-- Both statements are additive and idempotent.
-- =============================================================================

-- Jennifer's "last date account accessed": stamped by upsertUser on every
-- sign-in. NULL = has not signed in since this column existed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- A saved report = a named filter set on one portal's admin page. The same row
-- becomes a scheduled email when `frequency` is set, so a preset and a
-- schedule can never drift apart. `query` is the page's own filter query
-- string (lib/portal-admin.ts filterQuery) and is re-parsed through
-- parseFilters on every use — it is never trusted as SQL or as a portal scope.
-- Reports are emailed to their OWNER only, and only while that person may
-- still administer the portal (checked at send time).
-- Text columns, not enums (enum drift has bitten this project twice).
CREATE TABLE IF NOT EXISTS portal_saved_reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal       text        NOT NULL,
  owner_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  report       text        NOT NULL DEFAULT 'users',
  query        text        NOT NULL DEFAULT '',
  frequency    text,
  format       text        NOT NULL DEFAULT 'xlsx',
  next_run_at  timestamptz,
  last_sent_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_saved_reports_owner_idx
  ON portal_saved_reports (portal, owner_id, created_at);

CREATE INDEX IF NOT EXISTS portal_saved_reports_due_idx
  ON portal_saved_reports (next_run_at) WHERE frequency IS NOT NULL;

-- Scheduled sends only: TRUE = the email covers just the period since the
-- previous one (last 7 days / previous calendar month) on the saved date
-- field; FALSE = everything the saved filters match, every time.
ALTER TABLE portal_saved_reports ADD COLUMN IF NOT EXISTS period_only boolean NOT NULL DEFAULT false;
