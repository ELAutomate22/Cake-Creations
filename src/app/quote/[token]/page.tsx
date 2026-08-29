import type { Metadata } from "next";
import { business } from "@/content/site";
import { query } from "@/lib/d1/client";
import { resolveToken } from "@/lib/orders/tokens";
import { effectiveOrder, getConfirmed, getOrder } from "@/lib/admin/orders";
import { EDITABLE_FIELDS, FIELD_LABELS } from "@/lib/admin/fields";
import { formatPounds } from "@/lib/admin/money";
import { getBalance } from "@/lib/admin/payments";
import { isStripeConfigured } from "@/lib/stripe/client";
import { DEPOSIT_NOTICE } from "@/lib/email/templates";
import { PayButton } from "@/components/payments/PayButton";
import { LinkExpired } from "@/components/payments/LinkExpired";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your quote",
  // Never indexed. The link is a secret, and a search engine that follows it
  // would put a customer's quote in a public index.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The customer's quote.
 *
 * Reached only through the secure link in Email 1. The token in the URL is
 * hashed and looked up; an unknown, revoked or expired one shows the same
 * message, because distinguishing them would tell a stranger whether a given
 * token ever existed.
 *
 * What is shown is deliberately narrow: the cake, the money, and the owner's
 * message. Internal notes, the activity log, admin metadata, database ids and
 * R2 keys are all absent — this page is built from a small set of named
 * fields rather than by handing the order object to a template.
 */
