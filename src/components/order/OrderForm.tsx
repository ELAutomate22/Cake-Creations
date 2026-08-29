"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { orderCopy, orderConsent } from "@/content/order";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_REFERENCE_IMAGES,
  ORDER_CAKE_STYLES,
  ORDER_CAKE_STYLE_LABELS,
  ORDER_FLAVOURS,
  ORDER_OCCASIONS,
  earliestOrderDate,
  latestOrderDate,
  orderSubmissionSchema,
} from "@/lib/orders/schema";
import { Field, ChoiceGroup, Select, TextArea, TextInput } from "./Fields";

/**
 * The cake request form.
 *
 * Seven steps, one page, one piece of state. Every answer lives in `values`
 * for the whole visit, so moving back and forward never loses anything — the
 * steps only decide what is on screen, never what is remembered.
 *
 * Validation runs twice over. Each step is checked as the customer leaves it,
 * using the same schema the server uses, so a mistake is caught next to the
 * field that caused it rather than after everything has been filled in. The
 * server then validates the whole submission again from scratch, because
 * anything the browser reports is only a claim.
 *
 * Everything is required except the photographs. Where an answer may genuinely
 * not apply the form offers an explicit one — "No written message" — rather
 * than an empty box, so a blank is always a mistake and never a decision.
 */

const STEP_FIELDS: Record<number, string[]> = {
  0: ["occasion", "occasionOther"],
  1: ["cakeStyle", "servings", "flavour", "flavourOther"],
  2: [
    "theme",
    "colours",
    "cakeNameText",
    "ageNumber",
    "cakeMessage",
    "designRequirements",
  ],
  3: [],
  4: ["requiredDate", "fulfilmentType", "deliveryAddress", "deliveryPostcode"],
  5: ["customerName", "customerEmail", "customerPhone"],
  6: ["acceptedTerms"],
};

const EMPTY = {
  occasion: "",
  occasionOther: "",
  cakeStyle: "",
  servings: "",
  flavour: "",
  flavourOther: "",
  theme: "",
  colours: "",
  cakeNameText: "",
  ageNumber: "",
  cakeMessage: "",
  designRequirements: "",
  requiredDate: "",
  fulfilmentType: "",
  deliveryAddress: "",
  deliveryPostcode: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
};

type Values = typeof EMPTY;
type Errors = Partial<Record<keyof Values | "acceptedTerms" | "referenceImages", string>>;

