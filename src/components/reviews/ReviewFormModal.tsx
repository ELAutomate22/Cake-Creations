"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { StarsInput } from "./Stars";
import {
  cakeStyleOptions,
  cakeTypeOptions,
  reviewConsentText,
} from "@/content/site";
import {
  MAX_REVIEW_LENGTH,
  MIN_REVIEW_LENGTH,
  reviewSubmissionSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/reviews/schema";

type Status = "editing" | "submitting" | "published" | "failed";

const EMPTY = {
  customer_name: "",
  customer_email: "",
  cake_type: "",
  cake_style: "",
  occasion: "",
  rating: 0,
  review_text: "",
  consent: false,
  website: "", // honeypot
};

export function ReviewFormModal({
  open,
  onClose,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [values, setValues] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("editing");
  const [formError, setFormError] = useState<string | null>(null);

  const openedAt = useRef<number>(0);
  const ids = {
    name: useId(),
    email: useId(),
    emailHint: useId(),
    type: useId(),
    style: useId(),
    occasion: useId(),
    rating: useId(),
    text: useId(),
    textHint: useId(),
    consent: useId(),
  };

  /**
   * Reset each time the dialog opens, so a previous submission never leaves
   * stale values behind.
   *
   * Done during render rather than in an effect: the form is then already
   * blank on its first render, instead of briefly showing the old contents.
   */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues({ ...EMPTY });
      setErrors({});
      setStatus("editing");
      setFormError(null);
    }
  }

  /**
   * Note when the form was opened, so a submission completed impossibly fast
   * can be recognised as automated. Reading the clock is a side effect, so it
   * belongs here rather than in the render above.
   */
  useEffect(() => {
    if (open) openedAt.current = Date.now();
  }, [open]);

  const update = <K extends keyof typeof EMPTY>(
    field: K,
    value: (typeof EMPTY)[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear that field's error as soon as the visitor starts fixing it.
    setErrors((current) =>
      current[field as keyof FieldErrors]
        ? { ...current, [field]: undefined }
        : current,
    );
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const payload = {
      ...values,
      occasion: values.occasion || undefined,
      elapsed_ms: Date.now() - openedAt.current,
    };

    // Validate in the browser first, for immediate feedback.
    const parsed = reviewSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error);
      setErrors(fieldErrors);

      // Move focus to the first problem so it is not missed further up the form.
      const firstField = Object.keys(fieldErrors)[0];
      document
        .querySelector<HTMLElement>(`[data-field="${firstField}"]`)
        ?.focus();
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus("editing");
        setErrors(result.fields ?? {});
        setFormError(
          result.error ?? "Your review could not be published just now.",
        );
        return;
      }

      setStatus("published");
      onPublished();
    } catch {
      setStatus("failed");
      setFormError(
        "We could not reach the website just now. Please check your connection and try again.",
      );
    }
  }

  const remaining = MAX_REVIEW_LENGTH - values.review_text.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Leave a review"
      description="Share your experience of a cake from Elshadai Cake Creations."
    >
      {/* ── Success ─────────────────────────────────────────────────────── */}
      {status === "published" ? (
        <div className="px-7 py-14 text-center sm:px-10">
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-plum text-ivory"
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path
                d="M6 13.5 L11 18 L20 8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <p className="mt-6 font-serif text-3xl text-espresso" role="status">
            Thank you. Your review has been published.
          </p>
          <p className="measure mx-auto mt-3 text-sm text-cocoa-soft">
            It is now visible to everyone on the website. Your email address
            stays private.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-8 bg-espresso px-8 py-3.5 text-sm uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-plum"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="relative border-b border-caramel/35 bg-vanilla px-7 pb-6 pt-8 text-center sm:px-9">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center text-cocoa transition-colors hover:text-espresso"
            >
              <span className="sr-only">Close review form</span>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M2 2 L16 16 M16 2 L2 16"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <p className="eyebrow">Your experience</p>
            <p className="mt-3 font-serif text-3xl text-espresso">
              Leave a review
            </p>
          </div>

          <div className="space-y-5 px-7 py-7 sm:px-9">
            {formError && (
              <p
                role="alert"
                className="border-l-2 border-danger bg-danger/8 px-4 py-3 text-sm text-danger"
              >
                {formError}
              </p>
            )}

            {/* ── Name ──────────────────────────────────────────────────── */}
            <Field
              id={ids.name}
              label="Your name"
              required
              error={errors.customer_name}
            >
              <input
                id={ids.name}
                data-field="customer_name"
                type="text"
                autoComplete="name"
                value={values.customer_name}
                onChange={(e) => update("customer_name", e.target.value)}
                aria-invalid={errors.customer_name ? true : undefined}
                className={inputClass(errors.customer_name)}
              />
            </Field>

            {/* ── Email ─────────────────────────────────────────────────── */}
            <Field
              id={ids.email}
              label="Email address"
              required
              error={errors.customer_email}
              hint="Kept private. It is never shown on the website."
              hintId={ids.emailHint}
            >
              <input
                id={ids.email}
                data-field="customer_email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={values.customer_email}
                onChange={(e) => update("customer_email", e.target.value)}
                aria-describedby={ids.emailHint}
                aria-invalid={errors.customer_email ? true : undefined}
                className={inputClass(errors.customer_email)}
              />
            </Field>

            {/* ── Cake type ─────────────────────────────────────────────── */}
            <Field
              id={ids.type}
              label="Type of cake"
              required
              error={errors.cake_type}
            >
              <select
                id={ids.type}
                data-field="cake_type"
                value={values.cake_type}
                onChange={(e) => update("cake_type", e.target.value)}
                aria-invalid={errors.cake_type ? true : undefined}
                className={inputClass(errors.cake_type)}
              >
                <option value="">Please choose…</option>
                {cakeTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            {/* ── Cake style ────────────────────────────────────────────── */}
            <Field
              id={ids.style}
              label="Cake style"
              required
              error={errors.cake_style}
            >
              <select
                id={ids.style}
                data-field="cake_style"
                value={values.cake_style}
                onChange={(e) => update("cake_style", e.target.value)}
                aria-invalid={errors.cake_style ? true : undefined}
                className={inputClass(errors.cake_style)}
              >
                <option value="">Please choose…</option>
                {cakeStyleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            {/* ── Occasion ──────────────────────────────────────────────── */}
            <Field
              id={ids.occasion}
              label="Occasion"
              error={errors.occasion}
              optional
            >
              <input
                id={ids.occasion}
                data-field="occasion"
                type="text"
                placeholder="For example, a 40th birthday"
                value={values.occasion}
                onChange={(e) => update("occasion", e.target.value)}
                className={inputClass(errors.occasion)}
              />
            </Field>

            {/* ── Rating ────────────────────────────────────────────────── */}
            <fieldset>
              <legend className="mb-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
                Your rating{" "}
                <span className="text-plum" aria-hidden="true">
                  *
                </span>
              </legend>
              <div data-field="rating" tabIndex={-1}>
                <StarsInput
                  value={values.rating}
                  onChange={(rating) => update("rating", rating)}
                  error={errors.rating}
                  describedBy={errors.rating ? ids.rating : undefined}
                />
              </div>
              {errors.rating && (
                <p id={ids.rating} className="text-xs text-danger" role="alert">
                  {errors.rating}
                </p>
              )}
            </fieldset>

            {/* ── Review ────────────────────────────────────────────────── */}
            <Field
              id={ids.text}
              label="Your review"
              required
              error={errors.review_text}
              hint={`At least ${MIN_REVIEW_LENGTH} characters. Please write in your own words — links cannot be included.`}
              hintId={ids.textHint}
            >
              <textarea
                id={ids.text}
                data-field="review_text"
                rows={5}
                maxLength={MAX_REVIEW_LENGTH}
                value={values.review_text}
                onChange={(e) => update("review_text", e.target.value)}
                aria-describedby={ids.textHint}
                aria-invalid={errors.review_text ? true : undefined}
                className={`${inputClass(errors.review_text)} resize-y subtle-scroll`}
              />
              <p className="mt-1 text-right text-xs text-cocoa-soft">
                <span className={remaining < 100 ? "text-danger" : undefined}>
                  {remaining}
                </span>{" "}
                characters remaining
              </p>
            </Field>

            {/* ── Honeypot ──────────────────────────────────────────────── */}
            {/*
              Hidden from people and from screen readers, but present in the
              markup. Automated form-fillers complete it; visitors never see it.
            */}
            <div aria-hidden="true" className="absolute left-[-9999px] top-0">
              <label htmlFor="website-field">
                Leave this field empty
                <input
                  id="website-field"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </label>
            </div>

            {/* ── Consent ───────────────────────────────────────────────── */}
            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  id={ids.consent}
                  data-field="consent"
                  type="checkbox"
                  checked={values.consent}
                  onChange={(e) => update("consent", e.target.checked)}
                  aria-invalid={errors.consent ? true : undefined}
                  className="mt-1 h-4 w-4 shrink-0 accent-plum"
                />
                <span className="text-xs leading-relaxed text-cocoa-soft">
                  {reviewConsentText}
                </span>
              </label>
              {errors.consent && (
                <p className="mt-1.5 text-xs text-danger" role="alert">
                  {errors.consent}
                </p>
              )}
            </div>

            {/* ── Submit ────────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-espresso px-8 py-4 text-sm uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-plum disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting" ? "Publishing…" : "Publish my review"}
            </button>

            <p className="text-center text-xs text-cocoa-soft">
              Your review appears on the website straight away.
            </p>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ── Small shared pieces ─────────────────────────────────────────────────── */

function inputClass(error?: string) {
  return [
    "w-full border bg-ivory px-4 py-3 text-[0.9375rem] text-espresso",
    "transition-colors placeholder:text-cocoa-soft/60",
    "focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum",
    error ? "border-danger" : "border-caramel/50",
  ].join(" ");
}

function Field({
  id,
  label,
  children,
  error,
  hint,
  hintId,
  required = false,
  optional = false,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  hintId?: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft"
      >
        {label}
        {required && (
          <span className="text-plum" aria-hidden="true">
            {" "}
            *
          </span>
        )}
        {optional && <span className="normal-case tracking-normal"> (optional)</span>}
      </label>

      {children}

      {hint && (
        <p id={hintId} className="mt-1 text-xs text-cocoa-soft">
          {hint}
        </p>
      )}

      {error && (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
