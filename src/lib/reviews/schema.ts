import { z } from "zod";
import { cakeStyleOptions, cakeTypeOptions } from "@/content/site";

/**
 * The shape of a review submission.
 *
 * The same rules run in the browser (for immediate, friendly feedback) and
 * again on the server (because browser validation can always be bypassed).
 * The database then enforces the same bounds a third time via CHECK
 * constraints, so a malformed row cannot exist even if a layer is skipped.
 */

export const MIN_REVIEW_LENGTH = 20;
export const MAX_REVIEW_LENGTH = 2000;

export const reviewSubmissionSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(80, "Please use 80 characters or fewer."),

  customer_email: z
    .string()
    .trim()
    .toLowerCase()
    .min(5, "Please enter your email address.")
    .max(254, "That email address is too long.")
    .email("Please enter a valid email address."),

  cake_type: z.enum(cakeTypeOptions, {
    message: "Please choose the type of cake.",
  }),

  cake_style: z.enum(cakeStyleOptions, {
    message: "Please choose personalised or classic.",
  }),

  occasion: z
    .string()
    .trim()
    .max(80, "Please use 80 characters or fewer.")
    .optional()
    .or(z.literal("")),

  rating: z
    .number()
    .int("Please choose a whole number of stars.")
    .min(1, "Please choose a rating.")
    .max(5, "Please choose a rating between one and five stars."),

  review_text: z
    .string()
    .trim()
    .min(
      MIN_REVIEW_LENGTH,
      `Please write at least ${MIN_REVIEW_LENGTH} characters.`,
    )
    .max(
      MAX_REVIEW_LENGTH,
      `Please keep your review to ${MAX_REVIEW_LENGTH} characters or fewer.`,
    ),

  consent: z.literal(true, {
    message: "Please tick the box to allow your review to be published.",
  }),

  /**
   * A honeypot. It is hidden from people and left empty by them, but automated
   * form-fillers tend to complete every field they find. Anything here means
   * the submission was not made by a person.
   *
   * Deliberately NOT validated as "must be empty": a validation error would
   * tell the script exactly which field gave it away, and it would simply stop
   * filling that one in. The route accepts the submission, answers as though it
   * succeeded, and quietly discards it instead.
   */
  website: z.string().optional(),

  /**
   * Milliseconds between the form opening and being submitted. Scripts submit
   * near-instantly; people do not.
   */
  elapsed_ms: z.number().int().nonnegative().optional(),
});

export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;

/** A submission completed faster than this was almost certainly automated. */
export const MIN_COMPLETION_MS = 3000;

/** Field-level errors keyed by field name, as the form displays them. */
export type FieldErrors = Partial<Record<keyof ReviewSubmission, string>>;

/** Turns a Zod failure into the flat map the form component expects. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof ReviewSubmission | undefined;
    if (field && !result[field]) {
      result[field] = issue.message;
    }
  }
  return result;
}
