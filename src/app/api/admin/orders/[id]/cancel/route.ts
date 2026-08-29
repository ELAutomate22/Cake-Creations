import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { query } from "@/lib/d1/client";
import { sanitiseText } from "@/lib/reviews/sanitise";
import { getOrder, recordActivity, setStatus } from "@/lib/admin/orders";
import { getSettings } from "@/lib/admin/settings";
import { sendOrderEmail } from "@/lib/email/resend";
import { cancellationEmail } from "@/lib/email/templates";

/**
 * Cancelling an order.
 *
 * There is deliberately no refund here, and no call to any payment provider.
 * The policy the customer accepted says a paid deposit is not refundable, and
 * a refund is a decision with money attached that the owner should make
 * deliberately, in Stripe, not as a side effect of clicking Cancel.
 *
 * Where a deposit has been taken, the cancellation email repeats that the
 * deposit is non-refundable. Being told at the moment of cancellation is the
 * point at which it matters.
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

  if (order.status === "cancelled") {
    return NextResponse.json(
      { ok: false, message: "That order is already cancelled." },
      { status: 422 },
    );
  }

  let reason = "";
  let notify = true;
  try {
    const body = (await request.json()) as { reason?: string; notify?: boolean };
    reason = sanitiseText(String(body.reason ?? "")).slice(0, 3000);
    notify = body.notify !== false;
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  if (reason.length < 5) {
    return NextResponse.json(
      { ok: false, message: "Please give a reason for the cancellation." },
      { status: 422 },
    );
  }

  // Whether money has actually been taken, from the payments table rather than
  // from the status — the status is a label, a paid row is a fact.
  const { rows: paid } = await query<{ total: number }>(
    `SELECT COALESCE(SUM(amount_pence), 0) AS total
       FROM payments WHERE order_id = ? AND status = 'paid'`,
    [id],
  );
  const depositWasPaid = (paid[0]?.total ?? 0) > 0;

  let emailSent = false;
  let emailError: string | undefined;

  if (notify) {
    const settings = await getSettings();
    const email = cancellationEmail({
      customerName: order.customer_name,
      orderNumber: order.order_number,
      message: reason,
      depositWasPaid,
      footer: settings.email_footer,
    });

    const result = await sendOrderEmail({
      orderId: id,
      type: "cancellation",
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    emailSent = result.ok;
    emailError = result.error;
  }

  await setStatus(id, "cancelled");
  await recordActivity(id, "status_changed", `Order cancelled. ${reason}`, {
    from: order.status,
    to: "cancelled",
    depositWasPaid,
    emailSent,
  });

  return NextResponse.json({
    ok: true,
    depositWasPaid,
    emailSent,
    message:
      notify && !emailSent
        ? `The order was cancelled, but the email could not be sent: ${emailError}`
        : undefined,
  });
}
