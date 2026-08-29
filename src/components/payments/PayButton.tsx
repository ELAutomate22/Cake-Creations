"use client";

import { useState } from "react";
import { DEPOSIT_NOTICE } from "@/lib/email/templates";

/**
 * The payment action on a customer-facing page.
 *
 * It sends a token and, for a deposit, the acceptance. It does not send an
 * amount — there is no amount in this component at all. The figure shown above
 * it came from the server, and the figure charged is worked out by the server
 * again when the session is created.
 *
 * The button disables itself the moment it is pressed and stays disabled while
 * the browser is being handed to Stripe, so a double-click or an impatient
 * second press cannot open two sessions.
 */

export function PayButton({
  token,
  label,
  requireAcceptance,
  disabled,
  disabledReason,
}: {
  token: string;
  label: string;
  /** Deposits require the non-refundable condition to be accepted first. */
  requireAcceptance: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return (
      <p className="mt-8 border border-espresso/15 bg-vanilla px-5 py-4 text-sm text-cocoa">
        {disabledReason}
      </p>
    );
  }

  const blocked = requireAcceptance && !accepted;

  return (
    <div className="mt-8">
      {requireAcceptance && (
        <label className="flex cursor-pointer items-start gap-3 border border-plum/30 bg-plum/5 px-5 py-4 text-sm text-espresso">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-plum"
          />
          <span>
            I understand and agree that once my deposit has been paid, the deposit is
            non-refundable.
          </span>
        </label>
      )}

      <button
        type="button"
        disabled={busy || blocked}
        onClick={async () => {
          setBusy(true);
          setError(null);

          try {
            const response = await fetch("/api/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, acceptedTerms: accepted }),
            });

            const payload = (await response.json()) as {
              ok: boolean;
              url?: string;
              message?: string;
            };

            if (!payload.ok || !payload.url) {
              setError(payload.message ?? "Payment could not be started.");
              setBusy(false);
              return;
            }

            // Left busy on purpose: the page is about to be replaced, and
            // re-enabling would give a moment in which it could be pressed again.
            window.location.href = payload.url;
          } catch {
            setError("Could not reach the payment page. Please try again.");
            setBusy(false);
          }
        }}
        className="btn btn-solid mt-5 w-full disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
      >
        {busy ? "Opening secure payment…" : label}
      </button>

      {blocked && (
        <p className="mt-3 text-sm text-cocoa-soft">
          Please tick the box above to continue.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <p className="mt-5 text-xs text-cocoa-soft">
        Payment is taken securely by Stripe. {DEPOSIT_NOTICE}
      </p>
    </div>
  );
}
