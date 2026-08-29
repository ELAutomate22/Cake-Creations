-- ═══════════════════════════════════════════════════════════════════════════
-- ELSHADAI CAKE CREATIONS — ORDERING SYSTEM (Phase 1)
-- ═══════════════════════════════════════════════════════════════════════════
-- Cloudflare D1 (SQLite).
--
-- Conventions carried over from the reviews table, so the database reads as
-- one thing rather than two:
--   ids          TEXT, generated with crypto.randomUUID() in application code.
--   timestamps   TEXT, ISO-8601 UTC, so lexical order is chronological order.
--   booleans     INTEGER 0/1 with a CHECK constraint.
--
-- Money is INTEGER pence throughout. Never a float: 0.1 + 0.2 is not 0.3 in
-- binary floating point, and a quote that is a penny out is a quote that is
-- wrong. GBP 55.50 is stored as 5550.
--
-- Several tables here are unused until later phases. They are created now so
-- the shape is settled before anything depends on it.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Orders ─────────────────────────────────────────────────────────────────
-- One row per cake request. A request is not an order: it carries no price and
-- confirms nothing until the owner quotes it and a deposit is paid.

CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT    PRIMARY KEY NOT NULL,
  -- Human-readable and safe to show: EC-2026-0042. Never derived from
  -- customer data, so it cannot leak anything by being displayed.
  order_number        TEXT    NOT NULL UNIQUE,

  customer_name       TEXT    NOT NULL,
  customer_email      TEXT    NOT NULL,
  customer_phone      TEXT    NOT NULL,

  occasion            TEXT    NOT NULL,
  occasion_other      TEXT,

  cake_style          TEXT    NOT NULL CHECK (cake_style IN ('personalised', 'classic')),
  servings            INTEGER NOT NULL CHECK (servings > 0),
  flavour             TEXT    NOT NULL,
  flavour_other       TEXT,

  theme               TEXT    NOT NULL,
  colours             TEXT    NOT NULL,
  cake_name_text      TEXT    NOT NULL,
  age_number          TEXT    NOT NULL,
  cake_message        TEXT    NOT NULL,
  design_requirements TEXT    NOT NULL,

  -- Date only (YYYY-MM-DD). The cake is needed on a day, not at an instant.
  required_date       TEXT    NOT NULL,
  fulfilment_type     TEXT    NOT NULL CHECK (fulfilment_type IN ('collection', 'delivery')),
  -- Required by application logic when fulfilment_type is delivery, and
  -- meaningless when it is collection, so nullable here.
  delivery_address    TEXT,
  delivery_postcode   TEXT,

  status              TEXT    NOT NULL DEFAULT 'new_request' CHECK (status IN (
                        'new_request', 'reviewing', 'quote_ready', 'awaiting_deposit',
                        'deposit_paid', 'in_progress', 'ready', 'awaiting_final_payment',
                        'paid_in_full', 'completed', 'declined', 'cancelled', 'refunded'
                      )),

  -- Evidence of consent. A deposit is non-refundable, so what was agreed to
  -- and when is worth being able to prove.
  accepted_terms      INTEGER NOT NULL DEFAULT 0 CHECK (accepted_terms IN (0, 1)),
  accepted_terms_at   TEXT,
  policy_version      TEXT,

  -- Salted hash of the submitter address, for rate limiting. Never the
  -- address itself.
  submitter_hash      TEXT,

  created_at          TEXT    NOT NULL,
  updated_at          TEXT    NOT NULL,
  -- The terminal timestamps. Retention counts 30 days from whichever is set,
  -- never from created_at: a wedding cake may sit active for a year.
  completed_at        TEXT,
  cancelled_at        TEXT,
  declined_at         TEXT,
  refunded_at         TEXT
);

CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_required_date_idx  ON orders (required_date);
CREATE INDEX IF NOT EXISTS orders_submitter_idx      ON orders (submitter_hash, created_at);

-- ── Reference images ───────────────────────────────────────────────────────
-- Metadata only. The bytes live in R2; D1 holds the key that points at them.

CREATE TABLE IF NOT EXISTS order_images (
  id                TEXT    PRIMARY KEY NOT NULL,
  order_id          TEXT    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  r2_object_key     TEXT    NOT NULL,
  original_filename TEXT,
  mime_type         TEXT    NOT NULL,
  file_size         INTEGER NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS order_images_order_idx ON order_images (order_id, sort_order);

-- ── Quote line items ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_items (
  id           TEXT    PRIMARY KEY NOT NULL,
  order_id     TEXT    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  description  TEXT    NOT NULL,
  amount_pence INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id, sort_order);

-- ── Quotes ─────────────────────────────────────────────────────────────────
-- Versioned. A quote that has been sent is a statement made to a customer, so
-- later revisions add a row rather than editing the one already sent.

CREATE TABLE IF NOT EXISTS order_quotes (
  id                      TEXT    PRIMARY KEY NOT NULL,
  order_id                TEXT    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  version                 INTEGER NOT NULL,
  subtotal_pence          INTEGER NOT NULL,
  discount_pence          INTEGER NOT NULL DEFAULT 0,
  delivery_fee_pence      INTEGER NOT NULL DEFAULT 0,
  total_pence             INTEGER NOT NULL,
  deposit_percentage      INTEGER NOT NULL,
  deposit_amount_pence    INTEGER NOT NULL,
  remaining_balance_pence INTEGER NOT NULL,
  admin_message           TEXT,
  created_at              TEXT    NOT NULL,
  sent_at                 TEXT,
  UNIQUE (order_id, version)
);

-- ── Payments ───────────────────────────────────────────────────────────────
-- Stripe identifiers only. No card details are stored, ever.

CREATE TABLE IF NOT EXISTS payments (
  id                         TEXT    PRIMARY KEY NOT NULL,
  order_id                   TEXT    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  quote_id                   TEXT    REFERENCES order_quotes (id) ON DELETE SET NULL,
  payment_type               TEXT    NOT NULL CHECK (payment_type IN ('deposit', 'balance')),
  amount_pence               INTEGER NOT NULL,
  status                     TEXT    NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id   TEXT,
  paid_at                    TEXT,
  created_at                 TEXT    NOT NULL,
  updated_at                 TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_id);

-- ── Messages sent to customers ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_messages (
  id                  TEXT    PRIMARY KEY NOT NULL,
  order_id            TEXT    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  message_type        TEXT    NOT NULL CHECK (message_type IN (
                        'quote', 'deposit_confirmation', 'final_payment',
                        'custom', 'decline', 'cancellation'
                      )),
  recipient_email     TEXT    NOT NULL,
  subject             TEXT    NOT NULL,
  body                TEXT    NOT NULL,
  delivery_status     TEXT    NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  sent_at             TEXT,
  created_at          TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS order_messages_order_idx ON order_messages (order_id, created_at);

-- ── Activity log ───────────────────────────────────────────────────────────
-- Append-only history of what happened to an order and when.

CREATE TABLE IF NOT EXISTS order_activity (
  id            TEXT    PRIMARY KEY NOT NULL,
  order_id      TEXT    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  activity_type TEXT    NOT NULL,
  description   TEXT    NOT NULL,
  metadata_json TEXT,
  created_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS order_activity_order_idx ON order_activity (order_id, created_at DESC);

-- ── Settings ───────────────────────────────────────────────────────────────
-- Business values that would otherwise be scattered through the code.

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY NOT NULL,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
