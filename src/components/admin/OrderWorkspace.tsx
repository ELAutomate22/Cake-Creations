"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EDITABLE_FIELDS, FIELD_LABELS, type OrderStatus } from "@/lib/admin/fields";
import { CAKE_LINE_DESCRIPTION } from "@/lib/admin/pricing";
import { calculateQuote, formatPence, formatPounds, parsePence } from "@/lib/admin/money";
import { DEPOSIT_NOTICE } from "@/lib/email/templates";
import { StatusBadge } from "./StatusBadge";

/**
 * Working on one order.
 *
 * The original request and the confirmed order are shown side by side wherever
 * they differ, so a change is visible as a change rather than quietly
 * replacing what the customer asked for.
 *
 * Nothing here saves as you type. Every section has its own Save, and the
 * destructive actions — decline, cancel — need a typed reason and a
 * confirmation. Money is edited in pounds and converted to pence immediately;
 * no arithmetic is ever done on the pounds.
 */

type Money = { description: string; amountPence: number };

type Quote = {
  version: number;
  status: string;
  subtotalPence: number;
  discountPence: number;
  deliveryFeePence: number;
  totalPence: number;
  depositPercentage: number;
  depositAmountPence: number;
  remainingBalancePence: number;
  message: string | null;
  items: Money[];
  createdAt: string;
  sentAt: string | null;
};

export type OrderWorkspaceProps = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  allowedStatuses: OrderStatus[];
  statusLabels: Record<OrderStatus, string>;
  customer: { name: string; email: string; phone: string };
  createdAt: string;
  original: Record<string, string>;
  current: Record<string, string>;
  changedFields: string[];
  internalNotes: string;
  images: { id: string; filename: string | null; mimeType: string; fileSize: number }[];
  items: Money[];
  quotes: Quote[];
  messages: {
    id: string;
    type: string;
    subject: string;
    body: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
  }[];
  activity: { id: string; type: string; description: string; createdAt: string }[];
  depositDefault: number;
  payments: {
    id: string;
    type: "deposit" | "balance";
    amountPence: number;
    status: string;
    sessionId: string | null;
    intentId: string | null;
    paidAt: string | null;
  }[];
  balance: {
    totalPence: number;
    paidPence: number;
    outstandingPence: number;
    hasPaidDeposit: boolean;
  };
  stripeReady: boolean;
  stripeTestMode: boolean;
  emailReady: boolean;
};

function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="mt-8 border border-espresso/12 bg-vanilla">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-espresso/12 px-5 py-3.5">
        <h2 className="font-serif text-lg text-espresso">{title}</h2>
        {aside}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

const control =
  "w-full border border-espresso/20 bg-ivory px-3 py-2.5 text-sm text-cocoa outline-none focus:border-espresso";

