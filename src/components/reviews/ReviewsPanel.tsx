"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StarsDisplay } from "./Stars";
import { useSiteUI } from "@/components/layout/SiteChrome";
import { sampleReviews, showSampleReviews } from "@/content/site";
import type { PublicReview, ReviewSummary } from "@/lib/reviews/types";

/**
 * The public review panel.
 *
 * The average and the count are always derived from the reviews the visitor
 * can actually see. Nothing here is hard-coded, and hiding a review from
 * /admin changes both figures on the next load.
 */
export function ReviewsPanel({
  initialReviews,
  initialSummary,
  initialFailed,
  hasMoreInitially,
}: {
  initialReviews: PublicReview[];
  initialSummary: ReviewSummary;
  initialFailed: boolean;
  hasMoreInitially: boolean;
}) {
  const { openReview, reviewsVersion } = useSiteUI();

  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [hasMore, setHasMore] = useState(hasMoreInitially);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(initialFailed);
  const [refreshing, setRefreshing] = useState(false);

  // Skips the refresh that would otherwise fire on first mount.
  const mountedVersion = useRef(reviewsVersion);

  /** Re-reads the first page — used after a new review is published. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/reviews?page=0", { cache: "no-store" });
      if (!response.ok) throw new Error("Request failed");

      const data = await response.json();
      setReviews(data.reviews);
      setSummary(data.summary);
      setHasMore(data.hasMore);
      setPage(0);
      setFailed(false);
    } catch {
      // The visitor's own review was published successfully; a failed refresh
      // is cosmetic, so the existing list simply stays put.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (reviewsVersion === mountedVersion.current) return;
    mountedVersion.current = reviewsVersion;
    refresh();
  }, [reviewsVersion, refresh]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const response = await fetch(`/api/reviews?page=${next}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Request failed");

      const data = await response.json();
      setReviews((current) => [...current, ...data.reviews]);
      setSummary(data.summary);
      setHasMore(data.hasMore);
      setPage(next);
    } catch {
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const hasRealReviews = reviews.length > 0;

  // Examples are shown only while there are no genuine reviews, and are always
  // labelled. They never affect the average or the count.
  const showingSamples = showSampleReviews && !hasRealReviews && !failed;
  const displayed: PublicReview[] = hasRealReviews
    ? reviews
    : showingSamples
      ? (sampleReviews as unknown as PublicReview[]).map((review) => ({
          ...review,
          is_sample: true,
        }))
      : [];

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="relative bg-vanilla py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
        {/* ── Heading and summary ──────────────────────────────────────── */}
        <div className="flex flex-col gap-10 border-b border-caramel/35 pb-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">In their words</p>
            <h2
              id="reviews-heading"
              className="heading mt-4 max-w-[15ch] text-balance"
            >
              What customers say
            </h2>
          </div>

          <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
            {summary.total > 0 ? (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-6xl leading-none text-espresso">
                    {summary.average.toFixed(1)}
                  </span>
                  <span className="text-sm text-cocoa-soft">out of 5</span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <StarsDisplay
                    rating={summary.average}
                    size={18}
                    label={`Average rating ${summary.average.toFixed(1)} out of 5, from ${summary.total} ${summary.total === 1 ? "review" : "reviews"}`}
                  />
                  <span className="text-sm text-cocoa-soft">
                    {summary.total} {summary.total === 1 ? "review" : "reviews"}
                  </span>
                </div>
              </div>
            ) : (
              !failed && (
                <p className="text-sm text-cocoa-soft">
                  No reviews yet — yours would be the first.
                </p>
              )
            )}

            <button
              type="button"
              onClick={openReview}
              className="border border-espresso/30 px-7 py-3.5 text-sm uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-espresso hover:text-ivory"
            >
              Leave a Review
            </button>
          </div>
        </div>

        {/* ── The reviews ──────────────────────────────────────────────── */}
        <div
          className="mt-12"
          aria-busy={refreshing || loadingMore}
        >
          {failed ? (
            <ReviewsNotice
              title="Reviews could not be loaded"
              body="Something went wrong at our end. Please refresh the page to try again."
              action={
                <button
                  type="button"
                  onClick={refresh}
                  className="border border-espresso/30 px-6 py-3 text-xs uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-espresso hover:text-ivory"
                >
                  Try again
                </button>
              }
            />
          ) : displayed.length === 0 ? (
            <ReviewsNotice
              title="No reviews yet"
              body="Once customers have written about their cakes, their words will appear here."
              action={
                <button
                  type="button"
                  onClick={openReview}
                  className="bg-espresso px-7 py-3.5 text-xs uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-plum"
                >
                  Be the first to leave a review
                </button>
              }
            />
          ) : (
            <>
              {showingSamples && (
                <p className="mb-8 border-l-2 border-caramel bg-ivory px-5 py-4 text-sm text-cocoa-soft">
                  <strong className="font-medium text-espresso">
                    Example content.
                  </strong>{" "}
                  These are not real customer reviews — they show how the section
                  will look. They are removed by setting{" "}
                  <code className="font-mono text-xs">showSampleReviews</code> to{" "}
                  <code className="font-mono text-xs">false</code> in the content
                  file.
                </p>
              )}

              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {displayed.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </ul>

              {hasMore && !showingSamples && (
                <div className="mt-12 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="border border-espresso/30 px-8 py-3.5 text-sm uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-espresso hover:text-ivory disabled:opacity-60"
                  >
                    {loadingMore ? "Loading…" : "Load more reviews"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── One review ──────────────────────────────────────────────────────────── */

function ReviewCard({ review }: { review: PublicReview }) {
  const date = new Date(review.created_at);
  const formatted = Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <li className="flex flex-col border border-caramel/40 bg-ivory p-7">
      {review.is_sample && (
        <span className="mb-4 self-start border border-caramel/60 px-2.5 py-1 text-[0.5625rem] uppercase tracking-[0.18em] text-cocoa-soft">
          Example
        </span>
      )}

      <StarsDisplay rating={review.rating} size={15} />

      <blockquote className="mt-5 flex-1">
        <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-cocoa">
          {review.review_text}
        </p>
      </blockquote>

      <footer className="mt-6 border-t border-caramel/30 pt-5">
        <p className="font-serif text-lg text-espresso">
          {review.customer_name}
        </p>

        <p className="mt-1 text-xs text-cocoa-soft">
          {[review.cake_style, review.cake_type, review.occasion]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {formatted && (
          <time
            dateTime={review.created_at}
            className="mt-1 block text-xs text-cocoa-soft/75"
          >
            {formatted}
          </time>
        )}
      </footer>

      {review.owner_response && (
        <div className="mt-5 border-l-2 border-plum/40 bg-vanilla px-4 py-3.5">
          <p className="text-[0.625rem] uppercase tracking-[0.16em] text-plum">
            Reply from Elshadai Cake Creations
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-cocoa">
            {review.owner_response}
          </p>
        </div>
      )}
    </li>
  );
}

/* ── Empty and error states ──────────────────────────────────────────────── */

function ReviewsNotice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-caramel/60 bg-ivory px-6 py-20 text-center">
      <p className="font-serif text-2xl text-espresso">{title}</p>
      <p className="measure mx-auto mt-3 text-sm text-cocoa-soft">{body}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
