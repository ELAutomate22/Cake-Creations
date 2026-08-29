/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CAKE REQUEST — WORDING
 * ═══════════════════════════════════════════════════════════════════════════
 * Everything the ordering pages say, in one place, so the wording can be
 * changed without touching the form.
 *
 * The tone to keep: this is a request, not a purchase. Nothing here should
 * imply a price has been agreed, a date has been held, or an order exists.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const orderCopy = {
  eyebrow: "Request a cake",
  heading: "Tell us about your cake",
  standfirst:
    "A few questions about the occasion, the cake and the day it is needed. Nothing is charged and nothing is confirmed at this stage — we will read what you send and come back to you with a quote.",

  /** The one sentence that has to be unmistakable. */
  notAnOrder:
    "Sending this does not confirm your order. We will check availability and send you a quote first.",

  steps: [
    { id: "occasion", title: "Your occasion", hint: "What are we celebrating?" },
    { id: "cake", title: "Your cake", hint: "Style, size and flavour." },
    { id: "personalisation", title: "Personalisation", hint: "How it should look and read." },
    { id: "images", title: "Reference images", hint: "Optional — up to three." },
    { id: "fulfilment", title: "Date & fulfilment", hint: "When and how you will receive it." },
    { id: "details", title: "Your details", hint: "How to reach you." },
    { id: "review", title: "Review & send", hint: "Check everything over." },
  ],

  success: {
    heading: "Thank you — we have your cake request.",
    body: "We will read through the information you have sent and come back to you with your quote and deposit details.",
    referenceLabel: "Your reference number",
    afterword:
      "Please keep this reference. Nothing is confirmed until a quote has been accepted and a deposit paid.",
  },

  /** Explicit answers, so a field that does not apply is still answered. */
  noneOptions: {
    theme: "No specific theme",
    colours: "No preference",
    nameText: "No name or text",
    age: "No age or number",
    message: "No written message",
    requirements: "Nothing further",
  },
} as const;

/**
 * The three policies a customer accepts, and the sentence they accept them by.
 *
 * The consent sentence is deliberately blunt about the deposit. A customer
 * finding out later that a payment was non-refundable is the single most
 * predictable complaint this system could produce.
 */
export const orderConsent = {
  policies: [
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Order & Cancellation Policy", href: "/order-policy" },
  ],

  statement:
    "I understand that submitting this request does not confirm my order. If my request is accepted, a quote and deposit payment request will be sent to me. Once a deposit has been paid, the deposit is non-refundable.",
} as const;