export function OrderWorkspace(props: OrderWorkspaceProps) {
  const router = useRouter();

  const [values, setValues] = useState(props.current);
  const [notes, setNotes] = useState(props.internalNotes);
  /*
   * Pricing starts where it was left.
   *
   * The most recent quote is the best record of the figures last used, so the
   * fields are seeded from it. Without this, reopening an order showed a
   * discount and delivery of zero next to a saved quote that had both, which
   * reads as though they had been lost.
   *
   * The price falls back to the stored line, summed — an order priced under
   * the old multi-line editor collapses into the single figure it always
   * amounted to, rather than appearing to be worth nothing.
   */
  const latestQuote = props.quotes[0];

  const [cakePrice, setCakePrice] = useState(() =>
    formatPence(
      latestQuote?.subtotalPence ??
        props.items.reduce((sum, item) => sum + item.amountPence, 0),
    ),
  );
  const [discount, setDiscount] = useState(formatPence(latestQuote?.discountPence ?? 0));
  const [delivery, setDelivery] = useState(
    formatPence(latestQuote?.deliveryFeePence ?? 0),
  );
  const [depositPercent, setDepositPercent] = useState(
    String(latestQuote?.depositPercentage ?? props.depositDefault),
  );
  const [quoteMessage, setQuoteMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [finalMessage, setFinalMessage] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const post = async (url: string, body: unknown, label: string) => {
    setBusy(label);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };

      if (!payload.ok) {
        setNotice({ tone: "bad", text: payload.message ?? "That did not work." });
        return false;
      }

      setNotice({
        tone: "ok",
        text: payload.message ?? "Saved.",
      });
      router.refresh();
      return true;
    } catch {
      setNotice({ tone: "bad", text: "Could not reach the server." });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const cakePricePence = parsePence(cakePrice) ?? 0;

  /**
   * Live totals as the owner types.
   *
   * The same function the server uses, given the same four inputs, so what is
   * on screen and what is saved cannot drift apart. The screen never sends a
   * total; the server recalculates it.
   */
  const totals = useMemo(
    () =>
      calculateQuote({
        items: [{ description: CAKE_LINE_DESCRIPTION, amountPence: cakePricePence }],
        discountPence: parsePence(discount) ?? 0,
        deliveryFeePence: parsePence(delivery) ?? 0,
        depositPercentage: Number(depositPercent) || 0,
      }),
    [cakePricePence, discount, delivery, depositPercent],
  );

  const openImage = async (imageId: string) => {
    const response = await fetch(
      `/api/admin/orders/${props.orderId}/image?image=${imageId}`,
    );
    const payload = (await response.json()) as { ok: boolean; url?: string };
    if (payload.ok && payload.url) window.open(payload.url, "_blank", "noopener");
    else setNotice({ tone: "bad", text: "That image could not be opened." });
  };

  return (
    <div className="mt-4">
      {/* ── Heading and status ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-sm text-espresso">{props.orderNumber}</h1>
          <p className="mt-1 text-sm text-cocoa-soft">
            Received {props.createdAt.slice(0, 10)}
          </p>
        </div>
        <StatusBadge status={props.status} />
      </div>

      {/*
        The one thing the owner must not have to go looking for.

        A paid deposit is non-refundable by the policy the customer accepted,
        so it is stated at the top of the order rather than in the payment
        section further down.
      */}
      {props.balance.hasPaidDeposit && (
        <p className="mt-5 border-2 border-plum bg-plum/5 px-4 py-3 text-sm text-plum-deep">
          <strong className="font-normal tracking-[0.08em]">
            DEPOSIT PAID — NON-REFUNDABLE
          </strong>
        </p>
      )}

      {notice && (
        <p
          role="status"
          className={`mt-5 border px-4 py-3 text-sm ${
            notice.tone === "ok"
              ? "border-success/30 bg-success/5 text-success"
              : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {notice.text}
        </p>
      )}

      {/* ── Status actions ───────────────────────────────────────────────── */}
      <Section title="Status">
        {props.allowedStatuses.length === 0 ? (
          <p className="text-sm text-cocoa-soft">
            This order is {props.statusLabels[props.status].toLowerCase()}. There are no
            further steps.
          </p>
        ) : (
          <>
            <p className="text-sm text-cocoa-soft">
              Only the steps that make sense from here are offered.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {props.allowedStatuses
                .filter((status) => status !== "declined" && status !== "cancelled")
                .map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      post(
                        `/api/admin/orders/${props.orderId}/status`,
                        { status },
                        `status-${status}`,
                      )
                    }
                    className="btn btn-outline py-2 text-xs disabled:opacity-50"
                  >
                    {busy === `status-${status}` ? "Working…" : props.statusLabels[status]}
                  </button>
                ))}
            </div>
            <p className="mt-4 text-xs text-cocoa-soft">
              Deposit paid and Paid in full are set by a confirmed payment, not by hand.
            </p>
          </>
        )}
      </Section>

      {/* ── Customer ─────────────────────────────────────────────────────── */}
      <Section title="Customer">
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ["Name", props.customer.name, null],
            ["Email", props.customer.email, `mailto:${props.customer.email}`],
            ["Phone", props.customer.phone, `tel:${props.customer.phone.replace(/[^\d+]/g, "")}`],
          ].map(([label, value, href]) => (
            <div key={label as string}>
              <dt className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
                {label}
              </dt>
              <dd className="mt-1 flex flex-wrap items-center gap-3">
                {href ? (
                  <a href={href as string} className="text-cocoa underline-offset-4 hover:underline">
                    {value}
                  </a>
                ) : (
                  <span className="text-cocoa">{value}</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(String(value));
                    setNotice({ tone: "ok", text: `${label} copied.` });
                  }}
                  className="text-[0.625rem] uppercase tracking-[0.14em] text-cocoa-soft hover:text-espresso"
                >
                  Copy
                </button>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-cocoa-soft">
          These details are never shown on the public website.
        </p>
      </Section>

      {/* ── The original request ─────────────────────────────────────────── */}
      <Section
        title="Original request"
        aside={
          <span className="text-xs text-cocoa-soft">
            As submitted — never changed
          </span>
        }
      >
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {EDITABLE_FIELDS.filter((field) => props.original[field]).map((field) => (
            <div key={field} className="border-b border-espresso/8 pb-2">
              <dt className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
                {FIELD_LABELS[field]}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-cocoa">
                {props.original[field]}
                {props.changedFields.includes(field) && (
                  <span className="ml-2 text-[0.625rem] uppercase tracking-[0.14em] text-plum">
                    since changed
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* ── Reference images ─────────────────────────────────────────────── */}
      {props.images.length > 0 && (
        <Section title="Reference images">
          <ul className="flex flex-wrap gap-3">
            {props.images.map((image) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => openImage(image.id)}
                  className="border border-espresso/20 bg-ivory px-4 py-3 text-left text-sm text-cocoa hover:border-espresso"
                >
                  <span className="block">{image.filename ?? "Reference image"}</span>
                  <span className="mt-0.5 block text-xs text-cocoa-soft">
                    {Math.round(image.fileSize / 1024)} KB · opens for 5 minutes
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-cocoa-soft">
            Images are private. Each link is signed and expires.
          </p>
        </Section>
      )}

      {/* ── Confirmed order ──────────────────────────────────────────────── */}
      <Section title="Confirmed order">
        <p className="text-sm text-cocoa-soft">
          What the cake is now to be. Editing this never alters the original request
          above.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {EDITABLE_FIELDS.map((field) => {
            const long = ["theme", "design_requirements", "cake_message", "delivery_address"].includes(
              field,
            );
            return (
              <div key={field} className={long ? "sm:col-span-2" : undefined}>
                <label
                  htmlFor={`field-${field}`}
                  className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft"
                >
                  {FIELD_LABELS[field]}
                  {props.changedFields.includes(field) && (
                    <span className="ml-2 normal-case tracking-normal text-plum">
                      was: {props.original[field] || "—"}
                    </span>
                  )}
                </label>
                {long ? (
                  <textarea
                    id={`field-${field}`}
                    rows={3}
                    value={values[field] ?? ""}
                    onChange={(event) =>
                      setValues({ ...values, [field]: event.target.value })
                    }
                    className={`${control} mt-1.5 resize-y`}
                  />
                ) : (
                  <input
                    id={`field-${field}`}
                    type={field === "required_date" ? "date" : "text"}
                    value={values[field] ?? ""}
                    onChange={(event) =>
                      setValues({ ...values, [field]: event.target.value })
                    }
                    className={`${control} mt-1.5`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <label
            htmlFor="internal-notes"
            className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft"
          >
            Internal notes — never sent to the customer
          </label>
          <textarea
            id="internal-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={`${control} mt-1.5 resize-y`}
          />
        </div>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            post(
              `/api/admin/orders/${props.orderId}/save`,
              { ...values, internal_notes: notes },
              "save",
            )
          }
          className="btn btn-solid mt-5 py-2.5 text-xs disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save changes"}
        </button>
      </Section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <Section title="Pricing">
        <p className="text-sm text-cocoa-soft">
          What the cake costs, then anything taken off and anything added on. The
          figures below update as you type, and nothing is saved until you save the
          quote.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="cake-price"
              className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft"
            >
              Price of the cake (£)
            </label>
            <input
              id="cake-price"
              inputMode="decimal"
              value={cakePrice}
              onChange={(event) => setCakePrice(event.target.value)}
              className={`${control} mt-1.5`}
            />
            <p className="mt-1 text-xs text-cocoa-soft">
              The whole cake, as one price.
            </p>
          </div>

          <div>
            <label
              htmlFor="discount"
              className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft"
            >
              Discount (£)
            </label>
            <input
              id="discount"
              inputMode="decimal"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              className={`${control} mt-1.5`}
            />
            <p className="mt-1 text-xs text-cocoa-soft">
              Never more than the price of the cake.
            </p>
          </div>

          <div>
            <label
              htmlFor="delivery"
              className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft"
            >
              Delivery (£)
            </label>
            <input
              id="delivery"
              inputMode="decimal"
              value={delivery}
              onChange={(event) => setDelivery(event.target.value)}
              className={`${control} mt-1.5`}
            />
            <p className="mt-1 text-xs text-cocoa-soft">
              Added after the discount.
            </p>
          </div>

          <div>
            <label
              htmlFor="deposit"
              className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft"
            >
              Deposit (%)
            </label>
            <input
              id="deposit"
              inputMode="numeric"
              value={depositPercent}
              onChange={(event) => setDepositPercent(event.target.value)}
              className={`${control} mt-1.5`}
            />
            <p className="mt-1 text-xs text-cocoa-soft">
              Taken from the total.
            </p>
          </div>
        </div>

        {cakePricePence <= 0 && (
          <p className="mt-4 text-sm text-cocoa-soft">
            Enter a price to see the totals.
          </p>
        )}

        <dl className="mt-6 border-t border-espresso/15 pt-4 text-sm">
          <div className="flex justify-between py-1">
            <dt className="text-cocoa-soft">Subtotal</dt>
            <dd className="text-cocoa">{formatPounds(totals.subtotalPence)}</dd>
          </div>
          {totals.discountPence > 0 && (
            <div className="flex justify-between py-1">
              <dt className="text-cocoa-soft">Discount</dt>
              <dd className="text-cocoa">−{formatPounds(totals.discountPence)}</dd>
            </div>
          )}
          {totals.deliveryFeePence > 0 && (
            <div className="flex justify-between py-1">
              <dt className="text-cocoa-soft">Delivery</dt>
              <dd className="text-cocoa">{formatPounds(totals.deliveryFeePence)}</dd>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-espresso/20 py-2">
            <dt className="text-espresso">Total</dt>
            <dd className="font-serif text-lg text-espresso">
              {formatPounds(totals.totalPence)}
            </dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-cocoa-soft">Deposit ({totals.depositPercentage}%)</dt>
            <dd className="text-cocoa">{formatPounds(totals.depositAmountPence)}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-cocoa-soft">Remaining balance</dt>
            <dd className="text-cocoa">{formatPounds(totals.remainingBalancePence)}</dd>
          </div>
        </dl>
      </Section>

      {/* ── Quote ────────────────────────────────────────────────────────── */}
      <Section title="Quote">
        <label htmlFor="quote-message" className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
          Message to the customer
        </label>
        <textarea
          id="quote-message"
          rows={5}
          value={quoteMessage}
          onChange={(event) => setQuoteMessage(event.target.value)}
          placeholder="Thank you for your cake request. I can make this for the date you asked for…"
          className={`${control} mt-1.5 resize-y`}
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-outline py-2 text-xs"
          >
            {showPreview ? "Hide preview" : "Preview quote"}
          </button>
          <button
            type="button"
            disabled={busy !== null || cakePricePence <= 0}
            onClick={() =>
              post(
                `/api/admin/orders/${props.orderId}/quote`,
                {
                  cakePricePence,
                  discountPence: parsePence(discount) ?? 0,
                  deliveryFeePence: parsePence(delivery) ?? 0,
                  depositPercentage: Number(depositPercent) || 0,
                  message: quoteMessage,
                },
                "quote",
              )
            }
            className="btn btn-solid py-2 text-xs disabled:opacity-50"
          >
            {busy === "quote" ? "Saving…" : "Save quote version"}
          </button>

          <button
            type="button"
            disabled={busy !== null || props.quotes.length === 0}
            onClick={() => {
              if (!confirm("Send this quote to the customer?")) return;
              void post(`/api/admin/orders/${props.orderId}/send-quote`, {}, "send-quote");
            }}
            className="btn btn-solid py-2 text-xs disabled:opacity-50"
          >
            {busy === "send-quote" ? "Sending…" : "Send quote to customer"}
          </button>
        </div>

        {/*
          Sending supersedes.

          The newest quote becomes the active one and every older link stops
          working, so a customer cannot pay yesterday's price from an older
          email.
        */}
        <p className="mt-4 text-xs text-cocoa-soft">
          Sending makes the newest quote the active one and stops any older link from
          being used. The email contains a secure link to a payment page, not a price
          the customer can change.
        </p>

        {!props.emailReady && (
          <p className="mt-3 border border-caramel/40 bg-caramel/10 px-4 py-3 text-sm text-espresso">
            Email is not configured, so sending will fail and be recorded as such. Set
            RESEND_API_KEY and FROM_EMAIL.
          </p>
        )}

        {!props.stripeReady && (
          <p className="mt-3 border border-caramel/40 bg-caramel/10 px-4 py-3 text-sm text-espresso">
            Stripe is not configured. The quote can still be sent, and the page will
            explain that payment will be arranged directly rather than showing a button
            that does not work.
          </p>
        )}

        {props.stripeReady && props.stripeTestMode && (
          <p className="mt-3 border border-caramel/40 bg-caramel/10 px-4 py-3 text-sm text-espresso">
            Stripe is in <strong className="font-normal">test mode</strong>. No real
            money will move.
          </p>
        )}

        {showPreview && (
          <div className="mt-5 border border-espresso/15 bg-ivory p-5">
            <p className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
              Preview
            </p>
            <p className="mt-3 font-serif text-lg text-espresso">
              Elshadai Cake Creations
            </p>
            <p className="mt-1 text-sm text-cocoa-soft">
              {props.orderNumber} · {props.customer.name}
            </p>

            {quoteMessage && (
              <p className="mt-4 whitespace-pre-wrap text-sm text-cocoa">{quoteMessage}</p>
            )}

            <dl className="mt-4 space-y-1 text-sm">
              {EDITABLE_FIELDS.filter((f) => values[f]).slice(0, 8).map((field) => (
                <div key={field} className="flex gap-3">
                  <dt className="w-40 shrink-0 text-cocoa-soft">{FIELD_LABELS[field]}</dt>
                  <dd className="text-cocoa">{values[field]}</dd>
                </div>
              ))}
            </dl>

            {/*
              The same rows, in the same order, as the page the customer opens.
              A preview that summarises differently is a preview of something
              else.
            */}
            <dl className="mt-4 border-t border-espresso/10 pt-3 text-sm">
              <div className="flex justify-between py-0.5">
                <dt className="text-cocoa">{CAKE_LINE_DESCRIPTION}</dt>
                <dd className="text-cocoa">{formatPounds(totals.subtotalPence)}</dd>
              </div>
              {totals.discountPence > 0 && (
                <div className="flex justify-between py-0.5">
                  <dt className="text-cocoa">Discount</dt>
                  <dd className="text-cocoa">−{formatPounds(totals.discountPence)}</dd>
                </div>
              )}
              {totals.deliveryFeePence > 0 && (
                <div className="flex justify-between py-0.5">
                  <dt className="text-cocoa">Delivery</dt>
                  <dd className="text-cocoa">{formatPounds(totals.deliveryFeePence)}</dd>
                </div>
              )}
            </dl>

            <dl className="mt-2 border-t border-espresso/20 pt-2 text-sm">
              <div className="flex justify-between py-0.5">
                <dt className="text-espresso">Total</dt>
                <dd className="text-espresso">{formatPounds(totals.totalPence)}</dd>
              </div>
              <div className="flex justify-between py-0.5">
                <dt className="text-cocoa-soft">Deposit ({totals.depositPercentage}%)</dt>
                <dd className="text-cocoa">{formatPounds(totals.depositAmountPence)}</dd>
              </div>
              <div className="flex justify-between py-0.5">
                <dt className="text-cocoa-soft">Remaining</dt>
                <dd className="text-cocoa">{formatPounds(totals.remainingBalancePence)}</dd>
              </div>
            </dl>

            <p className="mt-4 border-l-2 border-plum bg-plum/5 px-4 py-3 text-sm text-espresso">
              {DEPOSIT_NOTICE}
            </p>
          </div>
        )}
      </Section>

      {/* ── Quote history ────────────────────────────────────────────────── */}
      {props.quotes.length > 0 && (
        <Section title="Quote history">
          <ul className="space-y-4">
            {props.quotes.map((quote) => (
              <li key={quote.version} className="border border-espresso/12 bg-ivory p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-espresso">
                    Quote v{quote.version} — {formatPounds(quote.totalPence)}
                  </span>
                  <span className="text-xs text-cocoa-soft">
                    {quote.sentAt
                      ? `Sent ${quote.sentAt.slice(0, 16).replace("T", " ")}`
                      : `Draft · created ${quote.createdAt.slice(0, 16).replace("T", " ")}`}
                  </span>
                </div>
                <p className="mt-2 text-sm text-cocoa-soft">
                  Deposit {quote.depositPercentage}% ({formatPounds(quote.depositAmountPence)})
                  · Remaining {formatPounds(quote.remainingBalancePence)}
                </p>
                {quote.items.length > 0 && (
                  <ul className="mt-2 text-sm text-cocoa">
                    {quote.items.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{item.description}</span>
                        <span>{formatPounds(item.amountPence)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Message the customer ─────────────────────────────────────────── */}
      <Section title="Send a message">
        <p className="text-sm text-cocoa-soft">
          Goes to {props.customer.email}. The address is taken from this order on the
          server; it cannot be changed here.
        </p>

        <label htmlFor="email-subject" className="mt-4 block text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
          Subject
        </label>
        <input
          id="email-subject"
          value={emailSubject}
          onChange={(event) => setEmailSubject(event.target.value)}
          className={`${control} mt-1.5`}
        />

        <label htmlFor="email-body" className="mt-4 block text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
          Message
        </label>
        <textarea
          id="email-body"
          rows={6}
          value={emailBody}
          onChange={(event) => setEmailBody(event.target.value)}
          className={`${control} mt-1.5 resize-y`}
        />

        <button
          type="button"
          disabled={busy !== null || emailSubject.length < 3 || emailBody.length < 10}
          onClick={async () => {
            const sent = await post(
              `/api/admin/orders/${props.orderId}/message`,
              { subject: emailSubject, message: emailBody },
              "message",
            );
            if (sent) {
              setEmailSubject("");
              setEmailBody("");
            }
          }}
          className="btn btn-solid mt-5 py-2.5 text-xs disabled:opacity-50"
        >
          {busy === "message" ? "Sending…" : "Send email"}
        </button>
      </Section>

      {/* ── Communications ───────────────────────────────────────────────── */}
      {props.messages.length > 0 && (
        <Section title="Communications">
          <ul className="space-y-3">
            {props.messages.map((message) => (
              <li key={message.id} className="border border-espresso/12 bg-ivory">
                <details>
                  <summary className="cursor-pointer px-4 py-3 text-sm text-cocoa">
                    <span className="text-cocoa-soft">
                      {(message.sentAt ?? message.createdAt).slice(0, 16).replace("T", " ")}
                    </span>
                    {" · "}
                    <span className="capitalize">{message.type.replace(/_/g, " ")}</span>
                    {" · "}
                    {message.subject}
                    {message.status !== "sent" && (
                      <span className="ml-2 text-danger">({message.status})</span>
                    )}
                  </summary>
                  <div
                    className="border-t border-espresso/10 px-4 py-3 text-sm text-cocoa"
                    // The stored body is our own template output, rendered so
                    // the owner sees what the customer saw.
                    dangerouslySetInnerHTML={{ __html: message.body }}
                  />

                  {/*
                    A payment is never rolled back because email failed, so a
                    confirmation that did not send leaves a paid order and an
                    uninformed customer. This is how that is put right.
                  */}
                  {message.status !== "sent" && (
                    <div className="border-t border-espresso/10 px-4 py-3">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          post(
                            `/api/admin/orders/${props.orderId}/retry-email`,
                            { messageId: message.id },
                            `retry-${message.id}`,
                          )
                        }
                        className="btn btn-outline py-2 text-xs disabled:opacity-50"
                      >
                        {busy === `retry-${message.id}` ? "Resending…" : "Retry this email"}
                      </button>
                    </div>
                  )}
                </details>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      <Section title="Activity">
        <ol className="space-y-2.5">
          {props.activity.map((entry) => (
            <li key={entry.id} className="flex flex-wrap gap-x-4 text-sm">
              <span className="w-36 shrink-0 text-cocoa-soft">
                {entry.createdAt.slice(0, 16).replace("T", " ")}
              </span>
              <span className="text-cocoa">{entry.description}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Payments ─────────────────────────────────────────────────────── */}
      <Section title="Payments">
        <dl className="text-sm">
          <div className="flex justify-between border-b border-espresso/10 py-2">
            <dt className="text-cocoa-soft">Current total</dt>
            <dd className="text-cocoa">{formatPounds(props.balance.totalPence)}</dd>
          </div>
          <div className="flex justify-between border-b border-espresso/10 py-2">
            <dt className="text-cocoa-soft">Already paid</dt>
            <dd className="text-cocoa">{formatPounds(props.balance.paidPence)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-espresso">Outstanding</dt>
            <dd className="font-serif text-lg text-espresso">
              {formatPounds(props.balance.outstandingPence)}
            </dd>
          </div>
        </dl>

        {/*
          Stated because it is the rule people expect to be broken.

          The outstanding figure is the current total minus what was actually
          paid — never the deposit percentage recalculated against a revised
          total. A payment that happened is not re-derived.
        */}
        <p className="mt-3 text-xs text-cocoa-soft">
          Outstanding is the current total minus payments actually received. Changing
          the total never alters a payment already taken.
        </p>

        {props.payments.length > 0 && (
          <ul className="mt-5 space-y-2 text-sm">
            {props.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-espresso/12 bg-ivory px-4 py-3"
              >
                <span className="capitalize text-espresso">{payment.type}</span>
                <span className="text-cocoa">{formatPounds(payment.amountPence)}</span>
                <span
                  className={
                    payment.status === "paid" ? "text-success" : "text-cocoa-soft"
                  }
                >
                  {payment.status}
                </span>
                <span className="text-xs text-cocoa-soft">
                  {payment.paidAt
                    ? payment.paidAt.slice(0, 16).replace("T", " ")
                    : "not paid"}
                </span>
                {payment.intentId && (
                  <span className="font-mono text-[0.6875rem] text-cocoa-soft">
                    {payment.intentId}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {props.payments.length === 0 && (
          <p className="mt-4 text-sm text-cocoa-soft">No payments yet.</p>
        )}

        {/* ── Ask for the balance ────────────────────────────────────── */}
        {props.balance.hasPaidDeposit && props.balance.outstandingPence > 0 && (
          <div className="mt-8 border-t border-espresso/12 pt-6">
            <h3 className="text-sm text-espresso">Request the final payment</h3>
            <p className="mt-1 text-sm text-cocoa-soft">
              Sends the customer a secure link for{" "}
              {formatPounds(props.balance.outstandingPence)}. The amount is worked out
              again when they open it, so it is never out of date.
            </p>
            <textarea
              aria-label="Optional message for the final payment request"
              rows={3}
              placeholder="Optional note — collection times, anything else."
              value={finalMessage}
              onChange={(event) => setFinalMessage(event.target.value)}
              className={`${control} mt-3 resize-y`}
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                post(
                  `/api/admin/orders/${props.orderId}/request-final`,
                  { message: finalMessage },
                  "final",
                )
              }
              className="btn btn-solid mt-3 py-2 text-xs disabled:opacity-50"
            >
              {busy === "final" ? "Sending…" : "Request final payment"}
            </button>
          </div>
        )}

        {/*
          No refund button, deliberately.

          The deposit is non-refundable under the accepted policy, so a refund
          is an exception someone chooses to make. It is made in Stripe, and
          only recorded here.
        */}
        {props.balance.paidPence > 0 && props.status !== "refunded" && (
          <div className="mt-8 border-t border-espresso/12 pt-6">
            <h3 className="text-sm text-espresso">Record a refund made in Stripe</h3>
            <p className="mt-1 text-sm text-cocoa-soft">
              This refunds nothing. Refund in Stripe first, then record it here so the
              two agree. The payment history stays as it is, because the money was
              taken at the time.
            </p>
            <input
              aria-label="Note about the refund"
              value={refundNote}
              onChange={(event) => setRefundNote(event.target.value)}
              placeholder="Refunded in Stripe on… and why"
              className={`${control} mt-3`}
            />
            <button
              type="button"
              disabled={busy !== null || refundNote.trim().length < 5}
              onClick={() => {
                if (!confirm("Record this order as refunded?")) return;
                void post(
                  `/api/admin/orders/${props.orderId}/refund`,
                  { note: refundNote },
                  "refund",
                );
              }}
              className="btn btn-outline mt-3 py-2 text-xs disabled:opacity-40"
            >
              {busy === "refund" ? "Recording…" : "Record as refunded"}
            </button>
          </div>
        )}
      </Section>

      {/* ── Ending the order ─────────────────────────────────────────────── */}
      {props.status !== "declined" && props.status !== "cancelled" && (
        <section className="mt-8 border border-danger/25 bg-danger/[0.03]">
          <div className="border-b border-danger/20 px-5 py-3.5">
            <h2 className="font-serif text-lg text-danger">Ending this order</h2>
          </div>
          <div className="space-y-8 px-5 py-5">
            <div>
              <h3 className="text-sm text-espresso">Decline the request</h3>
              <p className="mt-1 text-sm text-cocoa-soft">
                Tells the customer you cannot take it on. A message is required.
              </p>
              <textarea
                aria-label="Reason for declining, sent to the customer"
                rows={3}
                value={declineReason}
                onChange={(event) => setDeclineReason(event.target.value)}
                className={`${control} mt-2 resize-y`}
              />
              <button
                type="button"
                disabled={busy !== null || declineReason.trim().length < 10}
                onClick={() => {
                  if (!confirm("Decline this request and email the customer?")) return;
                  void post(
                    `/api/admin/orders/${props.orderId}/decline`,
                    { reason: declineReason },
                    "decline",
                  );
                }}
                className="btn btn-outline mt-3 border-danger/40 py-2 text-xs text-danger disabled:opacity-40"
              >
                {busy === "decline" ? "Declining…" : "Decline request"}
              </button>
            </div>

            <div className="border-t border-danger/15 pt-6">
              <h3 className="text-sm text-espresso">Cancel the order</h3>
              <p className="mt-1 text-sm text-cocoa-soft">
                A reason is required. Where a deposit has been paid, the customer is
                reminded that it is non-refundable. Nothing here refunds money — any
                refund is a decision to make deliberately, in Stripe.
              </p>
              <textarea
                aria-label="Reason for cancelling, sent to the customer"
                rows={3}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className={`${control} mt-2 resize-y`}
              />
              <button
                type="button"
                disabled={busy !== null || cancelReason.trim().length < 5}
                onClick={() => {
                  if (!confirm("Cancel this order and email the customer?")) return;
                  void post(
                    `/api/admin/orders/${props.orderId}/cancel`,
                    { reason: cancelReason, notify: true },
                    "cancel",
                  );
                }}
                className="btn btn-outline mt-3 border-danger/40 py-2 text-xs text-danger disabled:opacity-40"
              >
                {busy === "cancel" ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
