-- ═══════════════════════════════════════════════════════════════════════════
-- SETTINGS — starting values
-- ═══════════════════════════════════════════════════════════════════════════
-- Business values the application reads rather than hard-codes, so the owner
-- can change them without a deploy.
--
-- Anything written in square brackets is a placeholder, matching the
-- convention in src/content/site.ts: the site shows nothing at all rather than
-- presenting a placeholder to a customer as though it were real.
--
-- INSERT OR IGNORE, so re-running this never overwrites a value the owner has
-- since changed.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  -- The usual deposit. Per-order quotes may differ; this is only the default.
  ('default_deposit_percentage', '50',                        '2026-08-29T00:00:00Z'),
  ('business_email',             '[EMAIL ADDRESS]',           '2026-08-29T00:00:00Z'),
  ('business_phone',             '+44 7534 634714',           '2026-08-29T00:00:00Z'),
  ('business_phone_secondary',   '+44 7773 556005',           '2026-08-29T00:00:00Z'),
  ('collection_information',     '[COLLECTION INFORMATION]',  '2026-08-29T00:00:00Z'),
  ('delivery_information',       '[DELIVERY INFORMATION]',    '2026-08-29T00:00:00Z'),
  ('email_footer',               '[EMAIL FOOTER]',            '2026-08-29T00:00:00Z'),
  -- Stamped onto every order at submission, so it is always possible to say
  -- which wording a given customer actually agreed to.
  ('policy_version',             '2026-08-29',                '2026-08-29T00:00:00Z'),
  -- Days after an order reaches a terminal state before it is deleted.
  -- Counted from the terminal timestamp, never from created_at.
  ('retention_days_after_close', '30',                        '2026-08-29T00:00:00Z');
