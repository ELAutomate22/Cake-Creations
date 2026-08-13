"use client";

import { useId, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { StarInput } from "./Stars";
import { reviews as copy } from "@/content/site";
import {
  CAKE_STYLES,
  CAKE_STYLE_LABELS,
  REVIEW_OCCASIONS,
  reviewSubmissionSchema,
  type CakeStyleChoice,
} from "@/lib/reviews/schema";

/**
 * Leave a review.
 *
 * Validated with the same schema the server uses, so the two can never drift
 * apart — the difference is only in when the visitor is told. Published
 * immediately on success; there is no approval queue anywhere in this project.
 */

type Status = "idle" | "sending" | "sent" | "error";

export function ReviewFormModal({
  open,
  onClose,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
}) {
  const fieldId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cakeType, setCakeType] = useState("");
  const [cakeStyle, setCakeStyle] = useState<CakeStyleChoice | "">("");
  const [occasion, setOccasion] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [errorField, setErrorField] = useState("");

  function reset() {
    setName("");
    setEmail("");
    setCakeType("");
    setCakeStyle("");
    setOccasion("");
    setRating(0);
    setReviewText("");
    setConsent(false);
    setWebsite("");
    setStatus("idle");
    setMessage("");
    setErrorField("");
  }

  function close() {
    onClose();
    // Let the closing transition finish before the fields visibly empty.
    setTimeout(reset, 300);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setErrorField("");

    const payload = {
      name,
      email,
      cakeType,
      cakeStyle: cakeStyle as CakeStyleChoice,
      occasion,
      rating,
      reviewText,
      consent,
      website,
    };

    const parsed = reviewSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setStatus("error");
      setErrorField(String(first.path[0] ?? ""));
      setMessage(first.message);
      return;
    }

    setStatus("sending");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setStatus("error");
        setErrorField(result.field ?? "");
        setMessage(result.message ?? "Your review could not be saved.");
        return;
      }

      setStatus("sent");
      setMessage(copy.form.successMessage);
      onPublished();
    } catch {
      setStatus("error");
      setMessage("Your review could not be sent. Please check your connection.");
    }
  }

  const invalid = (field: string) =>
    status === "error" && errorField === field ? true : undefined;

  const inputClass =
    "mt-2 w-full border border-espresso/20 bg-ivory px-4 py-3 text-cocoa outline-none transition-colors focus:border-espresso";

  return (
    <Modal open={open} onClose={close} label="Leave a review" panelClassName="max-w-2xl">
      <div className="p-7 sm:p-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="display-sm text-espresso">{copy.form.heading}</h2>
            <p className="voice measure mt-3 text-cocoa">{copy.form.standfirst}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-cocoa-soft transition-colors hover:text-espresso"
          >
            <span className="sr-only">Close</span>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </div>

        {status === "sent" ? (
          <div className="mt-10" role="status">
            <p className="font-serif text-2xl text-espresso">{message}</p>
            <button type="button" onClick={close} className="btn btn-solid mt-8">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-9 space-y-6">
            {/* Honeypot. Off-screen, unlabelled, never announced. */}
            <div aria-hidden="true" className="absolute left-[-9999px] top-0">
              <label htmlFor={`${fieldId}-website`}>Website</label>
              <input
                id={`${fieldId}-website`}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor={`${fieldId}-name`} className="eyebrow text-cocoa-soft">
                  Your name
                </label>
                <input
                  id={`${fieldId}-name`}
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  aria-invalid={invalid("name")}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-cocoa-soft">
                  Shown as your first name and an initial.
                </p>
              </div>

              <div>
                <label htmlFor={`${fieldId}-email`} className="eyebrow text-cocoa-soft">
                  Email address
                </label>
                <input
                  id={`${fieldId}-email`}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  aria-invalid={invalid("email")}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-cocoa-soft">
                  Never shown publicly. Used only to verify genuine reviews.
                </p>
              </div>

              <div>
                <label htmlFor={`${fieldId}-caketype`} className="eyebrow text-cocoa-soft">
                  Cake type <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  id={`${fieldId}-caketype`}
                  type="text"
                  value={cakeType}
                  placeholder="Birthday cake"
                  onChange={(event) => setCakeType(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor={`${fieldId}-style`} className="eyebrow text-cocoa-soft">
                  Cake style
                </label>
                <select
                  id={`${fieldId}-style`}
                  required
                  value={cakeStyle}
                  aria-invalid={invalid("cakeStyle")}
                  onChange={(event) =>
                    setCakeStyle(event.target.value as CakeStyleChoice)
                  }
                  className={inputClass}
                >
                  <option value="">Please choose…</option>
                  {CAKE_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {CAKE_STYLE_LABELS[style]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={`${fieldId}-occasion`} className="eyebrow text-cocoa-soft">
                  Occasion <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <select
                  id={`${fieldId}-occasion`}
                  value={occasion}
                  onChange={(event) => setOccasion(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Not specified</option>
                  {REVIEW_OCCASIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="eyebrow text-cocoa-soft">Your rating</p>
              <div className="mt-2">
                <StarInput value={rating} onChange={setRating} />
              </div>
            </div>

            <div>
              <label htmlFor={`${fieldId}-review`} className="eyebrow text-cocoa-soft">
                Your review
              </label>
              <textarea
                id={`${fieldId}-review`}
                required
                rows={5}
                maxLength={1500}
                value={reviewText}
                aria-invalid={invalid("reviewText")}
                onChange={(event) => setReviewText(event.target.value)}
                className={`${inputClass} resize-y`}
              />
              <p className="mt-2 text-xs text-cocoa-soft">
                {reviewText.trim().length} / 1500 characters
              </p>
            </div>

            <label className="flex items-start gap-3 text-sm text-cocoa">
              <input
                type="checkbox"
                checked={consent}
                aria-invalid={invalid("consent")}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-plum)]"
              />
              {copy.form.consentLabel}
            </label>

            {status === "error" && message && (
              <p role="alert" className="text-sm text-danger">
                {message}
              </p>
            )}

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="btn btn-solid disabled:opacity-60"
              >
                {status === "sending" ? "Publishing…" : "Publish review"}
              </button>
              <button type="button" onClick={close} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
