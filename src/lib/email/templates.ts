import { business } from "@/content/site";
import { formatPounds } from "@/lib/admin/money";

/**
 * Email templates.
 *
 * Written as plain strings rather than rendered React: an email client is not
 * a browser, and the reliable subset is tables and inline styles. Every
 * template also produces a text version, because some clients show that and a
 * quote should be readable in both.
 *
 * The one line that must never be dropped from a quote is the deposit notice.
 * It is placed in the body, at full size, not in a footer.
 *
 * Templates 2 and 3 are prepared but unused: they may only be triggered by a
 * verified payment event, which is Phase 3. Nothing here invents a payment
 * link — where one will go, the template says so plainly instead.
 */

export const DEPOSIT_NOTICE =
  "Please note: once the deposit has been paid, the deposit is non-refundable.";

export type QuoteLineForEmail = { description: string; amountPence: number };

export type QuoteEmailData = {
  customerName: string;
  orderNumber: string;
  requiredDate: string;
  cakeSummary: { label: string; value: string }[];
  items: QuoteLineForEmail[];
  subtotalPence: number;
  discountPence: number;
  deliveryFeePence: number;
  totalPence: number;
  depositPercentage: number;
  depositAmountPence: number;
  remainingBalancePence: number;
  message: string;
  footer?: string;
  contactLines?: string[];
  /**
   * The secure quote page, not a Stripe URL.
   *
   * The link points at this application, which creates a fresh Checkout
   * session when the customer is ready. A Stripe URL emailed weeks earlier
   * would carry an amount that may since have changed, and would expire.
   */
  quoteUrl?: string | null;
  /** False when Stripe is not configured, so no dead button is shown. */
  paymentEnabled?: boolean;
};

/** Escapes text going into HTML. Owner-written, but never trusted regardless. */
function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Turns newlines into paragraphs, so a typed message keeps its shape. */
function paragraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 16px;">${escape(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

