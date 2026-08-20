import { NextResponse } from "next/server";
import { reviewSubmissionSchema } from "@/lib/reviews/schema";
import {
  clientIp,
  fingerprint,
  publicName,
  sanitiseText,
} from "@/lib/reviews/sanitise";
import { isDatabaseConfigured, query } from "@/lib/d1/client";
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
 * GET serves the published reviews. It exists because D1 has no public key to
 * hand a browser — reads that used to happen in the page now happen here, and
 * the columns are named explicitly so an email address cannot leave the server.
 *
 * The checks on a submission, in order:
 *
 *   1. the honeypot field, which only an automated filler would populate
 *   2. full schema validation, including the no-links rule
 *   3. rate limiting, against a salted hash of the submitter's address
 *   4. duplicate detection, so a double-tap does not post twice
 *   5. sanitisation, then insert
 */

export const runtime = "nodejs";

/**
 * The columns a browser may see.
 *
 * Written out rather than `SELECT *`. Postgres used to refuse the public role
 * the email column outright; SQLite has no such privilege, so this list is now
 * the only thing standing between a customer's address and the page.
 */
const PUBLIC_COLUMNS =
  "id, customer_name, cake_type, cake_style, occasion, rating, review_text, created_at, owner_response";

/** How many reviews one submitter may post, and over what window. */
const RATE_LIMIT = { max: 3, windowHours: 24 };

/** A repeat of the same text from the same submitter inside this window. */
const DUPLICATE_WINDOW_HOURS = 24;

function problem(message: string, status: number, field?: string) {
  return NextResponse.json({ ok: false, message, field }, { status });
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, reviews: [] }, { status: 503 });
  }

  try {
    const { rows } = await query<ReviewRow>(
      `SELECT ${PUBLIC_COLUMNS} FROM cake_reviews
        WHERE is_visible = 1
        ORDER BY created_at DESC`,
    );

    return NextResponse.json(
      { ok: true, reviews: rows.map(toPublicReview) },
      // Reviews appear the moment they are left, so nothing may cache this.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Reviews could not be read:", error);
    return NextResponse.json(
      { ok: false, message: "Reviews could not be loaded." },
      { status: 500 },
    );
  }
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

  const submitter = fingerprint(clientIp(request.headers), salt);

  // ── 3. Rate limiting ─────────────────────────────────────────────────────
  const since = new Date(
    Date.now() - RATE_LIMIT.windowHours * 60 * 60 * 1000,
  ).toISOString();

  const cleanedText = sanitiseText(submission.reviewText);
  const duplicateSince = new Date(
    Date.now() - DUPLICATE_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const id = crypto.randomUUID();
  // Stored as an ISO-8601 UTC string so that ordering by text is ordering by
  // time — the whole reason the column is TEXT rather than a number.
  const createdAt = new Date().toISOString();

  let stored: ReviewRow;

  try {
    const { rows: recent } = await query<{ count: number }>(
      `SELECT COUNT(*) AS count FROM cake_reviews
        WHERE submitter_hash = ? AND created_at >= ?`,
      [submitter, since],
    );

    if ((recent[0]?.count ?? 0) >= RATE_LIMIT.max) {
      return problem(
        "You have already left several reviews recently. Thank you — please try again tomorrow.",
        429,
      );
    }

    // ── 4. Duplicate detection ─────────────────────────────────────────────
    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM cake_reviews
        WHERE submitter_hash = ? AND review_text = ? AND created_at >= ?
        LIMIT 1`,
      [submitter, cleanedText, duplicateSince],
    );

    if (existing.length > 0) {
      return problem("That review has already been posted. Thank you.", 409);
    }

    // ── 5. Clean, then store ───────────────────────────────────────────────
    const { rows: inserted } = await query<ReviewRow>(
      `INSERT INTO cake_reviews (
          id, customer_name, customer_email, cake_type, cake_style,
          occasion, rating, review_text, submitter_hash, is_visible, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        RETURNING ${PUBLIC_COLUMNS}`,
      [
        id,
        publicName(submission.name),
        submission.email,
        submission.cakeType ? sanitiseText(submission.cakeType) : null,
        submission.cakeStyle,
        submission.occasion ? sanitiseText(submission.occasion) : null,
        submission.rating,
        cleanedText,
        submitter,
        createdAt,
      ],
    );

    if (inserted.length === 0) {
      throw new Error("the insert returned no row");
    }

    stored = inserted[0];
  } catch (error) {
    console.error("Review could not be saved:", error);
    return problem("Your review could not be saved. Please try again.", 500);
  }

  // The response deliberately carries no email address.
  return NextResponse.json({ ok: true, review: toPublicReview(stored) });
}
