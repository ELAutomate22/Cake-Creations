import { z } from "zod";

/**
 * Validation for cake requests.
 *
 * One schema, used by the form in the browser and again by the route handler
 * on the server. The browser copy is a courtesy to the person filling it in;
 * the server treats every submission as untrusted regardless of what the
 * browser claims to have checked.
 *
 * Everything except the reference photographs is required. Where a field may
 * genuinely not apply — no age on the cake, no written message — the answer is
 * an explicit choice rather than an empty box, so a blank is always a mistake
 * and never a decision. That is why the personalisation fields have their own
 * "none" options rather than being optional.
 */

/* ── Choices ─────────────────────────────────────────────────────────────── */

export const ORDER_OCCASIONS = [
  "Birthday",
  "Wedding",
  "Christening",
  "Baptism",
  "Anniversary",
  "Engagement",
  "Baby shower",
  "Gender reveal",
  "Graduation",
  "Retirement",
  "Religious celebration",
  "Family celebration",
  "Corporate celebration",
  "Other",
] as const;

export const ORDER_CAKE_STYLES = ["personalised", "classic"] as const;
export type OrderCakeStyle = (typeof ORDER_CAKE_STYLES)[number];

export const ORDER_CAKE_STYLE_LABELS: Record<OrderCakeStyle, string> = {
  personalised: "Personalised",
  classic: "Classic",
};

/**
 * Flavours offered.
 *
 * Deliberately a list in code rather than a hard-coded set of `<option>`s, and
 * deliberately short: the real menu has not been supplied. "Other" carries any
 * flavour not listed, so nothing is invented on the business's behalf and no
 * customer is turned away by an incomplete list.
 */
export const ORDER_FLAVOURS = [
  "Vanilla",
  "Chocolate",
  "Red velvet",
  "Lemon",
  "Carrot",
  "Coffee",
  "Fruit",
  "Not sure — please advise",
  "Other",
] as const;

export const FULFILMENT_TYPES = ["collection", "delivery"] as const;
export type FulfilmentType = (typeof FULFILMENT_TYPES)[number];

/** Cakes are made to order, so a request needs a reasonable amount of notice. */
export const MINIMUM_NOTICE_DAYS = 3;

/** How far ahead a request may be placed. Guards against typos in the year. */
export const MAXIMUM_NOTICE_DAYS = 730;

/* ── Reference images ────────────────────────────────────────────────────── */

export const MAX_REFERENCE_IMAGES = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Extensions matching the types above, checked alongside the MIME type. */
export const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** A required free-text answer. */
const required = (label: string, max = 500) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

/** Today in the site's terms, as YYYY-MM-DD. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const earliestOrderDate = () => addDays(MINIMUM_NOTICE_DAYS);
export const latestOrderDate = () => addDays(MAXIMUM_NOTICE_DAYS);

/**
 * UK phone numbers, loosely.
 *
 * Accepts spaces, brackets and either 0 or +44, because a customer typing
 * their own number the way they always write it should not be argued with.
 * Checks only that there are enough digits to be a real number.
 */
const UK_PHONE = /^\+?[\d\s()-]{9,20}$/;

/* ── The submission ──────────────────────────────────────────────────────── */

export const orderSubmissionSchema = z
  .object({
    /* Step 1 — Occasion */
    occasion: z.enum(ORDER_OCCASIONS, { message: "Please choose an occasion." }),
    occasionOther: z.string().trim().max(200).optional().default(""),

    /* Step 2 — The cake */
    cakeStyle: z.enum(ORDER_CAKE_STYLES, { message: "Please choose a cake style." }),
    servings: z.coerce
      .number()
      .int("Please give a whole number of servings.")
      .min(1, "Please give the number of servings.")
      .max(500, "For more than 500 servings, please get in touch directly."),
    flavour: z.enum(ORDER_FLAVOURS, { message: "Please choose a flavour." }),
    flavourOther: z.string().trim().max(200).optional().default(""),

    /* Step 3 — Personalisation */
    theme: required("A theme or design idea"),
    colours: required("Preferred colours", 200),
    cakeNameText: required("The name or text on the cake", 200),
    ageNumber: required("An age or number", 60),
    cakeMessage: required("A cake message", 300),
    designRequirements: required("Additional design requirements"),

    /* Step 5 — Date and fulfilment */
    requiredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose the date the cake is needed.")
      .refine(
        (value) => value >= earliestOrderDate(),
        `Cakes are made to order, so please allow at least ${MINIMUM_NOTICE_DAYS} days.`,
      )
      .refine(
        (value) => value <= latestOrderDate(),
        "Please check the year on that date.",
      ),
    fulfilmentType: z.enum(FULFILMENT_TYPES, { message: "Please choose collection or delivery." }),
    deliveryAddress: z.string().trim().max(400).optional().default(""),
    deliveryPostcode: z.string().trim().max(12).optional().default(""),

    /* Step 6 — The customer */
    customerName: z
      .string()
      .trim()
      .min(2, "Please enter your full name.")
      .max(80, "That name is too long."),
    customerEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address.")
      .max(200),
    customerPhone: z
      .string()
      .trim()
      .regex(UK_PHONE, "Please enter a valid phone number."),

    /* Step 7 — Consent */
    acceptedTerms: z.literal(true, { message: "Please confirm you have read and accept the policies." }),

    /**
     * The honeypot, named to look worth filling in.
     *
     * Deliberately accepts any value. Rejecting it here would name the field
     * in the error and tell whatever filled it exactly what caught it.
     */
    website: z.string().max(200).optional(),
  })
  /*
   * Conditional requirements.
   *
   * These are the fields that are only required because of an earlier answer,
   * which is why they cannot be expressed on the field itself.
   */
  .superRefine((value, context) => {
    if (value.occasion === "Other" && value.occasionOther.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["occasionOther"],
        message: "Please tell us the occasion.",
      });
    }

    if (value.flavour === "Other" && value.flavourOther.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flavourOther"],
        message: "Please tell us the flavour you would like.",
      });
    }

    if (value.fulfilmentType === "delivery") {
      if (value.deliveryAddress.length < 6) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deliveryAddress"],
          message: "Please give the full delivery address.",
        });
      }
      if (!/^[A-Za-z0-9 ]{5,12}$/.test(value.deliveryPostcode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deliveryPostcode"],
          message: "Please give a valid postcode.",
        });
      }
    }
  });

export type OrderSubmission = z.infer<typeof orderSubmissionSchema>;
