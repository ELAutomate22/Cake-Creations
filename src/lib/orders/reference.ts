import "server-only";
import { query } from "@/lib/d1/client";

/**
 * The customer-facing order reference: EC-2026-0042.
 *
 * Two properties matter. It has to be readable over the phone, and it has to
 * carry nothing. It is derived from the year and a per-year counter, never
 * from anything about the customer, so showing it — in a confirmation, an
 * email subject, a note on a cake box — gives nothing away.
 *
 * The counter is per calendar year, so the numbers stay short and a year is
 * legible at a glance.
 */

const PREFIX = "EC";

/**
 * The next reference for this year.
 *
 * Derived by asking the database for the highest number already issued this
 * year rather than counting rows, so a deleted order never causes a reference
 * to be handed out twice. `order_number` is UNIQUE, so a collision between two
 * simultaneous submissions fails the insert rather than quietly duplicating —
 * which is why the caller retries.
 */
export async function nextOrderNumber(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `${PREFIX}-${year}-`;

  const { rows } = await query<{ highest: string | null }>(
    `SELECT MAX(order_number) AS highest FROM orders WHERE order_number LIKE ?`,
    [`${prefix}%`],
  );

  const highest = rows[0]?.highest ?? null;
  const previous = highest ? Number.parseInt(highest.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(previous) ? previous + 1 : 1;

  return `${prefix}${String(next).padStart(4, "0")}`;
}
