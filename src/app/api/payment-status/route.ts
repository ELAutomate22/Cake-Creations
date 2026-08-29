import { NextResponse } from "next/server";
import { query } from "@/lib/d1/client";

/**
 * Has the webhook confirmed this payment yet?
 *
 * The success page polls this rather than asserting anything itself. It is
 * keyed on the Stripe session id, which the customer's own browser was given
 * in the return URL, and it answers with a status and nothing else — no
 * amounts, no customer details, no order reference. Someone guessing session
 * ids would learn only whether some payment somewhere had settled.
 */

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = new URL(request.url).searchParams.get("session");

  if (!session || session.length < 10) {
    return NextResponse.json({ ok: false, status: "unknown" }, { status: 400 });
  }

  const { rows } = await query<{ status: string; payment_type: string }>(
    `SELECT status, payment_type FROM payments WHERE stripe_checkout_session_id = ?`,
    [session],
  );

  const payment = rows[0];
  if (!payment) {
    // Genuinely possible for a moment: the browser can arrive back before the
    // webhook has been delivered. "Pending" is the honest answer.
    return NextResponse.json({ ok: true, status: "pending" });
  }

  return NextResponse.json({
    ok: true,
    status: payment.status,
    type: payment.payment_type,
  });
}