export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { token } = await params;
  const { payment } = await searchParams;

  const resolved = await resolveToken(token);
  if (!resolved || resolved.purpose !== "quote" || !resolved.quoteId) {
    return <LinkExpired />;
  }

  const [order, quoteRows] = await Promise.all([
    getOrder(resolved.orderId),
    query<{
      id: string;
      version: number;
      status: string;
      subtotal_pence: number;
      discount_pence: number;
      delivery_fee_pence: number;
      total_pence: number;
      deposit_percentage: number;
      deposit_amount_pence: number;
      remaining_balance_pence: number;
      admin_message: string | null;
      items_json: string | null;
    }>(`SELECT * FROM order_quotes WHERE id = ?`, [resolved.quoteId]),
  ]);

  const quote = quoteRows.rows[0];
  if (!order || !quote) return <LinkExpired />;

  const confirmed = await getConfirmed(order.id);
  const effective = effectiveOrder(order, confirmed);
  const balance = await getBalance(order.id);

  const items = quote.items_json
    ? (JSON.parse(quote.items_json) as { description: string; amountPence: number }[])
    : [];

  const summaryFields = [
    "cake_style",
    "servings",
    "flavour",
    "theme",
    "colours",
    "cake_name_text",
    "age_number",
    "cake_message",
  ] as const satisfies readonly (typeof EDITABLE_FIELDS)[number][];

  const alreadyPaid = balance.hasPaidDeposit;
  const superseded = quote.status === "superseded";
  const notActive = quote.status !== "active" && !alreadyPaid && !superseded;

  return (
    <main className="min-h-screen bg-ivory py-14 sm:py-20">
      <div className="shell max-w-3xl">
        <header className="text-center">
          <p className="eyebrow text-cocoa-soft">{business.name}</p>
          <h1 className="display-sm mt-4 text-espresso">Your quote</h1>
          <p className="mt-3 text-sm text-cocoa-soft">
            Reference {order.order_number}
          </p>
        </header>

        {payment === "cancelled" && (
          <p className="mt-8 border border-caramel/40 bg-caramel/10 px-5 py-4 text-sm text-espresso">
            Your payment was cancelled and nothing has been charged. You can pay
            whenever you are ready.
          </p>
        )}

        {alreadyPaid && (
          <p className="mt-8 border border-success/30 bg-success/5 px-5 py-4 text-sm text-success">
            Your deposit has been received and your order is confirmed. Thank you.
          </p>
        )}

        {superseded && (
          <p className="mt-8 border border-caramel/40 bg-caramel/10 px-5 py-4 text-sm text-espresso">
            This quote has been replaced by a newer one. Please use the most recent
            link we sent you, or get in touch and we will resend it.
          </p>
        )}

        <p className="mt-8 text-cocoa">Dear {order.customer_name},</p>

        {quote.admin_message && (
          <div className="voice mt-4 whitespace-pre-wrap text-cocoa">
            {quote.admin_message}
          </div>
        )}

        {/* ── The cake ─────────────────────────────────────────────────── */}
        <h2 className="font-serif mt-10 text-xl text-espresso">Your cake</h2>
        <dl className="mt-4 border-t border-espresso/12">
          <div className="flex flex-wrap gap-x-6 border-b border-espresso/10 py-3">
            <dt className="w-full text-[0.625rem] uppercase tracking-[0.18em] text-cocoa-soft sm:w-48">
              Date required
            </dt>
            <dd className="text-cocoa sm:flex-1">
              {String(effective.required_date ?? "")}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-6 border-b border-espresso/10 py-3">
            <dt className="w-full text-[0.625rem] uppercase tracking-[0.18em] text-cocoa-soft sm:w-48">
              Collection or delivery
            </dt>
            <dd className="capitalize text-cocoa sm:flex-1">
              {String(effective.fulfilment_type ?? "")}
            </dd>
          </div>
          {summaryFields
            .filter((field) => effective[field])
            .map((field) => (
              <div
                key={field}
                className="flex flex-wrap gap-x-6 border-b border-espresso/10 py-3"
              >
                <dt className="w-full text-[0.625rem] uppercase tracking-[0.18em] text-cocoa-soft sm:w-48">
                  {FIELD_LABELS[field]}
                </dt>
                <dd className="whitespace-pre-wrap text-cocoa sm:flex-1">
                  {String(effective[field])}
                </dd>
              </div>
            ))}
        </dl>

        {/* ── The money ────────────────────────────────────────────────── */}
        <h2 className="font-serif mt-10 text-xl text-espresso">Your quote</h2>
        <table className="mt-4 w-full border-collapse text-sm">
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-espresso/10">
                <td className="py-3 text-cocoa">{item.description}</td>
                <td className="py-3 text-right text-cocoa">
                  {formatPounds(item.amountPence)}
                </td>
              </tr>
            ))}
            {quote.discount_pence > 0 && (
              <tr className="border-b border-espresso/10">
                <td className="py-3 text-cocoa">Discount</td>
                <td className="py-3 text-right text-cocoa">
                  −{formatPounds(quote.discount_pence)}
                </td>
              </tr>
            )}
            {quote.delivery_fee_pence > 0 && (
              <tr className="border-b border-espresso/10">
                <td className="py-3 text-cocoa">Delivery</td>
                <td className="py-3 text-right text-cocoa">
                  {formatPounds(quote.delivery_fee_pence)}
                </td>
              </tr>
            )}
            <tr className="border-b-2 border-espresso">
              <td className="py-3 text-espresso">Total</td>
              <td className="py-3 text-right font-serif text-lg text-espresso">
                {formatPounds(quote.total_pence)}
              </td>
            </tr>
            <tr className="border-b border-espresso/10">
              <td className="py-3 text-cocoa">
                Deposit ({quote.deposit_percentage}%)
              </td>
              <td className="py-3 text-right text-cocoa">
                {formatPounds(quote.deposit_amount_pence)}
              </td>
            </tr>
            <tr>
              <td className="py-3 text-cocoa">Remaining balance</td>
              <td className="py-3 text-right text-cocoa">
                {formatPounds(quote.remaining_balance_pence)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-8 border-l-2 border-caramel bg-vanilla px-5 py-4 text-sm text-espresso">
          Your order is confirmed only once the deposit has been paid. Until then the
          date remains available to other customers.
        </p>

        <p className="mt-3 border-l-2 border-plum bg-plum/5 px-5 py-4 text-espresso">
          {DEPOSIT_NOTICE}
        </p>

        {/* ── Payment ──────────────────────────────────────────────────── */}
        <PayButton
          token={token}
          label={`Pay deposit — ${formatPounds(quote.deposit_amount_pence)}`}
          requireAcceptance
          disabled={alreadyPaid || superseded || notActive || !isStripeConfigured()}
          disabledReason={
            alreadyPaid
              ? "This deposit has already been paid. Thank you."
              : superseded
                ? "This quote has been replaced. Please use the most recent link."
                : !isStripeConfigured()
                  ? "Card payment is not available yet. We will be in touch to arrange payment of the deposit."
                  : "This quote is not currently open for payment. Please get in touch."
          }
        />

        <p className="mt-12 border-t border-espresso/10 pt-6 text-xs text-cocoa-soft">
          This link is personal to your order. Please do not share it.
        </p>
      </div>
    </main>
  );
}
