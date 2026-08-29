-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENTS, SECURE LINKS AND RETENTION (Phase 3)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- order_access_tokens
--   The secure links sent to customers, for a quote and for a final payment.
--   Only a SHA-256 hash of each token is stored: the raw value exists in the
--   email and nowhere else, so a copy of this database does not hand someone
--   working payment links.
--
--   Both kinds live in one table rather than as columns on quotes and
--   payments. Tokens are the thing most needing to be revoked in bulk and
--   deleted on purge, and one table means one place to do both.
--
-- stripe_events
--   Stripe delivers an event more than once whenever it is unsure the first
--   attempt landed. Without a record of what has already been processed, a
--   retry pays an order twice and sends a second confirmation email. The
--   event id is the primary key, so a repeat cannot be inserted.
--
-- purge_runs
--   Deliberately counts only. A log of what was deleted for privacy reasons
--   must not itself become a record of who the customers were.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS order_access_tokens (
  id           TEXT PRIMARY KEY NOT NULL,
  order_id     TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  -- Set for a quote link; NULL for a balance link, which belongs to the order
  -- as a whole rather than to one quote.
  quote_id     TEXT REFERENCES order_quotes (id) ON DELETE CASCADE,
  purpose      TEXT NOT NULL CHECK (purpose IN ('quote', 'balance')),
  -- SHA-256 of the raw token. The raw value is never written down here.
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   TEXT NOT NULL,
  expires_at   TEXT,
  -- Set when a newer quote supersedes this one, or the owner withdraws it.
  revoked_at   TEXT
);

CREATE INDEX IF NOT EXISTS order_access_tokens_order_idx
  ON order_access_tokens (order_id, purpose);

-- ── Quote lifecycle ────────────────────────────────────────────────────────
-- `status` already exists from 0003 with a default of 'draft'. Phase 3 widens
-- the vocabulary to draft, active, paid, superseded, expired and cancelled.
-- Only an 'active' quote may take a deposit.

ALTER TABLE order_quotes ADD COLUMN superseded_at TEXT;

-- ── Stripe event ledger ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stripe_events (
  -- Stripe's own event id. Being the primary key is what makes a replayed
  -- event impossible to process twice.
  event_id      TEXT PRIMARY KEY NOT NULL,
  event_type    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'processing'
                CHECK (status IN ('processing', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  received_at   TEXT NOT NULL,
  processed_at  TEXT
);

-- ── Purge log ──────────────────────────────────────────────────────────────
-- Counts only. No names, no addresses, no order numbers.

CREATE TABLE IF NOT EXISTS purge_runs (
  id            TEXT PRIMARY KEY NOT NULL,
  ran_at        TEXT NOT NULL,
  orders_purged INTEGER NOT NULL DEFAULT 0,
  images_purged INTEGER NOT NULL DEFAULT 0,
  failures      INTEGER NOT NULL DEFAULT 0,
  error_code    TEXT
);
