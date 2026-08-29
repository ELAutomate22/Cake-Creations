import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sanitiseText } from "@/lib/reviews/sanitise";
import {
  EDITABLE_FIELDS,
  getOrder,
  recordActivity,
  saveConfirmed,
  type EditableField,
} from "@/lib/admin/orders";

/**
 * Saving an admin edit to an order.
 *
 * Writes to order_confirmed only. What the customer sent stays exactly as they
 * sent it, so "they asked for vanilla" remains answerable after the owner has
 * changed the cake to chocolate.
 *
 * Internal notes are saved here too and are never read by anything that sends
 * email — no template takes them, and the send routes do not select them.
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  // Only known fields are taken. Anything else in the body is ignored rather
  // than trusted, so a crafted request cannot reach a column it should not.
  const values: Partial<Record<EditableField, string>> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      values[field] = sanitiseText(String(body[field] ?? ""));
    }
  }

  const notes =
    "internal_notes" in body ? sanitiseText(String(body.internal_notes ?? "")) : undefined;

  try {
    const changed = await saveConfirmed(id, order, values, notes);

    if (changed.length > 0) {
      await recordActivity(
        id,
        "order_updated",
        `Order details updated: ${changed.map((f) => f.replace(/_/g, " ")).join(", ")}.`,
        { fields: changed },
      );
    }

    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    console.error("Order save failed:", error);
    return NextResponse.json(
      { ok: false, message: "Those changes could not be saved." },
      { status: 500 },
    );
  }
}
