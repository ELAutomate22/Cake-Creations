"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The state of a payment, as the server understands it.
 *
 * Polls briefly while the webhook lands. Stripe usually delivers within a
 * second or two, but the customer's browser can beat it back, so the honest
 * first message is that the payment is being confirmed rather than that it is
 * done.
 *
 * If it has not settled within the polling window, the page stops asking and
 * says the payment is being processed. It never gives up into an error: the
 * money may well have been taken, and telling someone their payment failed
 * when it did not is the worst answer available.
 */

const INTERVAL_MS = 2000;
const ATTEMPTS = 8;

export function PaymentStatus({
  sessionId,
  type,
}: {
  sessionId: string | null;
  type: "deposit" | "balance";
}) {
  // With no session in the URL there is nothing to poll, so the starting
  // state is derived here rather than corrected by an effect a frame later.
  const [status, setStatus] = useState<"pending" | "paid" | "slow">(
    sessionId ? "pending" : "slow",
  );

  useEffect(() => {
    if (!sessionId) return;

    let attempts = 0;
    let cancelled = false;

    const check = async () => {
      if (cancelled) return;

      try {
        const response = await fetch(`/api/payment-status?session=${sessionId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as { status?: string };

        if (cancelled) return;

        if (payload.status === "paid") {
          setStatus("paid");
          return;
        }
      } catch {
        // Ignored: another attempt follows, and a network blip here says
        // nothing about whether the payment succeeded.
      }

      attempts += 1;
      if (attempts >= ATTEMPTS) {
        setStatus("slow");
        return;
      }

      window.setTimeout(check, INTERVAL_MS);
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const noun = type === "deposit" ? "deposit" : "balance";

  return (
    <>
      <h1 className="display-sm mt-4 text-espresso">
        {status === "paid" ? "Thank you — payment received" : "Thank you"}
      </h1>

      <p className="voice mt-5 text-cocoa" role="status" aria-live="polite">
        {status === "paid"
          ? type === "deposit"
            ? "Your deposit has been received and your order is confirmed. We have sent you a confirmation email."
            : "Your balance has been paid in full. Thank you."
          : status === "pending"
            ? `Your ${noun} payment is being confirmed. This usually takes a few seconds.`
            : `Your ${noun} payment is being processed. There is nothing more for you to do — we will be in touch shortly, and you will have a receipt from Stripe.`}
      </p>

      {status === "pending" && (
        <p className="mt-4 text-sm text-cocoa-soft">Please do not pay again.</p>
      )}

      <Link href="/" className="btn btn-outline mt-10 inline-block">
        Back to the site
      </Link>
    </>
  );
}
