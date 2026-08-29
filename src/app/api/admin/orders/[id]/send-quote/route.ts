import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { query } from "@/lib/d1/client";
import {
  effectiveOrder,
  getConfirmed,
  getOrder,
  getQuotes,
  recordActivity,
  setStatus,
} from "@/lib/admin/orders";
import { FIELD_LABELS, EDITABLE_FIELDS } from "@/lib/admin/fields";
import { getSettings } from "@/lib/admin/settings";
import { createAccessToken, revokeTokens, QUOTE_TOKEN_DAYS } from "@/lib/orders/tokens";
import { appBaseUrl, isStripeConfigured } from "@/lib/stripe/client";
import { sendOrderEmail } from "@/lib/email/resend";
import { quoteEmail } from "@/lib/email/templates";

/**
 * Sending a quote — Email 1.
 *
 * The order of work is what makes this safe to press twice.
 *
 * The newest quote becomes the active one and every older quote is superseded,
 * with its link revoked, before the email goes out. A customer holding an old
 * link then cannot pay an out-of-date amount, which is the whole reason
 * supersession exists.
 *
 * A failed send does not invent a new quote version. The quote stays active
 * and its link stays valid, so pressing Retry sends the same quote again
 * rather than producing v3, v4, v5 as someone keeps trying.
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

  const quotes = await getQuotes(id);
  const latest = quotes[0];

  if (!latest) {
    return NextResponse.json(
      { ok: false, message: "Create a quote before sending one." },
      { status: 422 },
    );
  }

  if (latest.total_pence <= 0) {
    return NextResponse.json(
      { ok: false, message: "That quote comes to nothing. Add line items first." },
      { status: 422 },
    );
  }

  const now = new Date().toISOString();

  /*
   * Supersede everything older, and take their links out of use.
   *
   * Done before sending: if the email fails afterwards, the worst case is a
   * customer with no working link, who contacts the business. The reverse —
   * an old link left live alongside a new one — is two prices that both work.
   */
  await query(
    `UPDATE order_quotes SET status = 'superseded', superseded_at = ?
       WHERE order_id = ? AND id != ? AND status IN ('draft', 'active')`,
    [now, id, latest.id],
  );

  await revokeTokens(id, "quote");

  await query(`UPDATE order_quotes SET status = 'active' WHERE id = ?`, [latest.id]);

  const superseded = quotes.filter(
    (quote) => quote.id !== latest.id && ["draft", "active"].includes(quote.status),
  );

  for (const quote of superseded) {
    await recordActivity(
      id,
      "quote_superseded",
      `Quote v${quote.version} superseded by v${latest.version}.`,
      { version: quote.version },
    );
  }

  // The raw token exists here and in the email, and nowhere else.
  const token = await createAccessToken({
    orderId: id,
    quoteId: latest.id,
    purpose: "quote",
    days: QUOTE_TOKEN_DAYS,
  });

  const quoteUrl = `${appBaseUrl()}/quote/${token}`;

  const confirmed = await getConfirmed(id);
  const effective = effectiveOrder(order, confirmed);
  const settings = await getSettings();

  const summaryFields: (typeof EDITABLE_FIELDS)[number][] = [
    "cake_style",
    "servings",
    "flavour",
    "theme",
    "colours",
    "cake_name_text",
    "fulfilment_type",
  ];

  const email = quoteEmail({
    customerName: order.customer_name,
    orderNumber: order.order_number,
    requiredDate: String(effective.required_date ?? ""),
    cakeSummary: summaryFields
      .filter((field) => effective[field])
      .map((field) => ({ label: FIELD_LABELS[field], value: String(effective[field]) })),
    items: latest.items_json
      ? (JSON.parse(latest.items_json) as { description: string; amountPence: number }[])
      : [],
    subtotalPence: latest.subtotal_pence,
    discountPence: latest.discount_pence,
    deliveryFeePence: latest.delivery_fee_pence,
    totalPence: latest.total_pence,
    depositPercentage: latest.deposit_percentage,
    depositAmountPence: latest.deposit_amount_pence,
    remainingBalancePence: latest.remaining_balance_pence,
    message: latest.admin_message ?? "",
    footer: settings.email_footer,
    contactLines: [settings.business_phone, settings.business_email].filter(
      (line): line is string => typeof line === "string" && !line.startsWith("["),
    ),
    quoteUrl,
    // Without Stripe the page still works and explains that payment will be
    // arranged directly, rather than showing a button that leads nowhere.
    paymentEnabled: isStripeConfigured(),
  });

  const result = await sendOrderEmail({
    orderId: id,
    type: "quote",
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (!result.ok) {
    await recordActivity(
      id,
      "quote_email_failed",
      `Quote v${latest.version} email failed: ${result.error}`,
    );

    return NextResponse.json(
      {
        ok: false,
        message: `The quote could not be emailed: ${result.error}. The quote and its link are saved — use Retry once email is working.`,
      },
      { status: 502 },
    );
  }

  await query(`UPDATE order_quotes SET sent_at = ? WHERE id = ?`, [now, latest.id]);
  await setStatus(id, "awaiting_deposit");

  await recordActivity(
    id,
    "quote_sent",
    `Quote v${latest.version} sent to the customer.`,
    { version: latest.version },
  );

  return NextResponse.json({ ok: true, version: latest.version });
}
