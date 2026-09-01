import "server-only";
import { query } from "@/lib/d1/client";
import { deleteObject, isStorageConfigured } from "@/lib/r2/client";

/**
 * Deleting closed orders.
 *
 * The rule, exactly: an order is deleted 30 days after it *closed* — not 30
 * days after it was created. A wedding cake ordered a year ahead is an active
 * order for a year, and deleting it for being old would destroy live work.
 * That is why the window is measured from the terminal timestamp, and why an
 * order with none of those timestamps set is never eligible however old it is.
 *
 * Order of operations matters. R2 objects go first, because an image whose
 * database row has already been deleted is an orphan nobody can find again —
 * the row is the only record of where the object lives. If R2 fails, the order
 * is left intact and retried on the next run, which is recoverable; the
 * reverse is not.
 *
 * Nothing personal is written to the purge log. A record kept for privacy
 * reasons must not become a record of who the customers were.
 */

export const RETENTION_DAYS = 30;

export type PurgeResult = {
  eligible: number;
  ordersPurged: number;
  imagesPurged: number;
  failures: number;
};

/** Orders closed longer ago than the retention window. */
export async function findEligibleOrders(days = RETENTION_DAYS): Promise<string[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { rows } = await query<{ id: string }>(
    `SELECT id FROM orders
      WHERE status IN ('completed', 'cancelled', 'declined', 'refunded')
        AND COALESCE(completed_at, cancelled_at, declined_at, refunded_at) IS NOT NULL
        AND COALESCE(completed_at, cancelled_at, declined_at, refunded_at) <= ?`,
    [cutoff],
  );

  return rows.map((row) => row.id);
}

/**
 * Deletes one order and everything belonging to it.
 *
 * Exported because the admin's own delete button uses it too. There should be
 * exactly one answer to "what does deleting an order remove", and a second
 * copy written beside a button is how the retention sweep and the button come
 * to disagree about whether reference photographs go with it.
 *
 * Child rows are removed explicitly rather than relying on cascade. D1 does
 * enforce foreign keys -- PRAGMA foreign_keys reports 1 -- so most of these
 * would go anyway, but not all of them declare a cascade, and the ones that do
 * declare it three migrations away from here. Deleting them by name means this
 * function is the thing that decides what a purge removes, and a schema edit
 * cannot quietly leave a customer's data behind while this still reports
 * success.
 */
export async function purgeOrder(orderId: string): Promise<{ images: number }> {
  // The keys first: after the rows are gone, nothing points at the objects.
  const { rows: images } = await query<{ r2_object_key: string }>(
    `SELECT r2_object_key FROM order_images WHERE order_id = ?`,
    [orderId],
  );

  let removed = 0;

  if (images.length > 0) {
    if (!isStorageConfigured()) {
      // Refusing here is deliberate. Deleting the rows now would strand the
      // photographs in the bucket with nothing left to identify them.
      throw new Error("R2 is not configured; refusing to orphan reference images.");
    }

    for (const image of images) {
      await deleteObject(image.r2_object_key);
      removed += 1;
    }
  }

  for (const table of [
    "order_access_tokens",
    "order_images",
    "order_items",
    "order_quotes",
    "order_messages",
    "order_activity",
    "order_confirmed",
    "payments",
  ]) {
    await query(`DELETE FROM ${table} WHERE order_id = ?`, [orderId]);
  }

  // The order last, so a failure part-way through leaves something to retry.
  await query(`DELETE FROM orders WHERE id = ?`, [orderId]);

  return { images: removed };
}

/**
 * One pass of the retention sweep.
 *
 * A failure on one order does not stop the rest: the failure is counted, the
 * order is left whole, and the next run tries again. Nothing is reported as
 * deleted unless it actually was.
 */
export async function runPurge(days = RETENTION_DAYS): Promise<PurgeResult> {
  const eligible = await findEligibleOrders(days);

  let ordersPurged = 0;
  let imagesPurged = 0;
  let failures = 0;
  let lastError: string | null = null;

  for (const orderId of eligible) {
    try {
      const { images } = await purgeOrder(orderId);
      ordersPurged += 1;
      imagesPurged += images;
    } catch (error) {
      failures += 1;
      // The order id is not personal, but it is not written to the log either.
      lastError = error instanceof Error ? error.name : "unknown";
      console.error("Purge failed for one order:", error);
    }
  }

  await query(
    `INSERT INTO purge_runs (id, ran_at, orders_purged, images_purged, failures, error_code)
       VALUES (?,?,?,?,?,?)`,
    [
      crypto.randomUUID(),
      new Date().toISOString(),
      ordersPurged,
      imagesPurged,
      failures,
      lastError,
    ],
  );

  return { eligible: eligible.length, ordersPurged, imagesPurged, failures };
}
