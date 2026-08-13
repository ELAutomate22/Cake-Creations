import { z } from "zod";

/**
 * Validation for customer reviews.
 *
 * This schema is the single source of truth and runs on the server as well as
 * in the browser. Client-side validation is a courtesy to the person filling
 * the form in; the server treats every submission as untrusted regardless of
 * what the browser claims to have checked.
 */

export const CAKE_STYLES = ["personalised", "classic", "not-sure"] as const;
export type CakeStyleChoice = (typeof CAKE_STYLES)[number];

export const CAKE_STYLE_LABELS: Record<CakeStyleChoice, string> = {
  personalised: "Personalised",
  classic: "Classic",
  "not-sure": "Not sure",
};

/** Occasions a reviewer can pick. Cakes only — nothing else is offered. */
export const REVIEW_OCCASIONS = [
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
  "Other occasion",
] as const;

/**
 * Rejects anything that looks like a link.
 *
 * Review spam is overwhelmingly about getting a URL onto a page. Genuine cake
 * reviews essentially never contain one, so refusing them outright removes the
 * incentive without inconveniencing a real customer.
 */
const NO_LINKS = /(https?:\/\/|www\.|\[url|<a\s|\b[a-z0-9-]+\.(com|net|org|ru|xyz|top|io|co)\b)/i;

export const reviewSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(60, "That name is too long.")
    .refine((value) => !NO_LINKS.test(value), "Please enter a real name."),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(160, "That email address is too long."),

  cakeType: z
    .string()
    .trim()
    .max(80, "Please keep this short.")
    .optional()
    .or(z.literal("")),

  cakeStyle: z.enum(CAKE_STYLES, {
    message: "Please choose a cake style.",
  }),

  occasion: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("")),

  rating: z
    .number()
    .int("Please choose a whole number of stars.")
    .min(1, "Please choose a rating.")
    .max(5, "Ratings run from one to five stars."),

  reviewText: z
    .string()
    .trim()
    .min(20, "Please write at least a sentence or two.")
    .max(1500, "Please keep your review under 1500 characters.")
    .refine(
      (value) => !NO_LINKS.test(value),
      "Reviews cannot contain links or web addresses.",
    ),

  consent: z.literal(true, {
    message: "Please confirm you are happy for your review to be shown.",
  }),

  /**
   * A hidden field no human ever sees. Automated form-fillers populate every
   * input they find, so anything arriving here means the sender is not a
   * person.
   *
   * Note that this deliberately ACCEPTS any value. Rejecting it here would
   * return a validation error naming this field, which tells the sender
   * exactly what caught them — they would simply retry without it. Instead the
   * submission is allowed through validation and quietly discarded by the API
   * route, which answers as though it had been published.
   */
  website: z.string().max(200).optional(),
});

export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;
