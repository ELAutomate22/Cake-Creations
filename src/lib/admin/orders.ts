import "server-only";
import { query } from "@/lib/d1/client";

/**
 * Reading and changing orders, for the owner.
 *
 * Everything here assumes the caller has already been checked. Nothing in this
 * file authenticates — the routes do that before calling in — so no function
 * here may be exposed directly.
 *
 * The rule the whole module is built around: `orders` holds what the customer
 * sent and is never written to again, apart from status and its timestamps.
 * Admin edits go to `order_confirmed`. `effectiveOrder` merges the two for
 * display, preferring a confirmed value where one exists.
 */

export {
  ORDER_STATUSES,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  EDITABLE_FIELDS,
  FIELD_LABELS,
} from "./fields";
export type { OrderStatus, EditableField } from "./fields";

import {
  EDITABLE_FIELDS as FIELDS,
  type EditableField,
  type OrderStatus,
} from "./fields";

export type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  required_date: string;
  cake_style: string;
  occasion: string;
  [key: string]: unknown;
};

export type OrderListRow = {
  id: string;
  order_number: string;
  customer_name: string;
  required_date: string;
  cake_style: string;
  occasion: string;
  status: OrderStatus;
  created_at: string;
  total_pence: number | null;
  quote_status: string | null;
};

/* ── The list ────────────────────────────────────────────────────────────── */

export type OrderFilters = {
  search?: string;
  status?: string;
  cakeStyle?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "required";
  page?: number;
  perPage?: number;
};

export async function listOrders(filters: OrderFilters = {}) {
  const where: string[] = [];
  const params: unknown[] = [];

  /*
   * Search across the order number and the customer.
   *
   * Parameterised, like everything else here. The value is never concatenated
   * into the SQL — only the `?` placeholders are, and those are fixed text.
   */
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`;
    where.push(
      `(LOWER(o.order_number) LIKE ? OR LOWER(o.customer_name) LIKE ? OR LOWER(o.customer_email) LIKE ?)`,
    );
    params.push(term, term, term);
  }

  if (filters.status && filters.status !== "all") {
    where.push(`o.status = ?`);
    params.push(filters.status);
  }

  if (filters.cakeStyle && filters.cakeStyle !== "all") {
    // The confirmed style wins where the owner has changed it.
    where.push(`COALESCE(c.cake_style, o.cake_style) = ?`);
    params.push(filters.cakeStyle);
  }

  if (filters.from) {
    where.push(`COALESCE(c.required_date, o.required_date) >= ?`);
    params.push(filters.from);
  }

  if (filters.to) {
    where.push(`COALESCE(c.required_date, o.required_date) <= ?`);
    params.push(filters.to);
  }

  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const order =
    filters.sort === "oldest"
      ? `o.created_at ASC`
      : filters.sort === "required"
        ? `COALESCE(c.required_date, o.required_date) ASC`
        : `o.created_at DESC`;

  const perPage = Math.min(Math.max(filters.perPage ?? 25, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const offset = (page - 1) * perPage;

  const { rows: counted } = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM orders o
       LEFT JOIN order_confirmed c ON c.order_id = o.id
       ${clause}`,
    params,
  );

  const { rows } = await query<OrderListRow>(
    `SELECT
        o.id,
        o.order_number,
        o.customer_name,
        COALESCE(c.required_date, o.required_date) AS required_date,
        COALESCE(c.cake_style, o.cake_style)       AS cake_style,
        COALESCE(c.occasion, o.occasion)           AS occasion,
        o.status,
        o.created_at,
        -- The most recent quote, whether draft or sent, for the list column.
        (SELECT q.total_pence FROM order_quotes q
          WHERE q.order_id = o.id ORDER BY q.version DESC LIMIT 1) AS total_pence,
        (SELECT q.status FROM order_quotes q
          WHERE q.order_id = o.id ORDER BY q.version DESC LIMIT 1) AS quote_status
      FROM orders o
      LEFT JOIN order_confirmed c ON c.order_id = o.id
      ${clause}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset],
  );

  const total = counted[0]?.total ?? 0;

  return { rows, total, page, perPage, pages: Math.ceil(total / perPage) || 1 };
}

/** Counts per status, for the dashboard. */
export async function statusCounts(): Promise<Record<string, number>> {
  const { rows } = await query<{ status: string; count: number }>(
    `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`,
  );

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

/* ── One order ───────────────────────────────────────────────────────────── */

export async function getOrder(id: string) {
  const { rows } = await query<OrderRow>(`SELECT * FROM orders WHERE id = ?`, [id]);
  return rows[0] ?? null;
}

export async function getConfirmed(orderId: string) {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM order_confirmed WHERE order_id = ?`,
    [orderId],
  );
  return rows[0] ?? null;
}

/**
 * The order as it now stands, with any admin change applied over the original.
 *
 * The original stays available separately — this is only what the cake is
 * currently to be, not a replacement for what was asked for.
 */
export function effectiveOrder(
  original: OrderRow,
  confirmed: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!confirmed) return { ...original };

  const merged: Record<string, unknown> = { ...original };
  for (const field of FIELDS) {
    const value = confirmed[field];
    if (value !== null && value !== undefined) merged[field] = value;
  }
  return merged;
}

