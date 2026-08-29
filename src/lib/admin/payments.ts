import "server-only";
import { query } from "@/lib/d1/client";

/**
 * What has been paid, and what is still owed.
 *
 * The single rule this module exists to enforce:
 *
 *     outstanding = current total − sum of successful payments
 *
 * Never "the deposit percentage of the current total". A payment that has
 * happened is a fact about the past. If the owner revises a £100 order to £130
 * after a £50 deposit, the deposit stays £50 and the balance becomes £80 — it
 * does not become £65 because the arithmetic would be tidier. Recalculating a
 * historical payment would mean telling a customer they paid an amount they
 * did not pay.
 *
 * Every amount here is read from D1. Nothing on this path accepts a figure
 * from a browser, which is the reason a customer cannot choose what to pay.
 */

export type PaymentRow = {
  id: string;
  order_id: string;
  quote_id: string | null;
  payment_type: "deposit" | "balance";
  amount_pence: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getPayments(orderId: string): Promise<PaymentRow[]> {
  const { rows } = await query<PaymentRow>(
    `SELECT * FROM payments WHERE order_id = ? ORDER BY created_at`,
    [orderId],
  );
  return rows;
}

/** The sum of payments that actually succeeded. Pending never counts. */
export async function paidPence(orderId: string): Promise<number> {
  const { rows } = await query<{ total: number }>(
    `SELECT COALESCE(SUM(amount_pence), 0) AS total
       FROM payments WHERE order_id = ? AND status = 'paid'`,
    [orderId],
  );
  return rows[0]?.total ?? 0;
}

/** The total from the newest quote, which is what the customer was last told. */
export async function currentTotalPence(orderId: string): Promise<number> {
  const { rows } = await query<{ total_pence: number }>(
    `SELECT total_pence FROM order_quotes
       WHERE order_id = ? ORDER BY version DESC LIMIT 1`,
    [orderId],
  );
  return rows[0]?.total_pence ?? 0;
}

export type Balance = {
  totalPence: number;
  paidPence: number;
  outstandingPence: number;
  hasPaidDeposit: boolean;
};

/**
 * The authoritative position on an order.
 *
 * This is the only function allowed to decide what a customer owes, and every
 * Checkout session is built from its result immediately before the session is
 * created — never from a figure carried in a link or a form.
 */
export async function getBalance(orderId: string): Promise<Balance> {
  const [totalPence, paid, deposit] = await Promise.all([
    currentTotalPence(orderId),
    paidPence(orderId),
    query<{ count: number }>(
      `SELECT COUNT(*) AS count FROM payments
         WHERE order_id = ? AND payment_type = 'deposit' AND status = 'paid'`,
      [orderId],
    ),
  ]);

  return {
    totalPence,
    paidPence: paid,
    // Clamped at zero: an overpayment is a thing to investigate, not a
    // negative amount to invite someone to pay.
    outstandingPence: Math.max(0, totalPence - paid),
    hasPaidDeposit: (deposit.rows[0]?.count ?? 0) > 0,
  };
}

/**
 * A pending payment row for a Checkout session about to be created.
 *
 * Any earlier pending row of the same kind is cancelled first. A customer who
 * opens Checkout, changes their mind, and comes back an hour later to a
 * revised total must not leave two live sessions behind that could both be
 * completed.
 */
export async function createPendingPayment({
  orderId,
  quoteId,
  type,
  amountPence,
  sessionId,
}: {
  orderId: string;
  quoteId: string | null;
  type: "deposit" | "balance";
  amountPence: number;
  sessionId: string;
}): Promise<string> {
  const now = new Date().toISOString();

  await query(
    `UPDATE payments SET status = 'cancelled', updated_at = ?
       WHERE order_id = ? AND payment_type = ? AND status = 'pending'`,
    [now, orderId, type],
  );

  const id = crypto.randomUUID();

  await query(
    `INSERT INTO payments (
       id, order_id, quote_id, payment_type, amount_pence, status,
       stripe_checkout_session_id, created_at, updated_at
     ) VALUES (?,?,?,?,?,'pending',?,?,?)`,
    [id, orderId, quoteId, type, amountPence, sessionId, now, now],
  );

  return id;
}

/** Is there already a successful payment of this kind? */
export async function hasSuccessfulPayment(
  orderId: string,
  type: "deposit" | "balance",
): Promise<boolean> {
  const { rows } = await query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM payments
       WHERE order_id = ? AND payment_type = ? AND status = 'paid'`,
    [orderId, type],
  );
  return (rows[0]?.count ?? 0) > 0;
}
