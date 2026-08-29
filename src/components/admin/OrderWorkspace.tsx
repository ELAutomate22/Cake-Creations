"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EDITABLE_FIELDS, FIELD_LABELS, type OrderStatus } from "@/lib/admin/fields";
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
  const [items, setItems] = useState<Money[]>(props.items);
  const [discount, setDiscount] = useState(formatPence(0));
  const [delivery, setDelivery] = useState(formatPence(0));
  const [depositPercent, setDepositPercent] = useState(String(props.depositDefault));
  const [quoteMessage, setQuoteMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
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

  /** Live totals as the owner types. The same function the server uses. */
  const totals = useMemo(
    () =>
      calculateQuote({
        items,
        discountPence: parsePence(discount) ?? 0,
        deliveryFeePence: parsePence(delivery) ?? 0,
        depositPercentage: Number(depositPercent) || 0,
      }),
    [items, discount, delivery, depositPercent],
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
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li key={index} className="flex flex-wrap items-center gap-2">
              <input
                aria-label={`Item ${index + 1} description`}
                value={item.description}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...item, description: event.target.value };
                  setItems(next);
                }}
                className={`${control} flex-1 min-w-[12rem]`}
              />
              <span className="text-sm text-cocoa-soft">£</span>
              <input
                aria-label={`Item ${index + 1} amount in pounds`}
                inputMode="decimal"
                value={formatPence(item.amountPence)}
                onChange={(event) => {
                  const pence = parsePence(event.target.value);
                  if (pence === null) return;
                  const next = [...items];
                  next[index] = { ...item, amountPence: pence };
                  setItems(next);
                }}
                className={`${control} w-24`}
              />
              <button
                type="button"
                aria-label={`Move item ${index + 1} up`}
                disabled={index === 0}
                onClick={() => {
                  const next = [...items];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  setItems(next);
                }}
                className="px-2 py-2 text-cocoa-soft hover:text-espresso disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move item ${index + 1} down`}
                disabled={index === items.length - 1}
                onClick={() => {
                  const next = [...items];
                  [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  setItems(next);
                }}
                className="px-2 py-2 text-cocoa-soft hover:text-espresso disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Remove item ${index + 1}`}
                onClick={() => setItems(items.filter((_, i) => i !== index))}
                className="px-2 py-2 text-danger hover:opacity-70"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setItems([...items, { description: "", amountPence: 0 }])}
            className="btn btn-outline py-2 text-xs"
          >
            + Add item
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              post(`/api/admin/orders/${props.orderId}/items`, { items }, "items")
            }
            className="btn btn-solid py-2 text-xs disabled:opacity-50"
          >
            {busy === "items" ? "Saving…" : "Save line items"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="discount" className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
              Discount (£)
            </label>
            <input
              id="discount"
              inputMode="decimal"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              className={`${control} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="delivery" className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
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
              Charged here, not as a line item, so it cannot be counted twice.
            </p>
          </div>
          <div>
            <label htmlFor="deposit" className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
              Deposit (%)
            </label>
            <input
              id="deposit"
              inputMode="numeric"
              value={depositPercent}
              onChange={(event) => setDepositPercent(event.target.value)}
              className={`${control} mt-1.5`}
            />
          </div>
        </div>

        <dl className="mt-6 border-t border-espresso/15 pt-4 text-sm">
          {[
            ["Subtotal", totals.subtotalPence],
            ["Discount", -totals.discountPence],
            ["Delivery", totals.deliveryFeePence],
          ].map(([label, pence]) => (
            <div key={label as string} className="flex justify-between py-1">
              <dt className="text-cocoa-soft">{label}</dt>
              <dd className="text-cocoa">{formatPounds(pence as number)}</dd>
            </div>
          ))}
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
            disabled={busy !== null || items.length === 0}
            onClick={() =>
              post(
                `/api/admin/orders/${props.orderId}/quote`,
                {
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
        </div>

        {/*
          Sending is not offered.

          The quote email carries a Pay deposit button, and there is no payment
          URL until Stripe exists. A quote arriving with a button that goes
          nowhere is worse than one that has not arrived.
        */}
        <p className="mt-4 border border-caramel/40 bg-caramel/10 px-4 py-3 text-sm text-espresso">
          Sending quotes is switched off until Stripe is connected in Phase 3, so no
          customer receives a payment button that does not work. Versions saved here are
          kept and can be sent then.
        </p>

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

            <ul className="mt-4 border-t border-espresso/10 pt-3 text-sm">
              {items.map((item, index) => (
                <li key={index} className="flex justify-between py-1">
                  <span className="text-cocoa">{item.description || "—"}</span>
                  <span className="text-cocoa">{formatPounds(item.amountPence)}</span>
                </li>
              ))}
            </ul>

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
        <p className="text-sm text-cocoa-soft">
          No payments have been taken. Card payments arrive with Stripe in Phase 3;
          amounts already paid will be listed here and subtracted from the balance.
        </p>
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
