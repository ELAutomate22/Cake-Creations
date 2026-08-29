import { STATUS_LABELS, type OrderStatus } from "@/lib/admin/fields";

/**
 * A status, shown as a badge.
 *
 * Colour groups the states — waiting on us, waiting on the customer, in the
 * kitchen, closed — but the label is always written out. A badge that relies
 * on colour alone is unreadable to anyone who cannot distinguish the shades,
 * and unguessable to anyone new to the system.
 */

const TONE: Record<OrderStatus, string> = {
  new_request: "border-plum/40 bg-plum/10 text-plum-deep",
  reviewing: "border-plum/30 bg-plum/5 text-plum-deep",
  quote_ready: "border-caramel/50 bg-caramel/15 text-espresso",
  awaiting_deposit: "border-caramel/50 bg-caramel/15 text-espresso",
  deposit_paid: "border-success/40 bg-success/10 text-success",
  in_progress: "border-espresso/25 bg-espresso/5 text-espresso",
  ready: "border-success/40 bg-success/10 text-success",
  awaiting_final_payment: "border-caramel/50 bg-caramel/15 text-espresso",
  paid_in_full: "border-success/40 bg-success/10 text-success",
  completed: "border-espresso/20 bg-espresso/5 text-cocoa-soft",
  declined: "border-danger/30 bg-danger/5 text-danger",
  cancelled: "border-danger/30 bg-danger/5 text-danger",
  refunded: "border-danger/30 bg-danger/5 text-danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap border px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.12em] ${TONE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