const SHELL = (title: string, inner: string) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escape(title)}</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  /*
    Dark mode is the reason this exists.

    The design is ivory with dark text. A client that decides to invert it
    turns the backgrounds dark while any element carrying an explicit light
    colour stays light, which is how a legible email becomes brown text on a
    brown field with an invisible button. Declaring the scheme stops the
    clients that honour it; the explicit colours on every element below cover
    the ones that do not.

    The link keeps its underline on purpose. If the colour is overridden by a
    client, the underline is what still says "this is a link".
  */
  a.button-link { background:#2a1d17 !important; color:#fbf7f1 !important; }
  a.plain-link { color:#2a1d17 !important; text-decoration:underline !important; }
</style></head>
<body style="margin:0;padding:0;background:#f4ece1;color:#4a352b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4ece1;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#fbf7f1;border:1px solid #e3d7c6;">
        <tr><td style="padding:32px 32px 8px;text-align:center;border-bottom:1px solid #e3d7c6;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#2a1d17;letter-spacing:0.5px;">
            ${escape(business.name)}
          </div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6b5347;padding-top:6px;">
            Personalised &amp; classic cakes
          </div>
        </td></tr>
        <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#4a352b;">
          ${inner}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

function summaryTable(rows: { label: string; value: string }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    ${rows
      .map(
        (row) => `<tr>
      <td style="padding:7px 0;border-bottom:1px solid #eee3d5;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b5347;width:45%;">${escape(row.label)}</td>
      <td style="padding:7px 0;border-bottom:1px solid #eee3d5;color:#2a1d17;">${escape(row.value)}</td>
    </tr>`,
      )
      .join("")}
  </table>`;
}

function moneyRow(label: string, value: string, strong = false): string {
  return `<tr>
    <td style="padding:7px 0;${strong ? "border-top:2px solid #2a1d17;font-weight:bold;" : "border-top:1px solid #eee3d5;"}color:#2a1d17;">${escape(label)}</td>
    <td align="right" style="padding:7px 0;${strong ? "border-top:2px solid #2a1d17;font-weight:bold;" : "border-top:1px solid #eee3d5;"}color:#2a1d17;">${escape(value)}</td>
  </tr>`;
}

/* ── Email 1 — quote and deposit request ─────────────────────────────────── */

/**
 * The night-time alert to the owner.
 *
 * Sent only for requests that arrive between 9pm and 8am, when nobody is
 * watching the admin. Its job is to say "something came in, look in the
 * morning" — not to be the order.
 *
 * It carries no customer contact details on purpose. Enough to know whether a
 * request needs attention early, and a link to where the rest of it lives. A
 * name, an email address and a phone number sitting in an inbox is a copy of
 * someone's data outside the system holding it, and this alert would not be
 * more useful for having them.
 */
export function ownerNightAlertEmail(data: {
  orderNumber: string;
  occasion: string;
  requiredDate: string;
  servings: string;
  receivedAt: string;
  adminUrl: string;
}) {
  const rows = summaryTable([
    { label: "Reference", value: data.orderNumber },
    { label: "Occasion", value: data.occasion },
    { label: "Date required", value: data.requiredDate },
    { label: "Servings", value: data.servings },
    { label: "Received", value: data.receivedAt },
  ]);

  const inner = `
    <p style="margin:0 0 16px;color:#4a352b;">A cake request came in overnight.</p>
    ${rows}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 24px;">
      <tr><td style="background:#2a1d17;">
        <a href="${escape(data.adminUrl)}" class="button-link"
           style="display:inline-block;padding:14px 32px;background:#2a1d17;color:#fbf7f1;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;border:1px solid #2a1d17;">
          Open the request
        </a>
      </td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:13px;color:#2a1d17;">
      Or copy this address into your browser:<br />
      <a href="${escape(data.adminUrl)}" class="plain-link"
         style="color:#2a1d17;text-decoration:underline;word-break:break-all;">${escape(data.adminUrl)}</a>
    </p>
    <p style="margin:0;font-size:13px;color:#6b5347;">
      The customer's name and contact details are in the admin. Nothing has been
      sent to them yet.
    </p>`;

  const text = [
    "A cake request came in overnight.",
    "",
    `Reference: ${data.orderNumber}`,
    `Occasion: ${data.occasion}`,
    `Date required: ${data.requiredDate}`,
    `Servings: ${data.servings}`,
    `Received: ${data.receivedAt}`,
    "",
    `Open it: ${data.adminUrl}`,
    "",
    "The customer's details are in the admin. Nothing has been sent to them yet.",
  ].join("\n");

  return {
    subject: `New cake request overnight — ${data.orderNumber}`,
    html: SHELL(`New cake request — ${data.orderNumber}`, inner),
    text,
  };
}

export function quoteEmail(data: QuoteEmailData) {
  const items = data.items
    .map(
      (item) => `<tr>
      <td style="padding:7px 0;border-bottom:1px solid #eee3d5;color:#4a352b;">${escape(item.description)}</td>
      <td align="right" style="padding:7px 0;border-bottom:1px solid #eee3d5;color:#4a352b;white-space:nowrap;">${formatPounds(item.amountPence)}</td>
    </tr>`,
    )
    .join("");

  /*
   * The button.
   *
   * It links to the quote page on this site, never straight to Stripe. The
   * amount is worked out when the customer arrives, so a link opened three
   * weeks later cannot charge a figure that has since changed.
   */
  const payment = data.quoteUrl && data.paymentEnabled !== false
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
         <tr><td style="background:#2a1d17;">
           <a href="${escape(data.quoteUrl as string)}" class="button-link"
              style="display:inline-block;padding:14px 32px;background:#2a1d17;color:#fbf7f1;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;border:1px solid #2a1d17;">
             Review quote &amp; pay deposit
           </a>
         </td></tr>
       </table>
       <p style="margin:0 0 20px;font-size:13px;color:#2a1d17;">
         Or copy this address into your browser:<br />
         <a href="${escape(data.quoteUrl as string)}" class="plain-link"
            style="color:#2a1d17;text-decoration:underline;word-break:break-all;">${escape(data.quoteUrl as string)}</a>
       </p>`
    : data.quoteUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
           <tr><td style="background:#2a1d17;">
             <a href="${escape(data.quoteUrl)}" class="button-link" style="display:inline-block;padding:14px 32px;background:#2a1d17;color:#fbf7f1;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;border:1px solid #2a1d17;">Review your quote</a>
           </td></tr>
         </table>
         <p style="margin:0 0 24px;padding:14px 16px;background:#f4ece1;border-left:3px solid #c9a882;">
           We will be in touch to arrange payment of the deposit.
         </p>`
      : `<p style="margin:0 0 24px;padding:14px 16px;background:#f4ece1;border-left:3px solid #c9a882;">
           We will be in touch with payment details for the deposit.
         </p>`;

  const inner = `
    <p style="margin:0 0 16px;">Dear ${escape(data.customerName)},</p>
    ${paragraphs(data.message)}

    <h2 style="font-family:Georgia,serif;font-size:18px;color:#2a1d17;margin:28px 0 12px;font-weight:normal;">Your cake</h2>
    ${summaryTable([
      { label: "Order reference", value: data.orderNumber },
      { label: "Date required", value: data.requiredDate },
      ...data.cakeSummary,
    ])}

    <h2 style="font-family:Georgia,serif;font-size:18px;color:#2a1d17;margin:28px 0 12px;font-weight:normal;">Your quote</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${items}
      ${data.discountPence > 0 ? moneyRow("Discount", `-${formatPounds(data.discountPence)}`) : ""}
      ${data.deliveryFeePence > 0 ? moneyRow("Delivery", formatPounds(data.deliveryFeePence)) : ""}
      ${moneyRow("Total", formatPounds(data.totalPence), true)}
      ${moneyRow(`Deposit (${data.depositPercentage}%)`, formatPounds(data.depositAmountPence))}
      ${moneyRow("Remaining balance", formatPounds(data.remainingBalancePence))}
    </table>

    ${payment}

    <p style="margin:0 0 12px;padding:14px 16px;background:#f4ece1;border-left:3px solid #c9a882;color:#2a1d17;">
      Your order is confirmed only once the deposit payment has gone through. Until
      then the date remains available to other customers.
    </p>

    <p style="margin:0 0 24px;padding:14px 16px;background:#f0e4e8;border-left:3px solid #6d3b4d;color:#2a1d17;">
      <strong style="font-weight:normal;">${escape(DEPOSIT_NOTICE)}</strong>
    </p>

    ${data.contactLines?.length ? `<p style="margin:24px 0 0;color:#6b5347;font-size:13px;">${data.contactLines.map(escape).join("<br />")}</p>` : ""}
    ${data.footer ? `<p style="margin:16px 0 0;color:#6b5347;font-size:12px;">${escape(data.footer)}</p>` : ""}
  `;

  const text = [
    `Dear ${data.customerName},`,
    "",
    data.message,
    "",
    `Order reference: ${data.orderNumber}`,
    `Date required: ${data.requiredDate}`,
    ...data.cakeSummary.map((row) => `${row.label}: ${row.value}`),
    "",
    "Your quote:",
    ...data.items.map((item) => `  ${item.description} — ${formatPounds(item.amountPence)}`),
    data.discountPence > 0 ? `  Discount — -${formatPounds(data.discountPence)}` : "",
    data.deliveryFeePence > 0 ? `  Delivery — ${formatPounds(data.deliveryFeePence)}` : "",
    `  Total: ${formatPounds(data.totalPence)}`,
    `  Deposit (${data.depositPercentage}%): ${formatPounds(data.depositAmountPence)}`,
    `  Remaining balance: ${formatPounds(data.remainingBalancePence)}`,
    "",
    data.quoteUrl
      ? `Review your quote and pay the deposit: ${data.quoteUrl}`
      : "We will be in touch with payment details for the deposit.",
    "",
    "Your order is confirmed only once the deposit payment has gone through.",
    DEPOSIT_NOTICE,
    "",
    ...(data.contactLines ?? []),
    data.footer ?? "",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    subject: `Your cake quote — ${data.orderNumber}`,
    html: SHELL(`Your cake quote — ${data.orderNumber}`, inner),
    text,
  };
}

/* ── Email 2 — deposit received (Phase 3) ────────────────────────────────── */

export function depositConfirmationEmail(data: {
  customerName: string;
  orderNumber: string;
  requiredDate: string;
  totalPence: number;
  depositPaidPence: number;
  remainingBalancePence: number;
  footer?: string;
}) {
  const inner = `
    <p style="margin:0 0 16px;">Dear ${escape(data.customerName)},</p>
    <p style="margin:0 0 16px;">Your deposit has been received and your order is now confirmed. The date is yours.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      ${moneyRow("Order reference", data.orderNumber)}
      ${moneyRow("Date required", data.requiredDate)}
      ${moneyRow("Total", formatPounds(data.totalPence))}
      ${moneyRow("Deposit paid", formatPounds(data.depositPaidPence))}
      ${moneyRow("Remaining balance", formatPounds(data.remainingBalancePence), true)}
    </table>

    <p style="margin:0 0 16px;">We will be in touch about the remaining balance closer to the date.</p>
    ${data.footer ? `<p style="margin:16px 0 0;color:#6b5347;font-size:12px;">${escape(data.footer)}</p>` : ""}
  `;

  return {
    subject: `Your ${business.name} order is confirmed — ${data.orderNumber}`,
    html: SHELL("Your order is confirmed", inner),
    text: [
      `Dear ${data.customerName},`,
      "",
      "Your deposit has been received and your order is now confirmed.",
      "",
      `Order reference: ${data.orderNumber}`,
      `Date required: ${data.requiredDate}`,
      `Total: ${formatPounds(data.totalPence)}`,
      `Deposit paid: ${formatPounds(data.depositPaidPence)}`,
      `Remaining balance: ${formatPounds(data.remainingBalancePence)}`,
      "",
      data.footer ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/* ── Email 3 — final payment (Phase 3) ───────────────────────────────────── */

export function finalPaymentEmail(data: {
  customerName: string;
  orderNumber: string;
  requiredDate?: string;
  /** The owner's optional note for this particular order. */
  message?: string;
  totalPence: number;
  paidPence: number;
  remainingBalancePence: number;
  collectionInformation?: string;
  payBalanceUrl?: string | null;
  footer?: string;
}) {
  const payment = data.payBalanceUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
         <tr><td style="background:#2a1d17;">
           <a href="${escape(data.payBalanceUrl)}" class="button-link" style="display:inline-block;padding:14px 32px;background:#2a1d17;color:#fbf7f1;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;border:1px solid #2a1d17;">Pay remaining balance</a>
         </td></tr>
       </table>
       <p style="margin:0 0 20px;font-size:13px;color:#6b5347;">
         Or copy this address into your browser:<br />
         <a href="${escape(data.payBalanceUrl)}" class="plain-link"
            style="color:#2a1d17;text-decoration:underline;word-break:break-all;">${escape(data.payBalanceUrl)}</a>
       </p>`
    : `<p style="margin:0 0 24px;padding:14px 16px;background:#f4ece1;border-left:3px solid #c9a882;">We will be in touch with payment details for the balance.</p>`;

  const inner = `
    <p style="margin:0 0 16px;">Dear ${escape(data.customerName)},</p>
    <p style="margin:0 0 16px;">Your cake is ready. The remaining balance is now due.</p>
    ${data.message ? paragraphs(data.message) : ""}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      ${moneyRow("Order reference", data.orderNumber)}
      ${data.requiredDate ? moneyRow("Date required", data.requiredDate) : ""}
      ${moneyRow("Total", formatPounds(data.totalPence))}
      ${moneyRow("Already paid", formatPounds(data.paidPence))}
      ${moneyRow("Remaining balance", formatPounds(data.remainingBalancePence), true)}
    </table>

    ${payment}
    ${data.collectionInformation ? `<p style="margin:0 0 16px;">${escape(data.collectionInformation)}</p>` : ""}
    ${data.footer ? `<p style="margin:16px 0 0;color:#6b5347;font-size:12px;">${escape(data.footer)}</p>` : ""}
  `;

  return {
    subject: `Your cake is ready — ${data.orderNumber}`,
    html: SHELL("Your cake is ready", inner),
    text: [
      `Dear ${data.customerName},`,
      "",
      "Your cake is ready. The remaining balance is now due.",
      "",
      data.message ?? "",
      `Order reference: ${data.orderNumber}`,
      data.requiredDate ? `Date required: ${data.requiredDate}` : "",
      `Total: ${formatPounds(data.totalPence)}`,
      `Already paid: ${formatPounds(data.paidPence)}`,
      `Remaining balance: ${formatPounds(data.remainingBalancePence)}`,
      "",
      data.payBalanceUrl ? `Pay the balance: ${data.payBalanceUrl}` : "",
      data.collectionInformation ?? "",
      data.footer ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/* ── Custom message ──────────────────────────────────────────────────────── */

export function customMessageEmail(data: {
  customerName: string;
  orderNumber: string;
  subject: string;
  message: string;
  footer?: string;
  contactLines?: string[];
}) {
  const inner = `
    <p style="margin:0 0 16px;">Dear ${escape(data.customerName)},</p>
    ${paragraphs(data.message)}
    <p style="margin:24px 0 0;color:#6b5347;font-size:13px;">Order reference: ${escape(data.orderNumber)}</p>
    ${data.contactLines?.length ? `<p style="margin:8px 0 0;color:#6b5347;font-size:13px;">${data.contactLines.map(escape).join("<br />")}</p>` : ""}
    ${data.footer ? `<p style="margin:16px 0 0;color:#6b5347;font-size:12px;">${escape(data.footer)}</p>` : ""}
  `;

  return {
    subject: data.subject,
    html: SHELL(data.subject, inner),
    text: [
      `Dear ${data.customerName},`,
      "",
      data.message,
      "",
      `Order reference: ${data.orderNumber}`,
      ...(data.contactLines ?? []),
      data.footer ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/* ── Decline ─────────────────────────────────────────────────────────────── */

export function declineEmail(data: {
  customerName: string;
  orderNumber: string;
  message: string;
  footer?: string;
  contactLines?: string[];
}) {
  const inner = `
    <p style="margin:0 0 16px;">Dear ${escape(data.customerName)},</p>
    <p style="margin:0 0 16px;">Thank you for your cake request. Unfortunately we are not able to take it on.</p>
    ${paragraphs(data.message)}
    <p style="margin:24px 0 0;color:#6b5347;font-size:13px;">Order reference: ${escape(data.orderNumber)}</p>
    ${data.contactLines?.length ? `<p style="margin:8px 0 0;color:#6b5347;font-size:13px;">${data.contactLines.map(escape).join("<br />")}</p>` : ""}
    ${data.footer ? `<p style="margin:16px 0 0;color:#6b5347;font-size:12px;">${escape(data.footer)}</p>` : ""}
  `;

  return {
    subject: `About your cake request — ${data.orderNumber}`,
    html: SHELL("About your cake request", inner),
    text: [
      `Dear ${data.customerName},`,
      "",
      "Thank you for your cake request. Unfortunately we are not able to take it on.",
      "",
      data.message,
      "",
      `Order reference: ${data.orderNumber}`,
      ...(data.contactLines ?? []),
      data.footer ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/* ── Cancellation ────────────────────────────────────────────────────────── */

export function cancellationEmail(data: {
  customerName: string;
  orderNumber: string;
  message: string;
  depositWasPaid: boolean;
  footer?: string;
}) {
  const inner = `
    <p style="margin:0 0 16px;">Dear ${escape(data.customerName)},</p>
    <p style="margin:0 0 16px;">Your order ${escape(data.orderNumber)} has been cancelled.</p>
    ${paragraphs(data.message)}
    ${
      data.depositWasPaid
        ? `<p style="margin:0 0 16px;padding:14px 16px;background:#f0e4e8;border-left:3px solid #6d3b4d;color:#2a1d17;">${escape(DEPOSIT_NOTICE)}</p>`
        : ""
    }
    ${data.footer ? `<p style="margin:16px 0 0;color:#6b5347;font-size:12px;">${escape(data.footer)}</p>` : ""}
  `;

  return {
    subject: `Your order has been cancelled — ${data.orderNumber}`,
    html: SHELL("Your order has been cancelled", inner),
    text: [
      `Dear ${data.customerName},`,
      "",
      `Your order ${data.orderNumber} has been cancelled.`,
      "",
      data.message,
      "",
      data.depositWasPaid ? DEPOSIT_NOTICE : "",
      data.footer ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