/** Fields the owner has actually changed, for showing "was / now". */
export function changedFields(
  original: OrderRow,
  confirmed: Record<string, unknown> | null,
): EditableField[] {
  if (!confirmed) return [];

  return FIELDS.filter((field) => {
    const value = confirmed[field];
    if (value === null || value === undefined) return false;
    return String(value) !== String(original[field] ?? "");
  });
}

export async function getImages(orderId: string) {
  const { rows } = await query<{
    id: string;
    r2_object_key: string;
    original_filename: string | null;
    mime_type: string;
    file_size: number;
  }>(
    `SELECT id, r2_object_key, original_filename, mime_type, file_size
       FROM order_images WHERE order_id = ? ORDER BY sort_order`,
    [orderId],
  );
  return rows;
}

export async function getItems(orderId: string) {
  const { rows } = await query<{
    id: string;
    description: string;
    amount_pence: number;
    sort_order: number;
  }>(
    `SELECT id, description, amount_pence, sort_order
       FROM order_items WHERE order_id = ? ORDER BY sort_order, created_at`,
    [orderId],
  );
  return rows;
}

export async function getQuotes(orderId: string) {
  const { rows } = await query<{
    id: string;
    version: number;
    subtotal_pence: number;
    discount_pence: number;
    delivery_fee_pence: number;
    total_pence: number;
    deposit_percentage: number;
    deposit_amount_pence: number;
    remaining_balance_pence: number;
    admin_message: string | null;
    items_json: string | null;
    status: string;
    created_at: string;
    sent_at: string | null;
  }>(
    `SELECT * FROM order_quotes WHERE order_id = ? ORDER BY version DESC`,
    [orderId],
  );
  return rows;
}

export async function getMessages(orderId: string) {
  const { rows } = await query<{
    id: string;
    message_type: string;
    recipient_email: string;
    subject: string;
    body: string;
    delivery_status: string;
    provider_message_id: string | null;
    sent_at: string | null;
    created_at: string;
  }>(
    `SELECT * FROM order_messages WHERE order_id = ? ORDER BY created_at DESC`,
    [orderId],
  );
  return rows;
}

export async function getActivity(orderId: string) {
  const { rows } = await query<{
    id: string;
    activity_type: string;
    description: string;
    metadata_json: string | null;
    created_at: string;
  }>(
    `SELECT * FROM order_activity WHERE order_id = ? ORDER BY created_at DESC`,
    [orderId],
  );
  return rows;
}

/* ── Writing ─────────────────────────────────────────────────────────────── */

export async function recordActivity(
  orderId: string,
  type: string,
  description: string,
  metadata?: unknown,
): Promise<void> {
  await query(
    `INSERT INTO order_activity (id, order_id, activity_type, description, metadata_json, created_at)
       VALUES (?,?,?,?,?,?)`,
    [
      crypto.randomUUID(),
      orderId,
      type,
      description,
      metadata === undefined ? null : JSON.stringify(metadata),
      new Date().toISOString(),
    ],
  );
}

export async function setStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const now = new Date().toISOString();

  // The terminal timestamp is what the 30-day retention counts from, so it is
  // stamped as the status is set rather than inferred later.
  const stamp: Partial<Record<string, string>> = {
    completed: "completed_at",
    cancelled: "cancelled_at",
    declined: "declined_at",
    refunded: "refunded_at",
  };

  const column = stamp[status];

  await query(
    column
      ? `UPDATE orders SET status = ?, updated_at = ?, ${column} = ? WHERE id = ?`
      : `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`,
    column ? [status, now, now, orderId] : [status, now, orderId],
  );
}

/**
 * Saves an admin edit.
 *
 * Writes only to `order_confirmed`, never to `orders`. A field set back to its
 * original value is stored as NULL, so "changed" always means genuinely
 * different from what the customer sent.
 */
export async function saveConfirmed(
  orderId: string,
  original: OrderRow,
  values: Partial<Record<EditableField, string>>,
  internalNotes?: string,
): Promise<EditableField[]> {
  const now = new Date().toISOString();
  const existing = await getConfirmed(orderId);

  const changed: EditableField[] = [];
  const columns: string[] = [];
  const params: unknown[] = [];

  for (const field of FIELDS) {
    if (!(field in values)) continue;

    const raw = values[field];
    const next = raw === undefined || raw === "" ? null : raw;
    const differs = next !== null && String(next) !== String(original[field] ?? "");

    columns.push(field);
    params.push(differs ? next : null);

    if (differs) changed.push(field);
  }

  if (internalNotes !== undefined) {
    columns.push("internal_notes");
    params.push(internalNotes.trim() === "" ? null : internalNotes);
  }

  if (columns.length === 0) return [];

  if (existing) {
    await query(
      `UPDATE order_confirmed SET ${columns.map((c) => `${c} = ?`).join(", ")}, updated_at = ?
         WHERE order_id = ?`,
      [...params, now, orderId],
    );
  } else {
    await query(
      `INSERT INTO order_confirmed (order_id, ${columns.join(", ")}, created_at, updated_at)
         VALUES (?, ${columns.map(() => "?").join(", ")}, ?, ?)`,
      [orderId, ...params, now, now],
    );
  }

  await query(`UPDATE orders SET updated_at = ? WHERE id = ?`, [now, orderId]);

  return changed;
}
