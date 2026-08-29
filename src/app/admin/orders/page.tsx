import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin/auth";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  listOrders,
  type OrderStatus,
} from "@/lib/admin/orders";
import { formatPounds } from "@/lib/admin/money";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

/**
 * Every order, searchable.
 *
 * Filters live in the query string rather than in component state, so a
 * particular view can be bookmarked, reloaded and linked to — the dashboard
 * cards link straight into a filtered list. It also means the whole thing is
 * rendered on the server with no client JavaScript beyond the form submitting
 * itself.
 *
 * The table is a table on a wide screen and a stack of cards on a narrow one,
 * rather than a table forced to scroll sideways on a phone.
 */

type Search = {
  search?: string;
  status?: string;
  style?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!(await isAdminRequest())) redirect("/admin/login");

  const params = await searchParams;

  const result = await listOrders({
    search: params.search,
    status: params.status,
    cakeStyle: params.style,
    from: params.from,
    to: params.to,
    sort:
      params.sort === "oldest" || params.sort === "required"
        ? params.sort
        : "newest",
    page: Number(params.page) || 1,
  });

  /** Keeps the current filters when moving between pages. */
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") query.set(key, String(value));
    }
    query.set("page", String(page));
    return `/admin/orders?${query}`;
  };

  const field =
    "w-full border border-espresso/20 bg-ivory px-3 py-2.5 text-sm text-cocoa outline-none focus:border-espresso";

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display-sm text-espresso">Orders</h1>
        <p className="text-sm text-cocoa-soft">
          {result.total} order{result.total === 1 ? "" : "s"}
        </p>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────
          A plain GET form: the browser builds the query string, so no
          JavaScript is needed for any of this to work. */}
      <form method="get" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label htmlFor="search" className="sr-only">
            Search by order number, name or email
          </label>
          <input
            id="search"
            name="search"
            type="search"
            defaultValue={params.search ?? ""}
            placeholder="Order number, name or email"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="status" className="sr-only">
            Status
          </label>
          <select id="status" name="status" defaultValue={params.status ?? "all"} className={field}>
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status as OrderStatus]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="style" className="sr-only">
            Cake style
          </label>
          <select id="style" name="style" defaultValue={params.style ?? "all"} className={field}>
            <option value="all">Any style</option>
            <option value="personalised">Personalised</option>
            <option value="classic">Classic</option>
          </select>
        </div>

        <div>
          <label htmlFor="from" className="mb-1 block text-[0.625rem] uppercase tracking-[0.14em] text-cocoa-soft">
            Needed from
          </label>
          <input id="from" name="from" type="date" defaultValue={params.from ?? ""} className={field} />
        </div>

        <div>
          <label htmlFor="to" className="mb-1 block text-[0.625rem] uppercase tracking-[0.14em] text-cocoa-soft">
            Needed to
          </label>
          <input id="to" name="to" type="date" defaultValue={params.to ?? ""} className={field} />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="sort" className="sr-only">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={params.sort ?? "newest"} className={field}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="required">Nearest date needed</option>
          </select>
        </div>

        <div className="flex gap-3 lg:col-span-2">
          <button type="submit" className="btn btn-solid flex-1 py-2.5 text-xs">
            Apply
          </button>
          <Link href="/admin/orders" className="btn btn-outline flex-1 py-2.5 text-center text-xs">
            Clear
          </Link>
        </div>
      </form>

      {/* ── Results ───────────────────────────────────────────────────── */}
      {result.rows.length === 0 ? (
        <p className="mt-12 text-cocoa-soft">No orders match that.</p>
      ) : (
        <>
          {/* Wide screens: a table. */}
          <table className="mt-10 hidden w-full border-collapse lg:table">
            <thead>
              <tr className="border-b border-espresso/20 text-left">
                {["Order", "Customer", "Needed", "Style", "Occasion", "Total", "Status", "Received"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="py-3 pr-4 text-[0.625rem] uppercase tracking-[0.16em] font-medium text-cocoa-soft"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((order) => (
                <tr key={order.id} className="border-b border-espresso/8 hover:bg-vanilla">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-sm text-espresso underline-offset-4 hover:underline"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-sm text-cocoa">{order.customer_name}</td>
                  <td className="py-3 pr-4 text-sm text-cocoa">{order.required_date}</td>
                  <td className="py-3 pr-4 text-sm capitalize text-cocoa">{order.cake_style}</td>
                  <td className="py-3 pr-4 text-sm text-cocoa">{order.occasion}</td>
                  <td className="py-3 pr-4 text-sm text-cocoa">
                    {order.total_pence === null ? (
                      <span className="text-cocoa-soft">—</span>
                    ) : (
                      <>
                        {formatPounds(order.total_pence)}
                        {order.quote_status === "draft" && (
                          <span className="ml-1.5 text-[0.625rem] uppercase text-cocoa-soft">
                            draft
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 text-sm text-cocoa-soft">
                    {order.created_at.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Narrow screens: cards, so nothing scrolls sideways. */}
          <ul className="mt-8 space-y-3 lg:hidden">
            {result.rows.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="block border border-espresso/12 bg-vanilla p-4 transition-colors hover:border-espresso/35"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-sm text-espresso">
                      {order.order_number}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-cocoa">{order.customer_name}</p>
                  <p className="mt-1 text-sm text-cocoa-soft">
                    Needed {order.required_date} · {order.occasion} ·{" "}
                    <span className="capitalize">{order.cake_style}</span>
                  </p>
                  {order.total_pence !== null && (
                    <p className="mt-1 text-sm text-cocoa">
                      {formatPounds(order.total_pence)}
                      {order.quote_status === "draft" && " (draft)"}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {result.pages > 1 && (
            <nav aria-label="Pages" className="mt-10 flex items-center gap-3">
              {result.page > 1 && (
                <Link href={pageHref(result.page - 1)} className="btn btn-outline py-2 text-xs">
                  Previous
                </Link>
              )}
              <span className="text-sm text-cocoa-soft">
                Page {result.page} of {result.pages}
              </span>
              {result.page < result.pages && (
                <Link href={pageHref(result.page + 1)} className="btn btn-outline py-2 text-xs">
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
