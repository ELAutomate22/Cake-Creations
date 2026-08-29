import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/admin/auth";
import {
  ALLOWED_TRANSITIONS,
  EDITABLE_FIELDS,
  STATUS_LABELS,
  changedFields,
  effectiveOrder,
  getActivity,
  getConfirmed,
  getImages,
  getItems,
  getMessages,
  getOrder,
  getQuotes,
  type OrderStatus,
} from "@/lib/admin/orders";
import { defaultDepositPercentage } from "@/lib/admin/settings";
import { OrderWorkspace } from "@/components/admin/OrderWorkspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  return { title: order ? order.order_number : "Order" };
}

/**
 * One order, in full.
 *
 * Everything is read here on the server and handed down as plain data. The
 * customer's email, phone and the owner's internal notes are on this page, so
 * it has to be certain no unauthenticated request ever renders it — the check
 * is the first thing it does, before any query runs.
 */
export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminRequest())) redirect("/admin/login");

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const [confirmed, images, items, quotes, messages, activity, depositDefault] =
    await Promise.all([
      getConfirmed(id),
      getImages(id),
      getItems(id),
      getQuotes(id),
      getMessages(id),
      getActivity(id),
      defaultDepositPercentage(),
    ]);

  const effective = effectiveOrder(order, confirmed);
  const changed = changedFields(order, confirmed);

  // What the customer originally wrote, kept separate and never overwritten.
  const original: Record<string, string> = {};
  for (const field of EDITABLE_FIELDS) {
    original[field] = String(order[field] ?? "");
  }

  const current: Record<string, string> = {};
  for (const field of EDITABLE_FIELDS) {
    current[field] = String(effective[field] ?? "");
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
      <Link
        href="/admin/orders"
        className="text-[0.8125rem] uppercase tracking-[0.14em] text-cocoa-soft hover:text-espresso"
      >
        ← All orders
      </Link>

      <OrderWorkspace
        orderId={id}
        orderNumber={order.order_number}
        status={order.status}
        allowedStatuses={(ALLOWED_TRANSITIONS[order.status] ?? []) as OrderStatus[]}
        statusLabels={STATUS_LABELS}
        customer={{
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
        }}
        createdAt={order.created_at}
        original={original}
        current={current}
        changedFields={changed}
        internalNotes={String(confirmed?.internal_notes ?? "")}
        images={images.map((image) => ({
          id: image.id,
          filename: image.original_filename,
          mimeType: image.mime_type,
          fileSize: image.file_size,
        }))}
        items={items.map((item) => ({
          description: item.description,
          amountPence: item.amount_pence,
        }))}
        quotes={quotes.map((quote) => ({
          version: quote.version,
          status: quote.status,
          subtotalPence: quote.subtotal_pence,
          discountPence: quote.discount_pence,
          deliveryFeePence: quote.delivery_fee_pence,
          totalPence: quote.total_pence,
          depositPercentage: quote.deposit_percentage,
          depositAmountPence: quote.deposit_amount_pence,
          remainingBalancePence: quote.remaining_balance_pence,
          message: quote.admin_message,
          items: quote.items_json
            ? (JSON.parse(quote.items_json) as {
                description: string;
                amountPence: number;
              }[])
            : [],
          createdAt: quote.created_at,
          sentAt: quote.sent_at,
        }))}
        messages={messages.map((message) => ({
          id: message.id,
          type: message.message_type,
          subject: message.subject,
          body: message.body,
          status: message.delivery_status,
          sentAt: message.sent_at,
          createdAt: message.created_at,
        }))}
        activity={activity.map((entry) => ({
          id: entry.id,
          type: entry.activity_type,
          description: entry.description,
          createdAt: entry.created_at,
        }))}
        depositDefault={depositDefault}
      />
    </div>
  );
}
