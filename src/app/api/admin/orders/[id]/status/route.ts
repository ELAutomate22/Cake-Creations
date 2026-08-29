import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  getOrder,
  recordActivity,
  setStatus,
  type OrderStatus,
} from "@/lib/admin/orders";

/**
 * Changing an order's status.
 *
 * The move is checked against ALLOWED_TRANSITIONS on the server, not merely
 * hidden in the interface. A brand new request cannot be marked paid in full
 * however the request is made.
 *
 * deposit_paid and paid_in_full are absent from every hand-operated
 * transition: they mean money arrived, and only a verified payment event may
 * assert that. Phase 3 sets them.
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

  let next: string;
  try {
    next = String(((await request.json()) as { status?: string }).status ?? "");
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(next as OrderStatus)) {
    return NextResponse.json(
      {
        ok: false,
        message: `An order that is "${STATUS_LABELS[order.status]}" cannot move to that status.`,
      },
      { status: 422 },
    );
  }

  try {
    await setStatus(id, next as OrderStatus);
    await recordActivity(
      id,
      "status_changed",
      `Status changed from ${STATUS_LABELS[order.status]} to ${STATUS_LABELS[next as OrderStatus]}.`,
      { from: order.status, to: next },
    );
    return NextResponse.json({ ok: true, status: next });
  } catch (error) {
    console.error("Status change failed:", error);
    return NextResponse.json(
      { ok: false, message: "The status could not be changed." },
      { status: 500 },
    );
  }
}
