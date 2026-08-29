import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { query } from "@/lib/d1/client";
import { sanitiseText } from "@/lib/reviews/sanitise";
import { getOrder, recordActivity } from "@/lib/admin/orders";

/**
 * The working line items for an order.
 *
 * Replaced wholesale on each save rather than diffed: the list is short, the
 * owner reorders freely, and rewriting it is simpler to reason about than
 * tracking which row moved where.
 *
 * These are the editable draft. A quote that has been sent keeps its own
 * frozen copy, so editing here never rewrites what a customer was given.
 */

export const runtime = "nodejs";

type Incoming = { description?: unknown; amountPence?: unknown };

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

  let items: Incoming[];
  try {
    items = ((await request.json()) as { items?: Incoming[] }).items ?? [];
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  if (items.length > 40) {
    return NextResponse.json(
      { ok: false, message: "That is more line items than an order should need." },
      { status: 422 },
    );
  }

  const cleaned = items
    .map((item) => ({
      description: sanitiseText(String(item.description ?? "")).slice(0, 200),
      amountPence: Math.round(Number(item.amountPence)),
    }))
    .filter(
      (item) => item.description.length > 0 && Number.isFinite(item.amountPence),
    );

  const now = new Date().toISOString();

  try {
    await query(`DELETE FROM order_items WHERE order_id = ?`, [id]);

    for (const [index, item] of cleaned.entries()) {
      await query(
        `INSERT INTO order_items (id, order_id, description, amount_pence, sort_order, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), id, item.description, item.amountPence, index, now, now],
      );
    }

    await recordActivity(id, "pricing_updated", "Pricing line items updated.", {
      count: cleaned.length,
    });

    return NextResponse.json({ ok: true, items: cleaned });
  } catch (error) {
    console.error("Line item save failed:", error);
    return NextResponse.json(
      { ok: false, message: "Those line items could not be saved." },
      { status: 500 },
    );
  }
}
