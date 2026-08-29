import "server-only";
import { query } from "@/lib/d1/client";

/**
 * Sending email, through Resend.
 *
 * Called over HTTP rather than through the SDK: one POST with a JSON body is
 * the whole API surface this project needs, and a dependency that exists to
 * wrap a single fetch is a dependency to keep patched for no gain.
 *
 * The rule that matters most here is who a message can be sent to. The
 * recipient is never taken from the request. A caller names an order; this
 * module reads the address off that order in the database. A browser cannot
 * hand the server an address, so the endpoint cannot be turned into a way to
 * send mail to anyone.
 *
 * Every send is recorded in order_messages before it is attempted, so a
 * message that fails at the provider still leaves a trace rather than
 * disappearing.
 */

const API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const FROM_NAME = process.env.FROM_NAME ?? "Elshadai Cake Creations";

export function isEmailConfigured(): boolean {
  return Boolean(API_KEY && FROM_EMAIL);
}

export type MessageType =
  | "quote"
  | "deposit_confirmation"
  | "final_payment"
  | "custom"
  | "decline"
  | "cancellation";

export type SendResult = {
  ok: boolean;
  messageId: string | null;
  error?: string;
};

/**
 * Sends one message for one order, and records it.
 *
 * `orderId` decides the recipient. There is deliberately no way to pass an
 * address in.
 */
export async function sendOrderEmail({
  orderId,
  type,
  subject,
  html,
  text,
}: {
  orderId: string;
  type: MessageType;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  // The address comes from the order, never from the caller.
  const { rows } = await query<{ customer_email: string; customer_name: string }>(
    `SELECT customer_email, customer_name FROM orders WHERE id = ?`,
    [orderId],
  );

  const recipient = rows[0]?.customer_email;
  if (!recipient) {
    return { ok: false, messageId: null, error: "That order no longer exists." };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Recorded first, so a send that fails still leaves evidence of the attempt.
  await query(
    `INSERT INTO order_messages (
       id, order_id, message_type, recipient_email, subject, body,
       delivery_status, created_at
     ) VALUES (?,?,?,?,?,?,?,?)`,
    [id, orderId, type, recipient, subject, html, "pending", now],
  );

  if (!isEmailConfigured()) {
    await query(
      `UPDATE order_messages SET delivery_status = ? WHERE id = ?`,
      ["not_configured", id],
    );
    return {
      ok: false,
      messageId: null,
      error:
        "Email is not configured. Set RESEND_API_KEY and FROM_EMAIL to send messages.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [recipient],
        subject,
        html,
        text,
      }),
    });

    const body = (await response.json()) as { id?: string; message?: string };

    if (!response.ok) {
      await query(
        `UPDATE order_messages SET delivery_status = ? WHERE id = ?`,
        ["failed", id],
      );
      return {
        ok: false,
        messageId: null,
        error: body.message ?? `Resend returned HTTP ${response.status}`,
      };
    }

    await query(
      `UPDATE order_messages SET delivery_status = ?, provider_message_id = ?, sent_at = ? WHERE id = ?`,
      ["sent", body.id ?? null, new Date().toISOString(), id],
    );

    return { ok: true, messageId: body.id ?? null };
  } catch (error) {
    await query(`UPDATE order_messages SET delivery_status = ? WHERE id = ?`, [
      "failed",
      id,
    ]);
    return {
      ok: false,
      messageId: null,
      error: error instanceof Error ? error.message : "The message could not be sent.",
    };
  }
}
