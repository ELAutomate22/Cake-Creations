import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sanitiseText } from "@/lib/reviews/sanitise";
import { getOrder, recordActivity, setStatus } from "@/lib/admin/orders";
import { getSettings } from "@/lib/admin/settings";
import { sendOrderEmail } from "@/lib/email/resend";
import { declineEmail } from "@/lib/email/templates";

/**
 * Declining a request.
 *
 * The customer is told, so a reason is required rather than optional — a
 * request that goes quiet is worse for them than one that is turned down.
 *
 * The status is set whether or not the email got through. If sending fails the
 * response says so and the attempt is recorded, so the owner knows to follow
 * up; leaving the order sitting in "new request" because a mail server was
 * down would be a worse outcome than a declined order with a failed message
 * against it.
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

  if (order.status === "declined") {
    return NextResponse.json(
      { ok: false, message: "That request has already been declined." },
      { status: 422 },
    );
  }

  let reason = "";
  try {
    reason = sanitiseText(
      String(((await request.json()) as { reason?: string }).reason ?? ""),
    ).slice(0, 3000);
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  if (reason.length < 10) {
    return NextResponse.json(
      { ok: false, message: "Please write a short message for the customer." },
      { status: 422 },
    );
  }

  const settings = await getSettings();

  const email = declineEmail({
    customerName: order.customer_name,
    orderNumber: order.order_number,
    message: reason,
    footer: settings.email_footer,
    // Only details that have actually been filled in; the placeholders in the
    // settings table must never reach a customer.
    contactLines: [settings.business_phone, settings.business_email].filter(
      (line): line is string => typeof line === "string" && !line.startsWith("["),
    ),
  });

  const result = await sendOrderEmail({
    orderId: id,
    type: "decline",
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  // declined_at is stamped here; the 30-day retention counts from it.
  await setStatus(id, "declined");
  await recordActivity(id, "status_changed", "Request declined.", {
    from: order.status,
    to: "declined",
    emailSent: result.ok,
  });

  return NextResponse.json({
    ok: true,
    emailSent: result.ok,
    message: result.ok
      ? undefined
      : `The request was declined, but the email could not be sent: ${result.error}`,
  });
}
