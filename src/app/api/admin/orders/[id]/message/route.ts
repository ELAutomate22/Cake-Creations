import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sanitiseText } from "@/lib/reviews/sanitise";
import { getOrder, recordActivity } from "@/lib/admin/orders";
import { getSettings } from "@/lib/admin/settings";
import { sendOrderEmail } from "@/lib/email/resend";
import { customMessageEmail } from "@/lib/email/templates";

/**
 * A one-off message to the customer on an order.
 *
 * The request names an order and carries a subject and a body. It cannot carry
 * a recipient: the address is read from that order inside sendOrderEmail. That
 * is the whole reason this endpoint cannot be turned into an open relay, and
 * it is enforced by the shape of the function rather than by validation.
 *
 * Internal notes are not read here and are not passed to the template.
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

  let subject = "";
  let messageBody = "";
  try {
    const body = (await request.json()) as { subject?: string; message?: string };
    subject = sanitiseText(String(body.subject ?? "")).slice(0, 150);
    messageBody = sanitiseText(String(body.message ?? "")).slice(0, 5000);
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  if (subject.length < 3 || messageBody.length < 10) {
    return NextResponse.json(
      { ok: false, message: "Please give a subject and a message." },
      { status: 422 },
    );
  }

  const settings = await getSettings();

  const email = customMessageEmail({
    customerName: order.customer_name,
    orderNumber: order.order_number,
    subject,
    message: messageBody,
    footer: settings.email_footer,
    // Only details that have actually been filled in; the placeholders in the
    // settings table must never reach a customer.
    contactLines: [settings.business_phone, settings.business_email].filter(
      (line): line is string => typeof line === "string" && !line.startsWith("["),
    ),
  });

  const result = await sendOrderEmail({
    orderId: id,
    type: "custom",
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 502 });
  }

  await recordActivity(id, "custom_message_sent", `Custom message sent: ${subject}`, {
    subject,
  });

  return NextResponse.json({ ok: true });
}
