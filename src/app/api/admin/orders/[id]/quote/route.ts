import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { query } from "@/lib/d1/client";
import { sanitiseText } from "@/lib/reviews/sanitise";
import { calculateQuote } from "@/lib/admin/money";
import { CAKE_LINE_DESCRIPTION, MAX_CAKE_PRICE_PENCE } from "@/lib/admin/pricing";
import {
  getItems,
  getOrder,
  getQuotes,
  recordActivity,
  setCakePrice,
  setStatus,
} from "@/lib/admin/orders";

/**
 * Creating a quote.
 *
 * A quote is a snapshot. When one is saved it copies the priced line and every
 * total into its own row as JSON, so later edits to the working draft cannot
 * rewrite a figure the customer has already been shown. Versions count up and
 * a sent quote is never edited.
 *
 * Pricing is one figure — the price of the cake — with discount and delivery
 * as adjustments to it. The route writes that price before doing any
 * arithmetic, so there is no separate save to forget and no way for the stored
 * price and the quoted total to disagree.
 *
 * The client's numbers are never trusted as totals. It sends the four inputs
 * and the server recalculates everything from them with the same function the
 * screen used, so a tampered subtotal cannot become a quote.
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
    cakePricePence?: number;
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

  /*
   * The price of the cake.
   *
   * Sent with the quote rather than saved separately. When it is absent the
   * existing stored line is used, which keeps an older order quotable without
   * being re-priced first.
   */
  let cakePricePence: number;

  if (body.cakePricePence === undefined || body.cakePricePence === null) {
    const existingItems = await getItems(id);
    cakePricePence = existingItems.reduce((sum, item) => sum + item.amount_pence, 0);
  } else {
    cakePricePence = Math.round(Number(body.cakePricePence));
  }

  if (!Number.isFinite(cakePricePence) || cakePricePence <= 0) {
    return NextResponse.json(
      { ok: false, message: "Enter the price of the cake before saving a quote." },
      { status: 422 },
    );
  }

  if (cakePricePence > MAX_CAKE_PRICE_PENCE) {
    return NextResponse.json(
      { ok: false, message: "That price looks wrong. Check the decimal point." },
      { status: 422 },
    );
  }

  const totals = calculateQuote({
    items: [{ description: CAKE_LINE_DESCRIPTION, amountPence: cakePricePence }],
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
    // Written before the quote row, so the stored price and the quote that
    // was calculated from it can never disagree.
    await setCakePrice(id, cakePricePence);

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
        // than a pointer at a row that can still change underneath it.
        JSON.stringify([
          { description: CAKE_LINE_DESCRIPTION, amountPence: cakePricePence },
        ]),
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
