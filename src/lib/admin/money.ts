/**
 * Money.
 *
 * Every amount in this system is an integer number of pence, and every
 * calculation happens in pence. Pounds exist only as text, at the edges, for
 * reading and typing.
 *
 * This is not fussiness. 0.1 + 0.2 is 0.30000000000000004 in the arithmetic a
 * computer actually does, and a quote that is a penny out is a quote that is
 * wrong — in a document a customer is asked to pay against.
 */

/** 5550 -> "55.50". No currency symbol; the caller decides. */
export function formatPence(pence: number): string {
  const negative = pence < 0;
  const absolute = Math.abs(Math.round(pence));
  const pounds = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  return `${negative ? "-" : ""}${pounds.toLocaleString("en-GB")}.${String(remainder).padStart(2, "0")}`;
}

/** 5550 -> "£55.50" */
export function formatPounds(pence: number): string {
  return `£${formatPence(pence)}`;
}

/**
 * "55.50", "£55.50", "55" -> 5550.
 *
 * Rounds rather than truncates, so a typed "10.005" becomes 1001 rather than
 * silently losing the half penny. Returns null when the text is not a number,
 * so a caller can tell "nothing typed" from "zero".
 */
export function parsePence(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, "").trim();
  if (cleaned === "") return null;
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return null;

  const pounds = Number(cleaned);
  if (!Number.isFinite(pounds)) return null;

  return Math.round(pounds * 100);
}

export type QuoteLine = { description: string; amountPence: number };

export type QuoteTotals = {
  subtotalPence: number;
  discountPence: number;
  deliveryFeePence: number;
  totalPence: number;
  depositPercentage: number;
  depositAmountPence: number;
  remainingBalancePence: number;
};

/**
 * Works out a quote from its parts.
 *
 * Delivery is a single named field rather than a line item, and the UI does
 * not offer a "Delivery" item, so it cannot be counted twice. The line items
 * are the cake and its work; delivery and discount are adjustments to that.
 *
 * `depositFixedPence` overrides the percentage when the owner wants a round
 * number — "£50 deposit" rather than "37%".
 */
export function calculateQuote({
  items,
  discountPence = 0,
  deliveryFeePence = 0,
  depositPercentage = 50,
  depositFixedPence = null,
  paidPence = 0,
}: {
  items: QuoteLine[];
  discountPence?: number;
  deliveryFeePence?: number;
  depositPercentage?: number;
  depositFixedPence?: number | null;
  /** Sum of payments already taken. Phase 3 supplies this; 0 until then. */
  paidPence?: number;
}): QuoteTotals {
  const subtotalPence = items.reduce((sum, item) => sum + item.amountPence, 0);

  // Clamped so a discount larger than the order cannot produce a negative
  // total, which would read as the business owing the customer money.
  const discount = Math.max(0, Math.min(discountPence, subtotalPence));
  const delivery = Math.max(0, deliveryFeePence);

  const totalPence = Math.max(0, subtotalPence - discount + delivery);

  const percentage = Math.max(0, Math.min(100, Math.round(depositPercentage)));

  const depositAmountPence =
    depositFixedPence === null
      ? Math.round((totalPence * percentage) / 100)
      : Math.max(0, Math.min(depositFixedPence, totalPence));

  /*
   * What is still owed.
   *
   * Measured against what has actually been paid, never against the deposit
   * figure. If the total is revised upward after a deposit is taken, the
   * deposit that was paid stays what it was and the difference lands in the
   * balance — a payment already made is a fact, not a formula to re-run.
   */
  const remainingBalancePence = Math.max(
    0,
    totalPence - (paidPence > 0 ? paidPence : depositAmountPence),
  );

  return {
    subtotalPence,
    discountPence: discount,
    deliveryFeePence: delivery,
    totalPence,
    depositPercentage: percentage,
    depositAmountPence,
    remainingBalancePence,
  };
}
