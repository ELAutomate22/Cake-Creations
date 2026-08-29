import type Stripe from "stripe";
import { query } from "@/lib/d1/client";
import { getOrder, recordActivity, setStatus } from "@/lib/admin/orders";
import { getBalance } from "@/lib/admin/payments";
import { getSettings } from "@/lib/admin/settings";
import { getStripe } from "@/lib/stripe/client";
import { sendOrderEmail } from "@/lib/email/resend";
import { depositConfirmationEmail } from "@/lib/email/templates";
import { formatPounds } from "@/lib/admin/money";
import { revokeTokens } from "@/lib/orders/tokens";

/**
 * Stripe webhooks.
 *
 * This is the only place in the application allowed to record that money
 * arrived. The success page cannot: a customer reaching it proves they were
 * redirected, not that a card was charged, and the URL can be visited by hand.
 *
 * Three things this endpoint has to get right.
 *
 * The signature. The body is read raw and verified against the signing secret
 * before it is parsed. Without that, anyone who finds this URL can post JSON
 * claiming an order is paid.
 *
 * Idempotency. Stripe redelivers an event whenever it is unsure the first
 * attempt landed. The event id is inserted as a primary key before any work
 * happens, so a duplicate fails that insert and returns without paying the
 * order twice or sending a second confirmation email.
 *
 * Not rolling back real money. Once a payment is recorded, a later failure —
 * an email that will not send, most likely — is logged and surfaced to the
 * owner. It never reverses the payment.
 */

