import type { Metadata } from "next";
import { business } from "@/content/site";
import { resolveToken } from "@/lib/orders/tokens";
import { getOrder } from "@/lib/admin/orders";
import { getBalance } from "@/lib/admin/payments";
import { formatPounds } from "@/lib/admin/money";
import { isStripeConfigured } from "@/lib/stripe/client";
import { PayButton } from "@/components/payments/PayButton";
import { LinkExpired } from "@/components/payments/LinkExpired";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pay your balance",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The balance payment page.
 *
 * The amount is recalculated here, on every load, from the current total minus
 * everything successfully paid. That is why an old link cannot charge a stale
 * figure: the link identifies the order, and nothing else.
 *
 * No acceptance checkbox. The non-refundable condition applies to the deposit,
 * which was accepted before it was paid; asking again for the balance would be
 * asking the customer to agree to something that does not apply.
 */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { token } = await params;
  const { payment } = await searchParams;

  const resolved = await resolveToken(token);
  if (!resolved || resolved.purpose !== "balance") return <LinkExpired />;

  const order = await getOrder(resolved.orderId);
  if (!order) return <LinkExpired />;

  const balance = await getBalance(order.id);
  const settled = balance.outstandingPence <= 0;

  return (
    <main className="min-h-screen bg-ivory py-14 sm:py-20">
      <div className="shell max-w-2xl">
        <header className="text-center">
          <p className="eyebrow text-cocoa-soft">{business.name}</p>
          <h1 className="display-sm mt-4 text-espresso">Your remaining balance</h1>
          <p className="mt-3 text-sm text-cocoa-soft">Reference {order.order_number}</p>
        </header>

        {payment === "cancelled" && (
          <p className="mt-8 border border-caramel/40 bg-caramel/10 px-5 py-4 text-sm text-espresso">
            Your payment was cancelled and nothing has been charged.
          </p>
        )}

        <p className="mt-8 text-cocoa">Dear {order.customer_name},</p>

        <table className="mt-6 w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-espresso/10">
              <td className="py-3 text-cocoa">Total</td>
              <td className="py-3 text-right text-cocoa">
                {formatPounds(balance.totalPence)}
              </td>
            </tr>
            <tr className="border-b border-espresso/10">
              <td className="py-3 text-cocoa">Already paid</td>
              <td className="py-3 text-right text-cocoa">
                {formatPounds(balance.paidPence)}
              </td>
            </tr>
            <tr className="border-b-2 border-espresso">
              <td className="py-3 text-espresso">Remaining balance</td>
              <td className="py-3 text-right font-serif text-lg text-espresso">
                {formatPounds(balance.outstandingPence)}
              </td>
            </tr>
          </tbody>
        </table>

        <PayButton
          token={token}
          label={`Pay remaining balance — ${formatPounds(balance.outstandingPence)}`}
          requireAcceptance={false}
          disabled={settled || !isStripeConfigured()}
          disabledReason={
            settled
              ? "There is nothing left to pay on this order. Thank you."
              : "Card payment is not available yet. We will be in touch to arrange payment."
          }
        />

        <p className="mt-12 border-t border-espresso/10 pt-6 text-xs text-cocoa-soft">
          This link is personal to your order. Please do not share it.
        </p>
      </div>
    </main>
  );
}
