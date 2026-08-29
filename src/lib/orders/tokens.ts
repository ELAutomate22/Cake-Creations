import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { query } from "@/lib/d1/client";

/**
 * Secure links for customers.
 *
 * A quote link is the only thing standing between the internet and someone
 * else's order, so it is 32 random bytes — not an order number, not an id, not
 * something short enough to try.
 *
 * Only the SHA-256 of the token is stored. The raw value exists in the email
 * and nowhere else, so a leaked copy of the database yields no working links.
 * There is no salt and no slow hash here on purpose: the input is already 256
 * bits of randomness, so there is nothing to guess and nothing to precompute,
 * and the lookup has to be a fast exact match.
 */

export type TokenPurpose = "quote" | "balance";

/** Long enough that guessing is not a strategy. */
const TOKEN_BYTES = 32;

/** A quote link is not meant to stay valid forever. */
export const QUOTE_TOKEN_DAYS = 30;
export const BALANCE_TOKEN_DAYS = 60;

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Issues a link and returns the raw token — the only time it exists.
 *
 * The caller must put it straight into the email and keep no copy.
 */
export async function createAccessToken({
  orderId,
  quoteId = null,
  purpose,
  days,
}: {
  orderId: string;
  quoteId?: string | null;
  purpose: TokenPurpose;
  days: number;
}): Promise<string> {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO order_access_tokens
       (id, order_id, quote_id, purpose, token_hash, created_at, expires_at)
     VALUES (?,?,?,?,?,?,?)`,
    [
      crypto.randomUUID(),
      orderId,
      quoteId,
      purpose,
      hashToken(raw),
      now.toISOString(),
      expires.toISOString(),
    ],
  );

  return raw;
}

export type ResolvedToken = {
  id: string;
  orderId: string;
  quoteId: string | null;
  purpose: TokenPurpose;
  expiresAt: string | null;
  revokedAt: string | null;
};

/**
 * Looks a token up by its hash.
 *
 * Returns null for anything unusable — unknown, revoked or expired — so a
 * caller cannot accidentally treat a withdrawn link as live. The reason is not
 * distinguished to the caller, and the public page says only that the link is
 * no longer valid: which of the three it is would tell a stranger whether a
 * given token ever existed.
 */
export async function resolveToken(raw: string): Promise<ResolvedToken | null> {
  if (!raw || raw.length < 20) return null;

  const { rows } = await query<{
    id: string;
    order_id: string;
    quote_id: string | null;
    purpose: TokenPurpose;
    expires_at: string | null;
    revoked_at: string | null;
  }>(
    `SELECT id, order_id, quote_id, purpose, expires_at, revoked_at
       FROM order_access_tokens WHERE token_hash = ?`,
    [hashToken(raw)],
  );

  const row = rows[0];
  if (!row) return null;
  if (row.revoked_at) return null;
  if (row.expires_at && row.expires_at < new Date().toISOString()) return null;

  return {
    id: row.id,
    orderId: row.order_id,
    quoteId: row.quote_id,
    purpose: row.purpose,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

/** Withdraws every live link of one kind for an order. */
export async function revokeTokens(
  orderId: string,
  purpose: TokenPurpose,
): Promise<void> {
  await query(
    `UPDATE order_access_tokens SET revoked_at = ?
       WHERE order_id = ? AND purpose = ? AND revoked_at IS NULL`,
    [new Date().toISOString(), orderId, purpose],
  );
}
