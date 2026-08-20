-- ═══════════════════════════════════════════════════════════════════════════
-- ELSHADAI CAKE CREATIONS — CLOUDFLARE D1 SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- Port of the Supabase (Postgres) `cake_reviews` table to D1 (SQLite).
--
-- Type mapping, and why:
--   uuid          -> TEXT     SQLite has no uuid type; ids are generated in
--                             application code with crypto.randomUUID().
--   timestamptz   -> TEXT     ISO-8601 UTC strings, so lexical order matches
--                             chronological order and range filters still work.
--   boolean       -> INTEGER  0 or 1, with a CHECK constraint.
--
-- IMPORTANT — what does NOT come across from Postgres:
--   D1 has no row level security and no column-level privileges. In Supabase,
--   `customer_email` was unreadable by the public role at the database level;
--   a query asking for it was refused by Postgres itself. D1 cannot enforce
--   that. Every read must therefore go through server code that selects the
--   public columns explicitly and never exposes customer_email.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cake_reviews (
  id              TEXT    PRIMARY KEY NOT NULL,
  customer_name   TEXT    NOT NULL,
  customer_email  TEXT,
  cake_type       TEXT,
  cake_style      TEXT,
  occasion        TEXT,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text     TEXT    NOT NULL,
  submitter_hash  TEXT,
  is_visible      INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  owner_response  TEXT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Listing: newest visible reviews first.
CREATE INDEX IF NOT EXISTS cake_reviews_visible_created_idx
  ON cake_reviews (is_visible, created_at DESC);

-- Rate limiting: "how many from this submitter since <time>".
CREATE INDEX IF NOT EXISTS cake_reviews_submitter_created_idx
  ON cake_reviews (submitter_hash, created_at);
