import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { query } from "@/lib/d1/client";
import { getOrder, recordActivity } from "@/lib/admin/orders";

/**
 * Deleting one quote version.
 *
 * A quote is a record of a figure a customer was given, so removing one is not
 * an edit — it is the destruction of evidence of what was agreed. The screen
 * asks before calling this, and this route is written on the assumption that
 * it will one day be called by mistake anyway.
 *
 * Two things are protected.
 *
 * A payment is never destroyed with the quote it was made against. Money that
 * moved is a fact, and it has to remain provable after the paperwork around it
 * is gone -- not least because Stripe's record of it certainly will.
 *
 * The schema already says so: payments.quote_id is ON DELETE SET NULL, and D1
 * does enforce foreign keys, so the detach would happen without this line.
 * It is written out anyway. A payment surviving its quote is a decision, not a
 * side effect of a clause three migrations away, and the day somebody edits
 * that clause this route should still be the thing that decides.
 *
 * Any link the customer holds to this quote stops working. Those tokens are
 * ON DELETE CASCADE, so they go with the quote; they are revoked first so that
 * the intent survives if the clause is ever loosened, and so the window
 * between the two statements is closed rather than open.
 *
 * The quote must belong to the order in the URL. Without that check an id
 * alone would be enough to delete any quote in the database from any order's
 * endpoint.
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

  let quoteId: string;
  try {
    const body = (await request.json()) as { quoteId?: unknown };
    quoteId = String(body.quoteId ?? "");
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  if (!quoteId) {
    return NextResponse.json(
      { ok: false, message: "No quote was named." },
      { status: 422 },
    );
  }

  // Scoped to this order on purpose. An id on its own must not be a key to
  // every quote in the database.
  const { rows } = await query<{ version: number; total_pence: number; status: string }>(
    `SELECT version, total_pence, status FROM order_quotes WHERE id = ? AND order_id = ?`,
    [quoteId, id],
  );

  const quote = rows[0];
  if (!quote) {
    return NextResponse.json(
      { ok: false, message: "That quote is not part of this order." },
      { status: 404 },
    );
  }

  try {
    // Payments first. If anything below fails, the worst outcome is a payment
    // whose quote is still there -- not a payment that has been deleted.
    const { rows: detached } = await query<{ count: number }>(
      `SELECT COUNT(*) AS count FROM payments WHERE quote_id = ?`,
      [quoteId],
    );
    await query(`UPDATE payments SET quote_id = NULL WHERE quote_id = ?`, [quoteId]);

    // Then any link the customer was given to it.
    const now = new Date().toISOString();
    await query(
      `UPDATE order_access_tokens SET revoked_at = ?
        WHERE quote_id = ? AND revoked_at IS NULL`,
      [now, quoteId],
    );

    await query(`DELETE FROM order_quotes WHERE id = ? AND order_id = ?`, [quoteId, id]);

    await recordActivity(
      id,
      "quote_deleted",
      `Quote v${quote.version} was permanently deleted.`,
      {
        version: quote.version,
        totalPence: quote.total_pence,
        status: quote.status,
        paymentsDetached: detached[0]?.count ?? 0,
      },
    );

    return NextResponse.json({
      ok: true,
      message: `Quote v${quote.version} deleted.`,
      paymentsKept: detached[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Quote delete failed:", error);
    return NextResponse.json(
      { ok: false, message: "That quote could not be deleted." },
      { status: 500 },
    );
  }
}
