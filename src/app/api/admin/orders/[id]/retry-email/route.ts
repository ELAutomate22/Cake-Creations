import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { query } from "@/lib/d1/client";
import { getOrder, recordActivity } from "@/lib/admin/orders";
import { sendOrderEmail, type MessageType } from "@/lib/email/resend";

/**
 * Resending a message that failed.
 *
 * A real payment is never undone because email failed, so a deposit
 * confirmation that could not be sent leaves an order that is genuinely paid
 * and a customer who has not been told. This is how the owner tells them.
 *
 * It resends the stored message exactly as it was composed. It does not
 * rebuild it, and so it cannot create a quote version, a payment, a token, or
 * any other side effect — retrying is only ever another attempt at delivery.
 *
 * Only a message that has not been delivered can be retried, so pressing it
 * twice on a message that has since gone out cannot send a customer a
 * duplicate.
 */

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!(await getOrder(id))) {
    return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
  }

  let messageId = "";
  try {
    messageId = String(((await request.json()) as { messageId?: string }).messageId ?? "");
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  // Both ids must match, so a message id alone cannot reach another order.
  const { rows } = await query<{
    id: string;
    message_type: MessageType;
    subject: string;
    body: string;
    delivery_status: string;
  }>(
    `SELECT id, message_type, subject, body, delivery_status
       FROM order_messages WHERE id = ? AND order_id = ?`,
    [messageId, id],
  );

  const original = rows[0];
  if (!original) {
    return NextResponse.json({ ok: false, message: "Message not found." }, { status: 404 });
  }

  if (original.delivery_status === "sent") {
    return NextResponse.json(
      { ok: false, message: "That message was already delivered." },
      { status: 422 },
    );
  }

  /*
   * The plain-text version is not stored, so it is derived from the HTML.
   *
   * Crude, and deliberately so: this is the fallback body for clients that
   * refuse HTML, and reconstructing the original template here would mean
   * regenerating a quote whose figures may since have moved. What was sent is
   * what gets sent again.
   */
  const text = original.body
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const result = await sendOrderEmail({
    orderId: id,
    type: original.message_type,
    subject: original.subject,
    html: original.body,
    text,
  });

  await recordActivity(
    id,
    result.ok ? "email_retry_sent" : "email_retry_failed",
    result.ok
      ? `Resent: ${original.subject}`
      : `Retry failed for "${original.subject}": ${result.error}`,
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "Message resent." });
}
