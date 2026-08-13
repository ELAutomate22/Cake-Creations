"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { reviews as copy } from "@/content/site";
import { getSupabaseClient, isDatabaseConfigured } from "@/lib/supabase/client";
import {
  summarise,
  toPublicReview,
  type PublicReview,
  type ReviewRow,
  type ReviewSummary,
} from "@/lib/reviews/types";
import { CAKE_STYLE_LABELS, type CakeStyleChoice } from "@/lib/reviews/schema";
import { StarRating } from "./Stars";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useSiteUI } from "@/components/layout/SiteChrome";

/**
 * Customer reviews.
 *
 * Reads straight from the database in the browser, using the public key. Row
 * level security is what keeps this honest: the query cannot ask for an email
 * address, because the anonymous role has no privilege on that column.
 *
 * The average and the count roll up from zero as the section arrives. That is
 * decoration only — the accessible text always states the real figures, and it
 * is present from the first render.
 */

const PAGE_SIZE = 6;

export function ReviewsSection() {
  const { openReview, reviewsVersion } = useSiteUI();
  const rootRef = useRef<HTMLElement>(null);

  // Whether a database exists at all is a build-time fact, so it is derived
  // during render rather than discovered by an effect.
  const configured = isDatabaseConfigured();

  const [items, setItems] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ count: 0, average: 0 });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [fetchState, setFetchState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const state = configured ? fetchState : "unconfigured";

  useEffect(() => {
    if (!configured) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Guards against an earlier request resolving after a later one and
    // overwriting fresher reviews.
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("cake_reviews")
        // Note what is absent: customer_email is never requested.
        .select(
          "id, customer_name, cake_type, cake_style, occasion, rating, review_text, created_at, owner_response",
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Reviews could not be loaded:", error.message);
        setFetchState("error");
        return;
      }

      const mapped = (data as ReviewRow[]).map(toPublicReview);
      setItems(mapped);
      setSummary(summarise(mapped));
      setFetchState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, reviewsVersion]);

  // The count-up. Purely visual; the real numbers are in the sr-only text.
  useGSAP(
    () => {
      if (prefersReducedMotion() || state !== "ready" || summary.count === 0) return;

      const counter = { rating: 0, total: 0 };

      gsap.to(counter, {
        rating: summary.average,
        total: summary.count,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 78%", once: true },
        onUpdate: () => {
          const ratingEl = rootRef.current?.querySelector("[data-average]");
          const totalEl = rootRef.current?.querySelector("[data-total]");
          if (ratingEl) ratingEl.textContent = counter.rating.toFixed(1);
          if (totalEl) totalEl.textContent = String(Math.round(counter.total));
        },
      });
    },
    { dependencies: [state, summary.average, summary.count], scope: rootRef },
  );

  const shown = items.slice(0, visibleCount);
  const hasMore = items.length > visibleCount;

  return (
    <section ref={rootRef} className="bg-ivory py-24 sm:py-28 lg:py-36">
      <div className="shell">
        {/* ── Heading and summary ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-10">
          <div>
            <p className="eyebrow text-cocoa-soft">{copy.eyebrow}</p>
            <h2 className="display mt-5 text-espresso">{copy.heading}</h2>
          </div>

          {state === "ready" && summary.count > 0 && (
            <div className="flex items-center gap-5">
              <StarRating value={summary.average} size="1.15rem" className="text-plum" />
              <p className="text-sm text-cocoa">
                <span aria-hidden="true">
                  <span data-average>{summary.average.toFixed(1)}</span> from{" "}
                  <span data-total>{summary.count}</span>{" "}
                  {summary.count === 1 ? "review" : "reviews"}
                </span>
                <span className="sr-only">
                  Average rating {summary.average.toFixed(1)} out of 5, from{" "}
                  {summary.count} {summary.count === 1 ? "review" : "reviews"}.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="mt-14">
          {state === "loading" && (
            <p className="voice text-cocoa-soft">Loading reviews…</p>
          )}

          {state === "unconfigured" && (
            <p className="voice measure-wide text-cocoa-soft">
              Reviews are not connected to a database yet. Once Supabase details
              are added to <code className="text-espresso">.env.local</code>,
              customer reviews will appear here automatically.
            </p>
          )}

          {state === "error" && (
            <p className="voice measure-wide text-cocoa-soft">
              Reviews could not be loaded just now. Please try again shortly.
            </p>
          )}

          {state === "ready" && items.length === 0 && (
            <p className="voice text-cocoa-soft">{copy.emptyMessage}</p>
          )}

          {state === "ready" && items.length > 0 && (
            <>
              <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {shown.map((review, index) => (
                  <li
                    key={review.id}
                    data-reveal="up"
                    data-reveal-delay={Math.min(index, 5) * 0.05}
                    className="flex flex-col border border-espresso/12 bg-vanilla/50 p-7"
                  >
                    <StarRating value={review.rating} className="text-plum" />

                    <blockquote className="mt-5 flex-1">
                      <p className="voice whitespace-pre-line text-cocoa">
                        {review.reviewText}
                      </p>
                    </blockquote>

                    <footer className="mt-6">
                      <p className="font-serif text-lg text-espresso">
                        {review.customerName}
                      </p>
                      <p className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
                        {[
                          review.cakeStyle
                            ? CAKE_STYLE_LABELS[review.cakeStyle as CakeStyleChoice]
                            : null,
                          review.cakeType,
                          review.occasion,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <time
                        dateTime={review.createdAt}
                        className="mt-2 block text-xs text-cocoa-soft"
                      >
                        {new Date(review.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>

                      {review.ownerResponse && (
                        <div className="mt-5 border-l-2 border-plum/40 pl-4">
                          <p className="text-[0.625rem] uppercase tracking-[0.18em] text-plum">
                            Reply from Elshadai Cake Creations
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm text-cocoa">
                            {review.ownerResponse}
                          </p>
                        </div>
                      )}
                    </footer>
                  </li>
                ))}
              </ul>

              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                    className="btn btn-outline"
                  >
                    Load more reviews
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-14">
          <button type="button" onClick={openReview} className="btn btn-solid">
            Leave a Review
          </button>
        </div>
      </div>
    </section>
  );
}
