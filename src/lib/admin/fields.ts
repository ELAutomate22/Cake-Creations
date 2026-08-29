/**
 * Order vocabulary: statuses, labels, and the fields an owner may edit.
 *
 * Deliberately free of any server import. The admin workspace runs in the
 * browser and needs these names, and the moment this file imports anything
 * that touches D1, the whole database client follows it into the bundle —
 * which is exactly what `server-only` exists to prevent.
 *
 * If something here ever needs a database, it belongs in orders.ts instead.
 */

export const ORDER_STATUSES = [
  "new_request",
  "reviewing",
  "quote_ready",
  "awaiting_deposit",
  "deposit_paid",
  "in_progress",
  "ready",
  "awaiting_final_payment",
  "paid_in_full",
  "completed",
  "declined",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new_request: "New request",
  reviewing: "Reviewing",
  quote_ready: "Quote ready",
  awaiting_deposit: "Awaiting deposit",
  deposit_paid: "Deposit paid",
  in_progress: "In progress",
  ready: "Ready",
  awaiting_final_payment: "Awaiting final payment",
  paid_in_full: "Paid in full",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** States an order stops in. Retention counts 30 days from these. */
export const TERMINAL_STATUSES: OrderStatus[] = [
  "completed",
  "declined",
  "cancelled",
  "refunded",
];

/**
 * Which statuses the owner may move to from where they are.
 *
 * Written out rather than allowing anything, so the interface cannot offer to
 * mark a brand new request as paid in full. deposit_paid and paid_in_full are
 * absent from every hand-operated transition: they mean money arrived, and
 * only a verified payment event may assert that. Phase 3 sets them.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new_request: ["reviewing", "quote_ready", "declined", "cancelled"],
  reviewing: ["quote_ready", "declined", "cancelled"],
  quote_ready: ["awaiting_deposit", "reviewing", "declined", "cancelled"],
  awaiting_deposit: ["quote_ready", "cancelled", "declined"],
  deposit_paid: ["in_progress", "cancelled"],
  in_progress: ["ready", "cancelled"],
  ready: ["awaiting_final_payment", "completed", "cancelled"],
  awaiting_final_payment: ["ready", "cancelled"],
  paid_in_full: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: [],
  refunded: [],
};

/** The content fields an owner may change after submission. */
export const EDITABLE_FIELDS = [
  "occasion",
  "occasion_other",
  "cake_style",
  "servings",
  "flavour",
  "flavour_other",
  "theme",
  "colours",
  "cake_name_text",
  "age_number",
  "cake_message",
  "design_requirements",
  "required_date",
  "fulfilment_type",
  "delivery_address",
  "delivery_postcode",
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

export const FIELD_LABELS: Record<EditableField, string> = {
  occasion: "Occasion",
  occasion_other: "Occasion (other)",
  cake_style: "Cake style",
  servings: "Servings",
  flavour: "Flavour",
  flavour_other: "Flavour (other)",
  theme: "Theme",
  colours: "Colours",
  cake_name_text: "Name or text",
  age_number: "Age or number",
  cake_message: "Cake message",
  design_requirements: "Design requirements",
  required_date: "Date needed",
  fulfilment_type: "Fulfilment",
  delivery_address: "Delivery address",
  delivery_postcode: "Postcode",
};
