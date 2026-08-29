import { NextResponse } from "next/server";
import { business } from "@/content/site";
import { query } from "@/lib/d1/client";
import { getBalance, createPendingPayment, hasSuccessfulPayment } from "@/lib/admin/payments";
import { getOrder, recordActivity } from "@/lib/admin/orders";
import { resolveToken } from "@/lib/orders/tokens";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { formatPounds } from "@/lib/admin/money";

/**
 * Creating a Stripe Checkout session.
 *
 * The request carries a token and an acceptance. It does not carry an amount,
 * and there is no code path here that would read one — the figure comes from
 * `getBalance`, which reads D1, and is computed immediately before the session
 * is created rather than taken from anything the customer's browser has been
 * holding. That is what stops a customer choosing their own price, and it is
 * also what stops a stale link charging yesterday's total.
 *
 * The checks, in order:
 *
 *   1. rate limit, so the endpoint cannot be hammered
 *   2. the token: unknown, revoked and expired are all simply "no"
 *   3. the quote is the active one — a superseded link cannot pay
 *   4. no successful payment of this kind already exists
 *   5. the amount, read fresh from the database, is above zero
 *   6. for a deposit, the customer has accepted the non-refundable condition
 */

export const runtime = "nodejs";

/** Per token, so one link cannot be used to open sessions endlessly. */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_PER_WINDOW = 10;
const WINDOW_MS = 10 * 60 * 1000;

function tooMany(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || record.until < now) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
    return false;
  }

  record.count += 1;
  return record.count > MAX_PER_WINDOW;
}

function problem(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return problem(
      "Card payments are not available yet. Please get in touch and we will arrange payment another way.",
      503,
    );
  }

  let token = "";
  let acceptedTerms = false;
  try {
    const body = (await request.json()) as { token?: string; acceptedTerms?: boolean };
    token = String(body.token ?? "");
    acceptedTerms = body.acceptedTerms === true;
  } catch {
    return problem("That request could not be read.", 400);
  }

  if (tooMany(token.slice(0, 16))) {
    return problem("Too many attempts. Please wait a moment and try again.", 429);
  }

  // ── The link ─────────────────────────────────────────────────────────────
  const resolved = await resolveToken(token);
  if (!resolved) {
    return problem("That payment link is no longer valid.", 404);
  }

  const order = await getOrder(resolved.orderId);
  if (!order) {
    return problem("That payment link is no longer valid.", 404);
  }

  const isDeposit = resolved.purpose === "quote";

  /*
   * The non-refundable condition.
   *
   * Checked here as well as in the page, because the page is a courtesy and
   * this is the gate. A deposit taken without it is a deposit the customer can
   * fairly say they never agreed was non-refundable.
   */
  if (isDeposit && !acceptedTerms) {
    return problem(
      "Please confirm you understand the deposit is non-refundable before paying.",
      422,
    );
  }

  // ── The quote must be the current one ────────────────────────────────────
  if (isDeposit) {
    const { rows } = await query<{ status: string; id: string }>(
      `SELECT id, status FROM order_quotes WHERE id = ?`,
      [resolved.quoteId ?? ""],
    );

    const quote = rows[0];
    if (!quote || quote.status !== "active") {
      return problem(
        "This quote has been replaced by a newer one. Please use the most recent link we sent you.",
        409,
      );
    }
  }

  if (await hasSuccessfulPayment(resolved.orderId, isDeposit ? "deposit" : "balance")) {
    return problem(
      isDeposit
        ? "The deposit for this order has already been paid. Thank you."
        : "This balance has already been paid. Thank you.",
      409,
    );
  }

  // ── The amount, read from the database, now ──────────────────────────────
  const balance = await getBalance(resolved.orderId);

  let amountPence: number;
  if (isDeposit) {
    const { rows } = await query<{ deposit_amount_pence: number }>(
      `SELECT deposit_amount_pence FROM order_quotes WHERE id = ?`,
      [resolved.quoteId ?? ""],
    );
    amountPence = rows[0]?.deposit_amount_pence ?? 0;
  } else {
    amountPence = balance.outstandingPence;
  }

  if (amountPence <= 0) {
    return problem(
      isDeposit
        ? "There is nothing to pay on this quote."
        : "There is nothing left to pay on this order. Thank you.",
      422,
    );
  }

  // ── Stripe ───────────────────────────────────────────────────────────────
  try {
    const stripe = getStripe();
    const base = appBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "gbp",
      customer_email: order.customer_email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: amountPence,
            product_data: {
              name: isDeposit
                ? `Deposit — ${order.order_number}`
                : `Balance — ${order.order_number}`,
              description: isDeposit
                ? `Non-refundable deposit for your cake from ${business.name}.`
                : `Remaining balance for your cake from ${business.name}.`,
            },
          },
        },
      ],
      // Read back by the webhook to find the order. No personal data here:
      // this travels to Stripe and appears in their dashboard.
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        quote_id: resolved.quoteId ?? "",
        payment_type: isDeposit ? "deposit" : "balance",
      },
      success_url: `${base}/payment/success?type=${isDeposit ? "deposit" : "balance"}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: isDeposit
        ? `${base}/quote/${token}?payment=cancelled`
        : `${base}/pay/${token}?payment=cancelled`,
      // Sessions do not stay open indefinitely; a stale one should lapse
      // rather than sit waiting to charge an out-of-date amount.
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    await createPendingPayment({
      orderId: order.id,
      quoteId: resolved.quoteId,
      type: isDeposit ? "deposit" : "balance",
      amountPence,
      sessionId: session.id,
    });

    await recordActivity(
      order.id,
      isDeposit ? "deposit_checkout_created" : "balance_checkout_created",
      `${isDeposit ? "Deposit" : "Balance"} checkout created for ${formatPounds(amountPence)}.`,
      { amountPence },
    );

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("Checkout session failed:", error);
    return problem("Payment could not be started. Please try again.", 502);
  }
}
