import { NextResponse } from "next/server";
import { publicClient } from "@/lib/supabase/server";
import {
  MIN_COMPLETION_MS,
  reviewSubmissionSchema,
  toFieldErrors,
} from "@/lib/reviews/schema";
import {
  looksLikeSpam,
  normaliseEmail,
  sanitiseLine,
  sanitiseText,
} from "@/lib/reviews/sanitise";
import {
  checkBurst,
  clientIp,
  hashSubmitter,
  throttleMessage,
} from "@/lib/reviews/rateLimit";
import {
  PUBLIC_REVIEW_COLUMNS,
  REVIEWS_PER_PAGE,
  type PublicReview,
} from "@/lib/reviews/types";

/** Reviews change whenever someone submits one, so never cache this route. */
export const dynamic = "force-dynamic";

/* ═══════════════════════════════════════════════════════════════════════════
   GET — the public list
   ═══════════════════════════════════════════════════════════════════════════
   Uses the anonymous key, so row level security applies and only visible rows
   come back. customer_email is not selectable by this role at all.
   ═══════════════════════════════════════════════════════════════════════════ */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(0, Number(searchParams.get("page") ?? 0) || 0);
  const from = page * REVIEWS_PER_PAGE;
  const to = from + REVIEWS_PER_PAGE - 1;

  try {
    const supabase = publicClient();

    const [listResult, summaryResult] = await Promise.all([
      supabase
        .from("cake_reviews")
        .select(PUBLIC_REVIEW_COLUMNS)
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase.rpc("cake_review_summary").single(),
    ]);

    if (listResult.error) throw listResult.error;

    const summary = summaryResult.data as
      | { average: number | string; total: number | string }
      | null;

    const total = Number(summary?.total ?? 0);

    return NextResponse.json({
      reviews: (listResult.data ?? []) as unknown as PublicReview[],
      summary: {
        average: Number(summary?.average ?? 0),
        total,
      },
      hasMore: to + 1 < total,
    });
  } catch (error) {
    console.error("Failed to load reviews:", error);
    return NextResponse.json(
      { error: "Reviews could not be loaded just now." },
      { status: 503 },
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   POST — publish a new review
   ═══════════════════════════════════════════════════════════════════════════
   Valid reviews go live immediately. There is no approval queue by design; the
   owner can hide or delete anything unwanted afterwards from /admin.
   ═══════════════════════════════════════════════════════════════════════════ */

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "That submission could not be read." },
      { status: 400 },
    );
  }

  // ── 1. Validate ─────────────────────────────────────────────────────────
  const parsed = reviewSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields.",
        fields: toFieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const submission = parsed.data;

  // ── 2. Bot checks ───────────────────────────────────────────────────────
  // The honeypot is invisible to people, so anything in it is automated.
  if (submission.website) {
    // Answer as though it succeeded. A script that is told it failed will
    // simply adjust and retry; one that believes it worked moves on.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (
    submission.elapsed_ms !== undefined &&
    submission.elapsed_ms < MIN_COMPLETION_MS
  ) {
    return NextResponse.json(
      {
        error:
          "That was submitted very quickly. Please take a moment and try again.",
      },
      { status: 429 },
    );
  }

  // ── 3. Sanitise ─────────────────────────────────────────────────────────
  const name = sanitiseLine(submission.customer_name);
  const occasion = submission.occasion
    ? sanitiseLine(submission.occasion)
    : null;
  const reviewText = sanitiseText(submission.review_text);
  const email = normaliseEmail(submission.customer_email);

  // Cleaning can shorten a field past the minimum — for instance if the review
  // was mostly a link. Re-check what will actually be stored.
  if (name.length < 2) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields.",
        fields: { customer_name: "Please enter your name." },
      },
      { status: 400 },
    );
  }

  if (reviewText.length < 20) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields.",
        fields: {
          review_text:
            "Please write a little more about your cake. Links cannot be included.",
        },
      },
      { status: 400 },
    );
  }

  if (looksLikeSpam(submission.review_text, reviewText)) {
    return NextResponse.json(
      {
        error:
          "That review could not be published. Please write it in your own words, without links.",
      },
      { status: 422 },
    );
  }

  // ── 4. Throttle ─────────────────────────────────────────────────────────
  const hash = hashSubmitter(clientIp(request.headers));

  const burst = checkBurst(hash);
  if (!burst.allowed) {
    return NextResponse.json({ error: burst.reason }, { status: 429 });
  }

  // ── 5. Store, and publish immediately ───────────────────────────────────
  // The database function does the writing. It accepts only the fields a
  // visitor may supply, so is_visible and owner_response cannot be set from
  // here however the request is crafted. The remaining throttling rules are
  // enforced inside that function too.
  try {
    const supabase = publicClient();

    const { data, error } = await supabase
      .rpc("submit_cake_review", {
        p_customer_name: name,
        p_customer_email: email,
        p_cake_type: submission.cake_type,
        p_cake_style: submission.cake_style,
        p_occasion: occasion,
        p_rating: submission.rating,
        p_review_text: reviewText,
        p_submitter_hash: hash,
        p_user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      })
      .single();

    if (error) {
      const throttled = throttleMessage(error.message);
      if (throttled) {
        return NextResponse.json({ error: throttled }, { status: 429 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, review: data }, { status: 201 });
  } catch (error) {
    console.error("Failed to save review:", error);
    return NextResponse.json(
      {
        error:
          "Your review could not be saved just now. Please try again shortly.",
      },
      { status: 503 },
    );
  }
}
