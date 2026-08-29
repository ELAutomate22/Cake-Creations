import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { query } from "@/lib/d1/client";
import { sanitiseText } from "@/lib/reviews/sanitise";
import { calculateQuote } from "@/lib/admin/money";
import {
  getItems,
  getOrder,
  getQuotes,
  recordActivity,
  setStatus,
} from "@/lib/admin/orders";

/**
 * Creating a quote.
 *
 * A quote is a snapshot. When one is saved it copies the line items and every
 * total into its own row as JSON, so later edits to the working draft cannot
 * rewrite a figure the customer has already been shown. Versions count up and
 * a sent quote is never edited.
 *
 * Sending is not implemented here on purpose. The quote email carries a "Pay
 * deposit" button, and there is no payment URL until Stripe exists in Phase 3.
 * A quote that arrives with a button leading nowhere is worse than one that
 * has not been sent, so the route saves the version and leaves sending to
 * Phase 3.
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

  let body: {
    discountPence?: number;
    deliveryFeePence?: number;
    depositPercentage?: number;
    depositFixedPence?: number | null;
    message?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  const items = await getItems(id);
  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Add at least one line item before creating a quote." },
      { status: 422 },
    );
  }

  const totals = calculateQuote({
    items: items.map((item) => ({
      description: item.description,
      amountPence: item.amount_pence,
    })),
    discountPence: Math.max(0, Math.round(Number(body.discountPence) || 0)),
    deliveryFeePence: Math.max(0, Math.round(Number(body.deliveryFeePence) || 0)),
    depositPercentage: Number(body.depositPercentage ?? 50),
    depositFixedPence:
      body.depositFixedPence === null || body.depositFixedPence === undefined
        ? null
        : Math.round(Number(body.depositFixedPence)),
  });

  const existing = await getQuotes(id);
  const version = (existing[0]?.version ?? 0) + 1;
  const now = new Date().toISOString();

  try {
    await query(
      `INSERT INTO order_quotes (
         id, order_id, version, subtotal_pence, discount_pence, delivery_fee_pence,
         total_pence, deposit_percentage, deposit_amount_pence, remaining_balance_pence,
         admin_message, items_json, status, deposit_is_fixed, created_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        crypto.randomUUID(),
        id,
        version,
        totals.subtotalPence,
        totals.discountPence,
        totals.deliveryFeePence,
        totals.totalPence,
        totals.depositPercentage,
        totals.depositAmountPence,
        totals.remainingBalancePence,
        sanitiseText(String(body.message ?? "")),
        // The frozen copy. This is what makes the version a snapshot rather
        // than a pointer at rows that can still change underneath it.
        JSON.stringify(
          items.map((item) => ({
            description: item.description,
            amountPence: item.amount_pence,
          })),
        ),
        "draft",
        body.depositFixedPence === null || body.depositFixedPence === undefined ? 0 : 1,
        now,
      ],
    );

    await recordActivity(
      id,
      version === 1 ? "quote_created" : "quote_changed",
      `Quote v${version} created — total ${(totals.totalPence / 100).toFixed(2)}.`,
      { version, totalPence: totals.totalPence },
    );

    // Ready to send, not sent. The status says the quote exists; it does not
    // claim the customer has it.
    if (order.status === "new_request" || order.status === "reviewing") {
      await setStatus(id, "quote_ready");
      await recordActivity(id, "status_changed", "Status changed to Quote ready.", {
        from: order.status,
        to: "quote_ready",
      });
    }

    return NextResponse.json({ ok: true, version, totals });
  } catch (error) {
    console.error("Quote save failed:", error);
    return NextResponse.json(
      { ok: false, message: "That quote could not be saved." },
      { status: 500 },
    );
  }
}