export const runtime = "nodejs";
// The signature is computed over the exact bytes Stripe sent. Anything that
// re-serialises the body invalidates it.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set; refusing webhooks.");
    return new Response("Not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("No signature", { status: 400 });

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (error) {
    // An invalid signature is the expected shape of an attack, so it is not
    // treated as a server problem.
    console.error("Webhook signature rejected:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  /*
   * ── Idempotency ─────────────────────────────────────────────────────────
   *
   * The insert is the lock: a redelivered event collides on the primary key
   * and is ignored. The one case that must still get through is a previous
   * attempt that failed — Stripe retries those, and the retry is the point.
   * So a row left in `failed` is claimed back rather than treated as done.
   */
  const claimedAt = new Date().toISOString();

  await query(
    `INSERT OR IGNORE INTO stripe_events (event_id, event_type, status, received_at)
       VALUES (?,?,?,?)`,
    [event.id, event.type, "processing", claimedAt],
  );

  const { rows: seen } = await query<{ status: string }>(
    `SELECT status FROM stripe_events WHERE event_id = ?`,
    [event.id],
  );

  const previous = seen[0]?.status;

  if (previous === "processed" || previous === "ignored") {
    // Already dealt with. Acknowledge so Stripe stops retrying.
    return Response.json({ received: true, duplicate: true });
  }

  if (previous === "failed") {
    await query(
      `UPDATE stripe_events SET status = 'processing', error_message = NULL, received_at = ?
         WHERE event_id = ?`,
      [claimedAt, event.id],
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCompletedCheckout(event.data.object as Stripe.Checkout.Session);
    } else {
      await query(
        `UPDATE stripe_events SET status = 'ignored', processed_at = ? WHERE event_id = ?`,
        [new Date().toISOString(), event.id],
      );
      return Response.json({ received: true, ignored: true });
    }

    await query(
      `UPDATE stripe_events SET status = 'processed', processed_at = ? WHERE event_id = ?`,
      [new Date().toISOString(), event.id],
    );

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Webhook processing failed:", message);

    await query(
      `UPDATE stripe_events SET status = 'failed', error_message = ?, processed_at = ?
         WHERE event_id = ?`,
      [message.slice(0, 500), new Date().toISOString(), event.id],
    );

    // 500 so Stripe retries. The row stays, marked failed, which is both the
    // record of what went wrong and the signal that the retry may proceed.
    return new Response("Processing failed", { status: 500 });
  }
}

async function handleCompletedCheckout(session: Stripe.Checkout.Session) {
  /*
   * Completed is not the same as paid.
   *
   * A session can complete while payment is still processing — some payment
   * methods settle later. Recording it as paid at that point would tell the
   * owner money had arrived when it had not.
   */
  if (session.payment_status !== "paid") return;

  const orderId = session.metadata?.order_id;
  const paymentType = session.metadata?.payment_type as "deposit" | "balance" | undefined;

  if (!orderId || !paymentType) {
    throw new Error("Checkout session carried no order metadata.");
  }

  const order = await getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} no longer exists.`);

  // The pending row created when Checkout was opened.
  const { rows } = await query<{ id: string; amount_pence: number; status: string }>(
    `SELECT id, amount_pence, status FROM payments
       WHERE stripe_checkout_session_id = ?`,
    [session.id],
  );

  const payment = rows[0];
  if (!payment) throw new Error(`No payment record for session ${session.id}.`);

  // Already recorded by an earlier delivery of this same session.
  if (payment.status === "paid") return;

  /*
   * The amount actually taken, from Stripe.
   *
   * Recorded in preference to what was expected. If they ever disagree, what
   * the customer was actually charged is the fact worth keeping, and the
   * mismatch is written into the activity log rather than quietly ignored.
   */
  const amountPaid = session.amount_total ?? payment.amount_pence;
  const now = new Date().toISOString();

  await query(
    `UPDATE payments SET status = 'paid', amount_pence = ?, paid_at = ?,
       stripe_payment_intent_id = ?, updated_at = ? WHERE id = ?`,
    [
      amountPaid,
      now,
      typeof session.payment_intent === "string" ? session.payment_intent : null,
      now,
      payment.id,
    ],
  );

  if (amountPaid !== payment.amount_pence) {
    await recordActivity(
      orderId,
      "payment_amount_mismatch",
      `Amount taken (${formatPounds(amountPaid)}) differed from the amount expected (${formatPounds(payment.amount_pence)}).`,
      { expected: payment.amount_pence, taken: amountPaid },
    );
  }

  if (paymentType === "deposit") {
    await handleDepositPaid(orderId, session, amountPaid);
  } else {
    await handleBalancePaid(orderId, amountPaid);
  }
}

async function handleDepositPaid(
  orderId: string,
  session: Stripe.Checkout.Session,
  amountPaid: number,
) {
  const quoteId = session.metadata?.quote_id;

  if (quoteId) {
    await query(`UPDATE order_quotes SET status = 'paid' WHERE id = ?`, [quoteId]);
  }

  await setStatus(orderId, "deposit_paid");

  // The quote has done its job; its link should not stay live.
  await revokeTokens(orderId, "quote");

  await recordActivity(
    orderId,
    "deposit_paid",
    `Deposit of ${formatPounds(amountPaid)} paid. This deposit is non-refundable.`,
    { amountPence: amountPaid },
  );

  /*
   * Email 2, and the rule around it.
   *
   * The payment is already recorded above. If this fails, it is logged and the
   * owner is shown a retry — the money stays paid and the order stays
   * confirmed. A real payment is never undone because a mail server was down.
   */
  const order = await getOrder(orderId);
  if (!order) return;

  const balance = await getBalance(orderId);
  const settings = await getSettings();

  const email = depositConfirmationEmail({
    customerName: order.customer_name,
    orderNumber: order.order_number,
    requiredDate: String(order.required_date),
    totalPence: balance.totalPence,
    depositPaidPence: amountPaid,
    remainingBalancePence: balance.outstandingPence,
    footer: settings.email_footer,
  });

  const result = await sendOrderEmail({
    orderId,
    type: "deposit_confirmation",
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  await recordActivity(
    orderId,
    result.ok ? "deposit_email_sent" : "deposit_email_failed",
    result.ok
      ? "Deposit confirmation email sent."
      : `Deposit confirmation email failed: ${result.error}`,
  );
}

async function handleBalancePaid(orderId: string, amountPaid: number) {
  const balance = await getBalance(orderId);

  await recordActivity(
    orderId,
    "balance_paid",
    `Balance of ${formatPounds(amountPaid)} paid.`,
    { amountPence: amountPaid },
  );

  if (balance.outstandingPence <= 0) {
    await setStatus(orderId, "paid_in_full");
    await revokeTokens(orderId, "balance");
    await recordActivity(orderId, "status_changed", "Order is paid in full.");
  }

  /*
   * No email here, deliberately.
   *
   * There are exactly three automated emails, and this is not one of them. The
   * customer sees confirmation on the success page, and Stripe sends its own
   * receipt if the account is configured to.
   */
}
