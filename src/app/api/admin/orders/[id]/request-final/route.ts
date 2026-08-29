import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sanitiseText } from "@/lib/reviews/sanitise";
import {
  effectiveOrder,
  getConfirmed,
  getOrder,
  recordActivity,
  setStatus,
} from "@/lib/admin/orders";
import { getBalance } from "@/lib/admin/payments";
import { getSettings } from "@/lib/admin/settings";
import { createAccessToken, revokeTokens, BALANCE_TOKEN_DAYS } from "@/lib/orders/tokens";
import { appBaseUrl, isStripeConfigured } from "@/lib/stripe/client";
import { sendOrderEmail } from "@/lib/email/resend";
import { finalPaymentEmail } from "@/lib/email/templates";
import { formatPounds } from "@/lib/admin/money";

/**
 * Requesting the balance — Email 3.
 *
 * The amount is worked out here, from the database, at the moment of asking:
 * the current total minus every successful payment. It is not the figure on
 * the quote, because the total may have moved since the deposit was taken.
 *
 * Where nothing is outstanding, no payment link is created and the order moves
 * straight to paid in full. Sending someone a request for £0 would be a
 * mistake they would have to ring up about.
 *
 * Any previous balance link is revoked first, so an older email cannot be used
 * to pay a stale amount.
 */

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
  }

  let message = "";
  try {
    const body = (await request.json()) as { message?: string };
    message = sanitiseText(String(body.message ?? "")).slice(0, 3000);
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  const balance = await getBalance(id);

  /*
   * Nothing left to pay.
   *
   * Not an error: it is the correct end state for an order paid in advance or
   * quoted at exactly the deposit. The order is simply moved on.
   */
  if (balance.outstandingPence <= 0) {
    if (balance.paidPence > 0 && order.status !== "paid_in_full") {
      await setStatus(id, "paid_in_full");
      await recordActivity(
        id,
        "status_changed",
        "Nothing outstanding — order marked paid in full.",
      );
    }

    return NextResponse.json({
      ok: true,
      nothingOutstanding: true,
      message: "There is nothing outstanding on this order, so no request was sent.",
    });
  }

  // A superseded link must not remain usable alongside the new one.
  await revokeTokens(id, "balance");

  const token = await createAccessToken({
    orderId: id,
    purpose: "balance",
    days: BALANCE_TOKEN_DAYS,
  });

  const confirmed = await getConfirmed(id);
  const effective = effectiveOrder(order, confirmed);
  const settings = await getSettings();

  const email = finalPaymentEmail({
    customerName: order.customer_name,
    orderNumber: order.order_number,
    requiredDate: String(effective.required_date ?? ""),
    message,
    totalPence: balance.totalPence,
    paidPence: balance.paidPence,
    remainingBalancePence: balance.outstandingPence,
    collectionInformation:
      settings.collection_information && !settings.collection_information.startsWith("[")
        ? settings.collection_information
        : undefined,
    payBalanceUrl: isStripeConfigured() ? `${appBaseUrl()}/pay/${token}` : null,
    footer: settings.email_footer,
  });

  const result = await sendOrderEmail({
    orderId: id,
    type: "final_payment",
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (!result.ok) {
    await recordActivity(
      id,
      "final_payment_email_failed",
      `Final payment request failed to send: ${result.error}`,
    );

    return NextResponse.json(
      {
        ok: false,
        message: `The request could not be emailed: ${result.error}. The payment link is saved — use Retry once email is working.`,
      },
      { status: 502 },
    );
  }

  if (order.status !== "awaiting_final_payment") {
    await setStatus(id, "awaiting_final_payment");
  }

  await recordActivity(
    id,
    "final_payment_requested",
    `Final payment of ${formatPounds(balance.outstandingPence)} requested.`,
    { outstandingPence: balance.outstandingPence },
  );

  return NextResponse.json({ ok: true, outstandingPence: balance.outstandingPence });
}
