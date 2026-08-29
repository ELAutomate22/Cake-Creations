-- ═══════════════════════════════════════════════════════════════════════════
-- ADMIN ORDER MANAGEMENT (Phase 2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Two things this adds, and why each is shaped the way it is.
--
-- order_confirmed
--   What the customer sent must stay exactly as they sent it. If the owner
--   edits the flavour from vanilla to chocolate after a phone call, the
--   original request still has to read "vanilla" — otherwise a disagreement
--   about what was asked for has no evidence left in it.
--
--   So `orders` is never edited after submission, and every admin change is
--   written here instead. A row appears the first time something is changed,
--   and a NULL column means "unchanged, use the original".
--
-- quote snapshots
--   A sent quote is a statement made to a customer. Line items live in
--   order_items as an editable working draft; when a quote is sent, the items
--   and every total are frozen into the quote row as JSON. Editing the draft
--   afterwards cannot rewrite what was already sent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── The working, editable order ────────────────────────────────────────────
-- One row per order, at most. NULL means the original value still stands.

CREATE TABLE IF NOT EXISTS order_confirmed (
  order_id            TEXT PRIMARY KEY NOT NULL
                        REFERENCES orders (id) ON DELETE CASCADE,

  occasion            TEXT,
  occasion_other      TEXT,
  cake_style          TEXT,
  servings            INTEGER,
  flavour             TEXT,
  flavour_other       TEXT,
  theme               TEXT,
  colours             TEXT,
  cake_name_text      TEXT,
  age_number          TEXT,
  cake_message        TEXT,
  design_requirements TEXT,
  required_date       TEXT,
  fulfilment_type     TEXT,
  delivery_address    TEXT,
  delivery_postcode   TEXT,

  -- Owner's private notes. Never shown to a customer, never placed in an
  -- email. The email routes do not read this column at all.
  internal_notes      TEXT,

  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

-- ── Quote snapshots ────────────────────────────────────────────────────────
-- SQLite has no "ADD COLUMN IF NOT EXISTS", and this migration is written to
-- run once. Re-running it will report duplicate columns, which is safe to
-- ignore.

-- The line items exactly as they stood when the quote was sent.
ALTER TABLE order_quotes ADD COLUMN items_json TEXT;

-- draft: still editable. sent: frozen, and never edited again.
ALTER TABLE order_quotes ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';

-- The deposit percentage in force when this quote was made, so a later change
-- to the default in settings cannot alter a quote already sent.
ALTER TABLE order_quotes ADD COLUMN deposit_is_fixed INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS order_quotes_order_idx ON order_quotes (order_id, version DESC);
