import type { Metadata } from "next";
import { business } from "@/content/site";
import { PaymentStatus } from "@/components/payments/PaymentStatus";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment received",
  robots: { index: false, follow: false },
};

/**
 * Where Stripe sends the customer after Checkout.
 *
 * Reaching this page proves only that a browser was redirected here. It is not
 * evidence that a card was charged — the URL can be opened by hand — so this
 * page never records anything and never claims the payment is complete on its
 * own authority. It asks the server, which answers from what the verified
 * webhook has written.
 */
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; session?: string }>;
}) {
  const { type, session } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-20">
      <div className="w-full max-w-lg text-center">
        <p className="eyebrow text-cocoa-soft">{business.name}</p>
        <PaymentStatus
          sessionId={session ?? null}
          type={type === "balance" ? "balance" : "deposit"}
        />
      </div>
    </main>
  );
}
