import { NextResponse } from "next/server";
import { reviewSubmissionSchema } from "@/lib/reviews/schema";
import {
  clientIp,
  fingerprint,
  publicName,
  sanitiseText,
} from "@/lib/reviews/sanitise";
import { createPublicClient, isDatabaseConfigured } from "@/lib/supabase/server";
import { toPublicReview, type ReviewRow } from "@/lib/reviews/types";

/**
 * Review submission.
 *
 * Reviews publish immediately — there is no pending queue and no owner
 * approval step. That places the whole burden on this endpoint, so every
 * submission is re-validated here regardless of what the browser checked,
 * cleaned before storage, and throttled per submitter.
 *
 * The checks, in order:
 *
 *   1. the honeypot field, which only an automated filler would populate
 *   2. full schema validation, including the no-links rule
 *   3. rate limiting, against a salted hash of the submitter's address
 *   4. duplicate detection, so a double-tap does not post twice
 *   5. sanitisation, then insert
 */

export const runtime = "nodejs";

/** How many reviews one submitter may post, and over what window. */
const RATE_LIMIT = { max: 3, windowHours: 24 };

/** A repeat of the same text from the same submitter inside this window. */
const DUPLICATE_WINDOW_HOURS = 24;

function problem(message: string, status: number, field?: string) {
  return NextResponse.json({ ok: false, message, field }, { status });
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return problem(
      "Reviews are not connected to a database yet. Please try again later.",
      503,
    );
  }

  const salt = process.env.REVIEW_HASH_SALT;
  if (!salt) {
    // Without the salt, throttling would store reversible address hashes.
    console.error("REVIEW_HASH_SALT is not set; refusing to accept reviews.");
    return problem("Reviews are temporarily unavailable.", 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problem("That submission could not be read.", 400);
  }

  // ── 1 + 2. Shape, contents, and the honeypot ─────────────────────────────
  const parsed = reviewSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return problem(first.message, 422, String(first.path[0] ?? ""));
  }

  const submission = parsed.data;

  if (submission.website && submission.website.length > 0) {
    // Silently accepted from the sender's point of view, never stored.
    return NextResponse.json({ ok: true, review: null });
  }

  const supabase = createPublicClient();
  const submitter = fingerprint(clientIp(request.headers), salt);

  // ── 3. Rate limiting ─────────────────────────────────────────────────────
  const since = new Date(
    Date.now() - RATE_LIMIT.windowHours * 60 * 60 * 1000,
  ).toISOString();

  const { count, error: countError } = await supabase
    .from("cake_reviews")
    .select("id", { count: "exact", head: true })
    .eq("submitter_hash", submitter)
    .gte("created_at", since);

  if (countError) {
    console.error("Rate limit check failed:", countError.message);
    return problem("Your review could not be saved. Please try again.", 500);
  }

  if ((count ?? 0) >= RATE_LIMIT.max) {
    return problem(
      "You have already left several reviews recently. Thank you — please try again tomorrow.",
      429,
    );
  }

  // ── 4. Duplicate detection ───────────────────────────────────────────────
  const cleanedText = sanitiseText(submission.reviewText);
  const duplicateSince = new Date(
    Date.now() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data: existing, error: duplicateError } = await supabase
    .from("cake_reviews")
    .select("id")
    .eq("submitter_hash", submitter)
    .eq("review_text", cleanedText)
    .gte("created_at", duplicateSince)
    .limit(1);

  if (duplicateError) {
    console.error("Duplicate check failed:", duplicateError.message);
    return problem("Your review could not be saved. Please try again.", 500);
  }

  if (existing && existing.length > 0) {
    return problem("That review has already been posted. Thank you.", 409);
  }

  // ── 5. Clean, then store ─────────────────────────────────────────────────
  const row = {
    customer_name: publicName(submission.name),
    customer_email: submission.email,
    cake_type: submission.cakeType ? sanitiseText(submission.cakeType) : null,
    cake_style: submission.cakeStyle,
    occasion: submission.occasion ? sanitiseText(submission.occasion) : null,
    rating: submission.rating,
    review_text: cleanedText,
    submitter_hash: submitter,
    is_visible: true,
  };

  const { data, error } = await supabase
    .from("cake_reviews")
    .insert(row)
    .select(
      "id, customer_name, cake_type, cake_style, occasion, rating, review_text, created_at, owner_response",
    )
    .single();

  if (error) {
    console.error("Review insert failed:", error.message);
    return problem("Your review could not be saved. Please try again.", 500);
  }

  // The response deliberately carries no email address.
  return NextResponse.json({
    ok: true,
    review: toPublicReview(data as ReviewRow),
  });
}
