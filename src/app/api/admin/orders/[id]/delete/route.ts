import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getOrder } from "@/lib/admin/orders";
import { purgeOrder } from "@/lib/admin/purge";

/**
 * Deleting an order outright.
 *
 * This is the most destructive thing in the admin. It removes the customer's
 * request, the confirmed version of it, every quote, every message, the
 * activity log, the payment rows and the reference photographs from R2. None
 * of it comes back.
 *
 * It deliberately reuses the retention sweep's own function rather than
 * repeating the list of tables. There should be one answer to "what does
 * deleting an order remove", and two copies is how the nightly purge and this
 * button come to disagree about whether the photographs go with it.
 *
 * What is gone from here is not gone everywhere. Stripe keeps its own record
 * of any payment taken, under its own retention rules, and that record is what
 * a bank or a customer would be shown in a dispute. Deleting here removes this
 * business's copy of the paperwork, not the fact of the money.
 *
 * The screen asks before calling this where the money is recent. That guard is
 * on the screen because it is a question for a person; this route does not
 * second-guess an authenticated owner who has decided to delete their own
 * order. It only makes sure the order exists and that the caller is signed in.
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

  try {
    const { images } = await purgeOrder(id);

    // Nothing is written to the activity log: the log belonged to the order
    // and has gone with it. The server log is the only place left to say this
    // happened, so it says it plainly.
    console.warn(
      `Order ${order.order_number} was deleted from the admin (${images} image(s) removed).`,
    );

    return NextResponse.json({
      ok: true,
      message: `${order.order_number} was permanently deleted.`,
      imagesRemoved: images,
    });
  } catch (error) {
    console.error("Order delete failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "That order could not be deleted. Nothing has been removed — try again.",
      },
      { status: 500 },
    );
  }
}
