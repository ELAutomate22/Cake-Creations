import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sanitiseText } from "@/lib/reviews/sanitise";
import { getOrder, recordActivity, setStatus } from "@/lib/admin/orders";
import { paidPence } from "@/lib/admin/payments";

/**
 * Recording a refund that was made in Stripe.
 *
 * This does not refund anything. There is no button in this application that
 * moves money back to a customer, and there should not be: the deposit is
 * non-refundable by the policy the customer accepted, so a refund is an
 * exception someone has decided to make, and it belongs in Stripe where the
 * decision is deliberate and auditable.
 *
 * What this does is let the owner say "that has been refunded in Stripe" so
 * the two systems agree. It is careful not to claim more than that: the
 * payment rows keep their amounts, because they are a record of what happened
 * and the money genuinely was taken at the time.
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

  let note = "";
  try {
    note = sanitiseText(String(((await request.json()) as { note?: string }).note ?? "")).slice(0, 1000);
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  if (note.length < 5) {
    return NextResponse.json(
      { ok: false, message: "Please record why this was refunded and where." },
      { status: 422 },
    );
  }

  const paid = await paidPence(id);
  if (paid <= 0) {
    return NextResponse.json(
      { ok: false, message: "No payment was ever taken on this order." },
      { status: 422 },
    );
  }

  // refunded_at is stamped here, and the 30-day retention counts from it.
  await setStatus(id, "refunded");

  await recordActivity(
    id,
    "refund_recorded",
    `Refund recorded by the owner: ${note}`,
    { note },
  );

  return NextResponse.json({
    ok: true,
    message:
      "Recorded as refunded. The payment history is unchanged, because the money was taken at the time.",
  });
}
