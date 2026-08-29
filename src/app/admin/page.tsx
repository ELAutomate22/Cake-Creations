import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin/auth";
import { isDatabaseConfigured } from "@/lib/d1/client";
import { STATUS_LABELS, listOrders, statusCounts, type OrderStatus } from "@/lib/admin/orders";
import { formatPounds } from "@/lib/admin/money";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * What needs attention today.
 *
 * Ordered by what the owner has to act on rather than by what is easy to
 * count. New requests come first because they are the only state where the
 * customer is waiting on a reply and nothing has been said yet.
 *
 * No charts and no totals-over-time. This is opened between cakes, on a phone,
 * to see what is outstanding.
 */

const ATTENTION: OrderStatus[] = [
  "new_request",
  "reviewing",
  "quote_ready",
  "awaiting_deposit",
];

const IN_HAND: OrderStatus[] = [
  "deposit_paid",
  "in_progress",
  "ready",
  "awaiting_final_payment",
  "paid_in_full",
];

export default async function AdminDashboard() {
  if (!(await isAdminRequest())) redirect("/admin/login");

  if (!isDatabaseConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p className="border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          The database is not configured, so orders cannot be read.
        </p>
      </div>
    );
  }

  const [counts, upcoming] = await Promise.all([
    statusCounts(),
    // Nearest date first, so the next cake to make is at the top.
    listOrders({ sort: "required", perPage: 8 }),
  ]);

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const card = (status: OrderStatus) => (
    <Link
      key={status}
      href={`/admin/orders?status=${status}`}
      className="border border-espresso/12 bg-vanilla px-5 py-5 transition-colors hover:border-espresso/35"
    >
      <span className="block font-serif text-3xl text-espresso">
        {counts[status] ?? 0}
      </span>
      <span className="mt-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
        {STATUS_LABELS[status]}
      </span>
    </Link>
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="display-sm text-espresso">Dashboard</h1>
      <p className="mt-2 text-cocoa-soft">
        {total === 0
          ? "No orders yet."
          : `${total} order${total === 1 ? "" : "s"} in total.`}
      </p>

      <h2 className="eyebrow mt-10 text-cocoa-soft">Needs attention</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ATTENTION.map(card)}
      </div>

      <h2 className="eyebrow mt-10 text-cocoa-soft">In hand</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {IN_HAND.map(card)}
      </div>

      <div className="mt-12 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl text-espresso">Next dates</h2>
        <Link
          href="/admin/orders"
          className="text-[0.8125rem] uppercase tracking-[0.14em] text-cocoa-soft hover:text-espresso"
        >
          All orders
        </Link>
      </div>

      {upcoming.rows.length === 0 ? (
        <p className="mt-4 text-cocoa-soft">Nothing booked in.</p>
      ) : (
        <ul className="mt-4 divide-y divide-espresso/10 border-y border-espresso/10">
          {upcoming.rows.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 transition-colors hover:bg-vanilla"
              >
                <span className="font-mono text-sm text-espresso">
                  {order.order_number}
                </span>
                <span className="text-cocoa">{order.customer_name}</span>
                <span className="text-sm text-cocoa-soft">{order.required_date}</span>
                <span className="ml-auto flex items-center gap-4">
                  {order.total_pence !== null && (
                    <span className="text-sm text-cocoa">
                      {formatPounds(order.total_pence)}
                    </span>
                  )}
                  <StatusBadge status={order.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