export function OrderForm() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(EMPTY);
  const [images, setImages] = useState<File[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const total = orderCopy.steps.length;

  const set = useCallback(
    <K extends keyof Values>(key: K, value: Values[K]) => {
      setValues((current) => ({ ...current, [key]: value }));
      // Clear the error as soon as the field is touched again; leaving it up
      // while someone is fixing it reads as though nothing they type helps.
      setErrors((current) => ({ ...current, [key]: undefined }));
    },
    [],
  );

  /*
   * Move focus to the step heading on every change of step.
   *
   * Without this a keyboard or screen reader user presses Continue and focus
   * stays on a button that has just been replaced, which reads as the page
   * having done nothing at all.
   */
  useEffect(() => {
    if (reference) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [step, reference]);

  /** Object URLs for the previews, revoked when the files change. */
  const previews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );

  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  /** Validates the whole answer set, then keeps only this step's complaints. */
  const validateStep = useCallback(
    (index: number): boolean => {
      const result = orderSubmissionSchema.safeParse({
        ...values,
        acceptedTerms: accepted,
      });

      if (result.success) return true;

      const watched = STEP_FIELDS[index] ?? [];
      const found: Errors = {};

      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (watched.includes(key) && !found[key as keyof Errors]) {
          found[key as keyof Errors] = issue.message;
        }
      }

      setErrors(found);
      return Object.keys(found).length === 0;
    },
    [values, accepted],
  );

  const next = () => {
    if (!validateStep(step)) return;
    setErrors({});
    setStep((current) => Math.min(current + 1, total - 1));
  };

  const back = () => {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  };

  const onFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const incoming = [...fileList];
    const room = MAX_REFERENCE_IMAGES - images.length;

    if (incoming.length > room) {
      setErrors((current) => ({
        ...current,
        referenceImages: `You can attach up to ${MAX_REFERENCE_IMAGES} photographs.`,
      }));
    }

    const accept: File[] = [];
    for (const file of incoming.slice(0, Math.max(room, 0))) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
        setErrors((current) => ({
          ...current,
          referenceImages: `${file.name} is not a JPG, PNG or WebP image.`,
        }));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setErrors((current) => ({
          ...current,
          referenceImages: `${file.name} is larger than 5 MB.`,
        }));
        continue;
      }
      accept.push(file);
    }

    if (accept.length > 0) setImages((current) => [...current, ...accept]);
  };

  const submit = async () => {
    setFormError(null);

    // The whole thing, not just this step — the customer may have edited an
    // earlier answer from the review screen.
    const result = orderSubmissionSchema.safeParse({
      ...values,
      acceptedTerms: accepted,
    });

    if (!result.success) {
      const issue = result.error.issues[0];
      const key = String(issue.path[0] ?? "");
      setErrors({ [key as keyof Errors]: issue.message });

      const owning = Number(
        Object.keys(STEP_FIELDS).find((index) =>
          STEP_FIELDS[Number(index)].includes(key),
        ),
      );
      setStep(Number.isFinite(owning) ? owning : 0);
      return;
    }

    setSubmitting(true);

    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(values)) body.append(key, value);
      body.append("acceptedTerms", "true");
      for (const file of images) body.append("referenceImages", file);

      const response = await fetch("/api/orders", { method: "POST", body });
      const payload = (await response.json()) as {
        ok: boolean;
        orderNumber?: string | null;
        message?: string;
        field?: string;
      };

      if (!response.ok || !payload.ok) {
        setFormError(payload.message ?? "Your request could not be sent.");
        if (payload.field) {
          setErrors({ [payload.field as keyof Errors]: payload.message });
        }
        return;
      }

      setReference(payload.orderNumber ?? "");
    } catch {
      setFormError(
        "Your request could not be sent. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Sent ──────────────────────────────────────────────────────────────── */

  if (reference !== null) {
    return (
      <div className="shell py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-cocoa-soft">Request received</p>
          <h1 className="display mt-5 text-espresso">{orderCopy.success.heading}</h1>
          <p className="voice mx-auto mt-6 max-w-xl text-cocoa">
            {orderCopy.success.body}
          </p>

          {reference && (
            <div className="mt-10 border border-espresso/15 bg-vanilla px-6 py-8">
              <p className="eyebrow text-cocoa-soft">
                {orderCopy.success.referenceLabel}
              </p>
              <p className="display-sm mt-3 text-espresso">{reference}</p>
            </div>
          )}

          <p className="mt-8 text-sm text-cocoa-soft">
            {orderCopy.success.afterword}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/gallery" className="btn btn-outline">
              View the Gallery
            </Link>
            <Link href="/" className="btn btn-solid">
              Back to the site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── The form ──────────────────────────────────────────────────────────── */

  const current = orderCopy.steps[step];
  const isReview = step === total - 1;

  return (
    <div className="shell py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        {/* ── Progress ──────────────────────────────────────────────────── */}
        <div>
          <p className="eyebrow text-cocoa-soft">
            Step {step + 1} of {total}
          </p>

          <ol className="mt-4 flex gap-1.5" aria-label="Progress">
            {orderCopy.steps.map((item, index) => (
              <li
                key={item.id}
                aria-current={index === step ? "step" : undefined}
                className="h-1 flex-1 bg-espresso/12"
              >
                <span
                  className={`block h-full transition-all duration-500 ${
                    index <= step ? "w-full bg-espresso" : "w-0"
                  }`}
                />
                <span className="sr-only">
                  {item.title}
                  {index < step ? " — done" : index === step ? " — current" : ""}
                </span>
              </li>
            ))}
          </ol>

          <h1
            ref={headingRef}
            tabIndex={-1}
            className="display-sm mt-8 text-espresso outline-none"
          >
            {current.title}
          </h1>
          <p className="mt-2 text-cocoa-soft">{current.hint}</p>
        </div>

        <div className="mt-10 space-y-8">
          {/* ── 1. Occasion ─────────────────────────────────────────────── */}
          {step === 0 && (
            <>
              <Field label="Occasion" error={errors.occasion}>
                {(props) => (
                  <Select
                    {...props}
                    value={values.occasion}
                    onChange={(event) => set("occasion", event.target.value)}
                  >
                    <option value="">Please choose…</option>
                    {ORDER_OCCASIONS.map((occasion) => (
                      <option key={occasion} value={occasion}>
                        {occasion}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              {values.occasion === "Other" && (
                <Field
                  label="Tell us the occasion"
                  error={errors.occasionOther}
                  hint="A few words is plenty."
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      type="text"
                      value={values.occasionOther}
                      onChange={(event) => set("occasionOther", event.target.value)}
                    />
                  )}
                </Field>
              )}
            </>
          )}

          {/* ── 2. The cake ─────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <ChoiceGroup
                name="cakeStyle"
                legend="Cake style"
                value={values.cakeStyle as (typeof ORDER_CAKE_STYLES)[number] | ""}
                error={errors.cakeStyle}
                onChange={(value) => set("cakeStyle", value)}
                options={ORDER_CAKE_STYLES.map((style) => ({
                  value: style,
                  label: ORDER_CAKE_STYLE_LABELS[style],
                  description:
                    style === "personalised"
                      ? "Built around a person, a theme or a story."
                      : "Timeless, restrained, carefully finished.",
                }))}
              />

              <Field
                label="Approximate servings"
                error={errors.servings}
                hint="A rough number is fine — we will confirm sizing with your quote."
              >
                {(props) => (
                  <TextInput
                    {...props}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    value={values.servings}
                    onChange={(event) => set("servings", event.target.value)}
                  />
                )}
              </Field>

              <Field label="Flavour" error={errors.flavour}>
                {(props) => (
                  <Select
                    {...props}
                    value={values.flavour}
                    onChange={(event) => set("flavour", event.target.value)}
                  >
                    <option value="">Please choose…</option>
                    {ORDER_FLAVOURS.map((flavour) => (
                      <option key={flavour} value={flavour}>
                        {flavour}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              {values.flavour === "Other" && (
                <Field label="Which flavour?" error={errors.flavourOther}>
                  {(props) => (
                    <TextInput
                      {...props}
                      type="text"
                      value={values.flavourOther}
                      onChange={(event) => set("flavourOther", event.target.value)}
                    />
                  )}
                </Field>
              )}
            </>
          )}

          {/* ── 3. Personalisation ──────────────────────────────────────── */}
          {step === 2 && (
            <>
              <Field
                label="Theme or design idea"
                error={errors.theme}
                hint={`If there is no particular theme, write "${orderCopy.noneOptions.theme}".`}
              >
                {(props) => (
                  <TextArea
                    {...props}
                    rows={3}
                    value={values.theme}
                    onChange={(event) => set("theme", event.target.value)}
                  />
                )}
              </Field>

              <Field
                label="Preferred colours"
                error={errors.colours}
                hint={`No preference? Write "${orderCopy.noneOptions.colours}".`}
              >
                {(props) => (
                  <TextInput
                    {...props}
                    type="text"
                    value={values.colours}
                    onChange={(event) => set("colours", event.target.value)}
                  />
                )}
              </Field>

              <Field
                label="Name or text on the cake"
                error={errors.cakeNameText}
                hint={`Nothing written on it? Write "${orderCopy.noneOptions.nameText}".`}
              >
                {(props) => (
                  <TextInput
                    {...props}
                    type="text"
                    value={values.cakeNameText}
                    onChange={(event) => set("cakeNameText", event.target.value)}
                  />
                )}
              </Field>

              <Field
                label="Age or number"
                error={errors.ageNumber}
                hint={`Not a milestone? Write "${orderCopy.noneOptions.age}".`}
              >
                {(props) => (
                  <TextInput
                    {...props}
                    type="text"
                    value={values.ageNumber}
                    onChange={(event) => set("ageNumber", event.target.value)}
                  />
                )}
              </Field>

              <Field
                label="Cake message"
                error={errors.cakeMessage}
                hint={`No message? Write "${orderCopy.noneOptions.message}".`}
              >
                {(props) => (
                  <TextArea
                    {...props}
                    rows={3}
                    value={values.cakeMessage}
                    onChange={(event) => set("cakeMessage", event.target.value)}
                  />
                )}
              </Field>

              <Field
                label="Additional design requirements"
                error={errors.designRequirements}
                hint={`Allergies, dietary needs, anything else. Nothing to add? Write "${orderCopy.noneOptions.requirements}".`}
              >
                {(props) => (
                  <TextArea
                    {...props}
                    value={values.designRequirements}
                    onChange={(event) =>
                      set("designRequirements", event.target.value)
                    }
                  />
                )}
              </Field>
            </>
          )}

          {/* ── 4. Reference images ─────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <p className="voice text-cocoa">
                If you have seen something you like, attach up to{" "}
                {MAX_REFERENCE_IMAGES} photographs. This step is entirely
                optional — a description is often enough.
              </p>

              <div className="mt-6">
                <label
                  htmlFor="reference-images"
                  className="eyebrow block text-cocoa-soft"
                >
                  Reference photographs
                  <span className="ml-2 normal-case tracking-normal text-cocoa-soft/70">
                    optional
                  </span>
                </label>
                <p
                  id="reference-images-hint"
                  className="mt-1.5 text-xs text-cocoa-soft"
                >
                  JPG, PNG or WebP. Up to 5 MB each.
                </p>
                <input
                  id="reference-images"
                  type="file"
                  multiple
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  aria-describedby="reference-images-hint"
                  disabled={images.length >= MAX_REFERENCE_IMAGES}
                  onChange={(event) => {
                    onFiles(event.target.files);
                    // Cleared so re-picking the same file still registers.
                    event.target.value = "";
                  }}
                  className="mt-3 block w-full text-sm text-cocoa file:mr-4 file:border file:border-espresso/25 file:bg-ivory file:px-5 file:py-3 file:text-sm file:text-espresso hover:file:bg-vanilla"
                />

                {errors.referenceImages && (
                  <p role="alert" className="mt-2 flex gap-1.5 text-sm text-danger">
                    <span aria-hidden="true">!</span>
                    {errors.referenceImages}
                  </p>
                )}

                <p role="status" className="mt-3 text-sm text-cocoa-soft">
                  {images.length} of {MAX_REFERENCE_IMAGES} attached.
                </p>

                {previews.length > 0 && (
                  <ul className="mt-5 grid grid-cols-3 gap-3">
                    {previews.map((preview, index) => (
                      <li key={preview.url} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview.url}
                          alt={`Reference ${index + 1}: ${preview.file.name}`}
                          className="aspect-square w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setImages((current) =>
                              current.filter((_, position) => position !== index),
                            )
                          }
                          className="mt-2 w-full border border-espresso/25 py-2 text-xs uppercase tracking-[0.16em] text-espresso hover:bg-espresso hover:text-ivory"
                        >
                          Remove
                          <span className="sr-only"> {preview.file.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ── 5. Date and fulfilment ──────────────────────────────────── */}
          {step === 4 && (
            <>
              <Field
                label="Date the cake is needed"
                error={errors.requiredDate}
                hint="Cakes are made to order, so please allow a few days."
              >
                {(props) => (
                  <TextInput
                    {...props}
                    type="date"
                    min={earliestOrderDate()}
                    max={latestOrderDate()}
                    value={values.requiredDate}
                    onChange={(event) => set("requiredDate", event.target.value)}
                  />
                )}
              </Field>

              <ChoiceGroup
                name="fulfilmentType"
                legend="Collection or delivery"
                value={values.fulfilmentType as "collection" | "delivery" | ""}
                error={errors.fulfilmentType}
                onChange={(value) => set("fulfilmentType", value)}
                options={[
                  {
                    value: "collection",
                    label: "Collection",
                    description: "We will confirm where and when with your quote.",
                  },
                  {
                    value: "delivery",
                    label: "Delivery",
                    description: "Any delivery charge appears on your quote.",
                  },
                ]}
              />

              {/* Only asked for once delivery is chosen, and required from
                  that moment. */}
              {values.fulfilmentType === "delivery" && (
                <>
                  <Field label="Delivery address" error={errors.deliveryAddress}>
                    {(props) => (
                      <TextArea
                        {...props}
                        rows={3}
                        autoComplete="street-address"
                        value={values.deliveryAddress}
                        onChange={(event) =>
                          set("deliveryAddress", event.target.value)
                        }
                      />
                    )}
                  </Field>

                  <Field label="Postcode" error={errors.deliveryPostcode}>
                    {(props) => (
                      <TextInput
                        {...props}
                        type="text"
                        autoComplete="postal-code"
                        autoCapitalize="characters"
                        value={values.deliveryPostcode}
                        onChange={(event) =>
                          set("deliveryPostcode", event.target.value)
                        }
                      />
                    )}
                  </Field>
                </>
              )}
            </>
          )}

          {/* ── 6. Your details ─────────────────────────────────────────── */}
          {step === 5 && (
            <>
              <Field label="Full name" error={errors.customerName}>
                {(props) => (
                  <TextInput
                    {...props}
                    type="text"
                    autoComplete="name"
                    value={values.customerName}
                    onChange={(event) => set("customerName", event.target.value)}
                  />
                )}
              </Field>

              <Field
                label="Email address"
                error={errors.customerEmail}
                hint="Your quote will be sent here."
              >
                {(props) => (
                  <TextInput
                    {...props}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={values.customerEmail}
                    onChange={(event) => set("customerEmail", event.target.value)}
                  />
                )}
              </Field>

              <Field label="Phone number" error={errors.customerPhone}>
                {(props) => (
                  <TextInput
                    {...props}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={values.customerPhone}
                    onChange={(event) => set("customerPhone", event.target.value)}
                  />
                )}
              </Field>
            </>
          )}

          {/* ── 7. Review ───────────────────────────────────────────────── */}
          {step === 6 && (
            <ReviewStep
              values={values}
              images={previews}
              accepted={accepted}
              onAccept={setAccepted}
              error={errors.acceptedTerms}
              onEdit={setStep}
            />
          )}
        </div>

        {/*
          The honeypot.

          Off screen rather than display:none — something that is never
          rendered is also never filled in, which defeats the point.
        */}
        <div aria-hidden="true" className="absolute left-[-9999px] top-0">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {formError && (
          <p
            role="alert"
            className="mt-8 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {formError}
          </p>
        )}

        {/* ── Moving between steps ──────────────────────────────────────── */}
        <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-espresso/10 pt-8">
          {step > 0 && (
            <button type="button" onClick={back} className="btn btn-outline">
              Back
            </button>
          )}

          {!isReview ? (
            <button type="button" onClick={next} className="btn btn-solid">
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !accepted}
              className="btn btn-solid disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitting ? "Sending…" : "Send Information"}
            </button>
          )}

          <p className="w-full text-xs text-cocoa-soft sm:w-auto sm:flex-1 sm:text-right">
            {orderCopy.notAnOrder}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── The review step ─────────────────────────────────────────────────────── */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-espresso/10 py-3">
      <dt className="w-full text-[0.6875rem] uppercase tracking-[0.2em] text-cocoa-soft sm:w-48 sm:shrink-0">
        {label}
      </dt>
      <dd className="text-cocoa sm:flex-1">{value || "—"}</dd>
    </div>
  );
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 first:mt-0">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl text-espresso">{title}</h2>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="border-b border-espresso/30 pb-0.5 text-xs uppercase tracking-[0.16em] text-espresso hover:border-espresso"
        >
          Edit
          <span className="sr-only"> {title}</span>
        </button>
      </div>
      <dl className="mt-3">{children}</dl>
    </section>
  );
}

function ReviewStep({
  values,
  images,
  accepted,
  onAccept,
  error,
  onEdit,
}: {
  values: Values;
  images: { file: File; url: string }[];
  accepted: boolean;
  onAccept: (value: boolean) => void;
  error?: string;
  onEdit: (step: number) => void;
}) {
  const occasion =
    values.occasion === "Other" ? values.occasionOther : values.occasion;
  const flavour =
    values.flavour === "Other" ? values.flavourOther : values.flavour;

  return (
    <div>
      <Section title="Occasion" step={0} onEdit={onEdit}>
        <Row label="Occasion" value={occasion} />
      </Section>

      <Section title="The cake" step={1} onEdit={onEdit}>
        <Row
          label="Style"
          value={
            values.cakeStyle
              ? ORDER_CAKE_STYLE_LABELS[
                  values.cakeStyle as (typeof ORDER_CAKE_STYLES)[number]
                ]
              : ""
          }
        />
        <Row label="Servings" value={values.servings} />
        <Row label="Flavour" value={flavour} />
      </Section>

      <Section title="Personalisation" step={2} onEdit={onEdit}>
        <Row label="Theme" value={values.theme} />
        <Row label="Colours" value={values.colours} />
        <Row label="Name or text" value={values.cakeNameText} />
        <Row label="Age or number" value={values.ageNumber} />
        <Row label="Message" value={values.cakeMessage} />
        <Row label="Requirements" value={values.designRequirements} />
      </Section>

      <Section title="Reference images" step={3} onEdit={onEdit}>
        {images.length === 0 ? (
          <Row label="Attached" value="None" />
        ) : (
          <ul className="grid grid-cols-3 gap-3 pt-2">
            {images.map((image, index) => (
              <li key={image.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={`Reference ${index + 1}: ${image.file.name}`}
                  className="aspect-square w-full object-cover"
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Date & fulfilment" step={4} onEdit={onEdit}>
        <Row label="Date needed" value={values.requiredDate} />
        <Row
          label="Fulfilment"
          value={
            values.fulfilmentType === "delivery"
              ? "Delivery"
              : values.fulfilmentType === "collection"
                ? "Collection"
                : ""
          }
        />
        {values.fulfilmentType === "delivery" && (
          <>
            <Row label="Address" value={values.deliveryAddress} />
            <Row label="Postcode" value={values.deliveryPostcode} />
          </>
        )}
      </Section>

      <Section title="Your details" step={5} onEdit={onEdit}>
        <Row label="Name" value={values.customerName} />
        <Row label="Email" value={values.customerEmail} />
        <Row label="Phone" value={values.customerPhone} />
      </Section>

      {/* ── Consent ─────────────────────────────────────────────────────── */}
      <div className="mt-10 border border-espresso/15 bg-vanilla p-6">
        <h2 className="font-serif text-xl text-espresso">Before you send</h2>

        <p className="mt-3 text-sm text-cocoa">
          Please read the{" "}
          {orderConsent.policies.map((policy, index) => (
            <span key={policy.href}>
              <Link
                href={policy.href}
                target="_blank"
                className="border-b border-espresso/40 text-espresso hover:border-espresso"
              >
                {policy.label}
              </Link>
              {index < orderConsent.policies.length - 2
                ? ", "
                : index === orderConsent.policies.length - 2
                  ? " and "
                  : "."}
            </span>
          ))}
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-cocoa">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => onAccept(event.target.checked)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "accept-error" : undefined}
            className="mt-1 h-4 w-4 shrink-0 accent-espresso"
          />
          <span>{orderConsent.statement}</span>
        </label>

        {error && (
          <p
            id="accept-error"
            role="alert"
            className="mt-3 flex gap-1.5 text-sm text-danger"
          >
            <span aria-hidden="true">!</span>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
