import { publicClient } from "@/lib/supabase/server";
import {
  PUBLIC_REVIEW_COLUMNS,
  REVIEWS_PER_PAGE,
  type PublicReview,
  type ReviewSummary,
} from "@/lib/reviews/types";
import { ReviewsPanel } from "./ReviewsPanel";

/**
 * Loads the first page of reviews on the server so they appear in the HTML —
 * good for search engines, and it means the visitor never watches an empty
 * panel spin. Further pages are fetched in the browser.
 */
export async function ReviewsSection() {
  let reviews: PublicReview[] = [];
  let summary: ReviewSummary = { average: 0, total: 0 };
  let failed = false;

  try {
    const supabase = publicClient();

    const [listResult, summaryResult] = await Promise.all([
      supabase
        .from("cake_reviews")
        .select(PUBLIC_REVIEW_COLUMNS)
        .order("created_at", { ascending: false })
        .range(0, REVIEWS_PER_PAGE - 1),
      supabase.rpc("cake_review_summary").single(),
    ]);

    if (listResult.error) throw listResult.error;

    reviews = (listResult.data ?? []) as unknown as PublicReview[];

    const row = summaryResult.data as
      | { average: number | string; total: number | string }
      | null;

    summary = {
      average: Number(row?.average ?? 0),
      total: Number(row?.total ?? 0),
    };
  } catch (error) {
    console.error("Reviews could not be loaded:", error);
    failed = true;
  }

  return (
    <ReviewsPanel
      initialReviews={reviews}
      initialSummary={summary}
      initialFailed={failed}
      hasMoreInitially={summary.total > REVIEWS_PER_PAGE}
    />
  );
}
