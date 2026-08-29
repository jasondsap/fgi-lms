-- =============================================================================
-- My Learning (user page) — 2026-08-29
-- Neon mirror of each learner's per-course progress (source of truth stays
-- Moodle; rows are refreshed whenever the course player loads and on demand
-- from the account page), plus library-side tracking that Moodle never sees.
-- Apply with:  node scripts/apply-sql.js scripts/sql/2026-08-29-user-learning.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_course_progress (
  user_id           uuid        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  resource_id       uuid        NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  moodle_course_id  integer     NOT NULL,
  -- surface the learner last opened the course from: fgi | colorado | scarr
  surface           text        NOT NULL DEFAULT 'fgi',
  -- completion-tracked modules only (certificate excluded) — same rule as the
  -- player's progress bar, so the two figures always agree
  tracked_total     integer     NOT NULL DEFAULT 0,
  tracked_done      integer     NOT NULL DEFAULT 0,
  pct               smallint    NOT NULL DEFAULT 0,
  -- first incomplete module in course order → "Resume" deep link
  next_cmid         integer,
  next_module_name  text,
  started_at        timestamptz NOT NULL DEFAULT now(),
  -- set once, the first time every tracked module is complete
  completed_at      timestamptz,
  -- latest module completion time Moodle reports
  last_activity_at  timestamptz,
  -- quiz (evaluation) result, best attempt
  quiz_cmid         integer,
  quiz_best         numeric,
  quiz_max          numeric,
  quiz_pass         numeric,
  quiz_passed       boolean,
  -- Learning Center evaluation (mod_feedback) submitted?
  eval_cmid         integer,
  eval_submitted    boolean     NOT NULL DEFAULT false,
  -- certificate: module present in the course, earned (all gates done), and
  -- Moodle's issue record once the local WS function exists
  cert_cmid         integer,
  cert_earned       boolean     NOT NULL DEFAULT false,
  cert_code         text,
  cert_issued_at    timestamptz,
  -- CE snapshot taken at completion so later catalogue edits never rewrite
  -- a learner's transcript
  ce_hours          numeric,
  is_naadac_ce      boolean,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_id)
);
CREATE INDEX IF NOT EXISTS user_course_progress_user_idx
  ON user_course_progress (user_id, completed_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS user_bookmarks (
  user_id     uuid        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  resource_id uuid        NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_id)
);

-- Library activity log (view / course_open). Downloads are direct presigned
-- S3 links, so they are not observable here without proxying them.
CREATE TABLE IF NOT EXISTS user_resource_events (
  id          bigserial   PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  resource_id uuid                 REFERENCES resources(id) ON DELETE SET NULL,
  surface     text        NOT NULL DEFAULT 'fgi',
  event       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_resource_events_user_idx
  ON user_resource_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_resource_events_resource_idx
  ON user_resource_events (resource_id, created_at DESC);
