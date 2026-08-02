"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { StarsDisplay } from "@/components/reviews/Stars";
import { Wordmark } from "@/components/ui/Wordmark";
import type { OwnerReview } from "@/lib/reviews/types";
import { deleteReview, setResponse, setVisibility, signOut } from "./actions";

/**
 * The owner's review dashboard.
 *
 * There is no approve step and no pending queue: reviews are already public by
 * the time they appear here. What the owner can do is hide one, restore it,
 * delete it, or reply to it.
 *
 * Hiding and deleting both remove a review from the public list, the public
 * count and the public average — the figures shown at the top of this page are
 * calculated the same way the website calculates them.
 */

type VisibilityFilter = "all" | "visible" | "hidden";
type StyleFilter = "all" | "Personalised" | "Classic" | "Not sure";

export function AdminDashboard({
  email,
  reviews,
}: {
  email: string;
  reviews: OwnerReview[];
}) {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState<number | "all">("all");
  const [style, setStyle] = useState<StyleFilter>("all");
  const [visibility, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [notice, setNotice] = useState<string | null>(null);

  const visible = reviews.filter((review) => review.is_visible);

  /** The figures the public sees, computed from visible reviews only. */
  const publicSummary = useMemo(() => {
    if (visible.length === 0) return { average: 0, total: 0 };
    const sum = visible.reduce((total, review) => total + review.rating, 0);
    return {
      average: Math.round((sum / visible.length) * 10) / 10,
      total: visible.length,
    };
  }, [visible]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reviews.filter((review) => {
      if (visibility === "visible" && !review.is_visible) return false;
      if (visibility === "hidden" && review.is_visible) return false;
      if (rating !== "all" && review.rating !== rating) return false;
      if (style !== "all" && review.cake_style !== style) return false;

      if (term) {
        const haystack = [
          review.customer_name,
          review.customer_email,
          review.cake_type,
          review.cake_style,
          review.occasion ?? "",
          review.review_text,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [reviews, search, rating, style, visibility]);

  return (
    <div className="mx-auto max-w-[80rem] px-5 py-10 sm:px-8 sm:py-14">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-caramel/40 pb-8">
        <div>
          <Wordmark className="text-espresso" />
          <p className="mt-5 text-[0.6875rem] uppercase tracking-[0.22em] text-plum">
            Review management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-cocoa-soft">{email}</span>

          <Link
            href="/"
            className="border border-caramel/50 px-4 py-2 text-xs uppercase tracking-[0.16em] text-cocoa transition-colors hover:border-espresso hover:text-espresso"
          >
            View website
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="border border-espresso/30 px-4 py-2 text-xs uppercase tracking-[0.16em] text-espresso transition-colors hover:bg-espresso hover:text-ivory"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      {notice && (
        <p
          role="status"
          className="mt-6 border-l-2 border-danger bg-danger/8 px-4 py-3 text-sm text-danger"
        >
          {notice}
        </p>
      )}

      {/* ── Figures ──────────────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-px border border-caramel/40 bg-caramel/40 sm:grid-cols-4">
        <Figure
          label="Public average"
          value={publicSummary.total > 0 ? publicSummary.average.toFixed(1) : "—"}
        />
        <Figure label="Shown publicly" value={String(publicSummary.total)} />
        <Figure
          label="Hidden"
          value={String(reviews.length - publicSummary.total)}
        />
        <Figure label="Total received" value={String(reviews.length)} />
      </div>

      <p className="mt-3 text-xs text-cocoa-soft">
        The public average and count include only the reviews shown publicly.
        Hiding a review removes it from both straight away.
      </p>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
            Search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, cake or text"
            className="w-full border border-caramel/50 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
            Rating
          </span>
          <select
            value={rating}
            onChange={(e) =>
              setRating(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="w-full border border-caramel/50 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
          >
            <option value="all">All ratings</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} {value === 1 ? "star" : "stars"}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
            Cake style
          </span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as StyleFilter)}
            className="w-full border border-caramel/50 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
          >
            <option value="all">All styles</option>
            <option value="Personalised">Personalised</option>
            <option value="Classic">Classic</option>
            <option value="Not sure">Not sure</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
            Shown or hidden
          </span>
          <select
            value={visibility}
            onChange={(e) =>
              setVisibilityFilter(e.target.value as VisibilityFilter)
            }
            className="w-full border border-caramel/50 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
          >
            <option value="all">All reviews</option>
            <option value="visible">Shown publicly</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      </div>

      {/* ── Reviews ──────────────────────────────────────────────────────── */}
      <p className="mt-8 text-xs text-cocoa-soft" aria-live="polite">
        Showing {filtered.length} of {reviews.length}{" "}
        {reviews.length === 1 ? "review" : "reviews"}
      </p>

      {reviews.length === 0 ? (
        <p className="mt-6 border border-dashed border-caramel/60 px-6 py-20 text-center text-cocoa-soft">
          No reviews have been submitted yet.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 border border-dashed border-caramel/60 px-6 py-20 text-center text-cocoa-soft">
          No reviews match those filters.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((review) => (
            <AdminReviewRow
              key={review.id}
              review={review}
              onError={setNotice}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── One review ──────────────────────────────────────────────────────────── */

function AdminReviewRow({
  review,
  onError,
}: {
  review: OwnerReview;
  onError: (message: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingResponse, setEditingResponse] = useState(false);
  const [responseText, setResponseText] = useState(review.owner_response ?? "");

  const date = new Date(review.created_at);
  const formatted = Number.isNaN(date.getTime())
    ? review.created_at
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    onError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) onError(result.error ?? "That could not be completed.");
    });
  };

  return (
    <li
      className={`border bg-ivory p-6 transition-opacity ${
        review.is_visible ? "border-caramel/40" : "border-caramel/30 bg-vanilla"
      } ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StarsDisplay rating={review.rating} size={14} />

            <span className="font-serif text-xl text-espresso">
              {review.customer_name}
            </span>

            {!review.is_visible && (
              <span className="border border-caramel/60 px-2 py-0.5 text-[0.5625rem] uppercase tracking-[0.16em] text-cocoa-soft">
                Hidden
              </span>
            )}
          </div>

          <p className="mt-1.5 text-xs text-cocoa-soft">
            {[review.cake_style, review.cake_type, review.occasion]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <p className="mt-1 text-xs text-cocoa-soft">{formatted}</p>

          {/* Private — shown to the owner only, never on the website. */}
          <p className="mt-2 text-xs">
            <span className="text-cocoa-soft">Private email: </span>
            <a
              href={`mailto:${review.customer_email}`}
              className="break-all text-plum underline underline-offset-2"
            >
              {review.customer_email}
            </a>
          </p>
        </div>

        {/* ── Controls ─────────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => setVisibility(review.id, !review.is_visible))
            }
            className="border border-caramel/50 px-3.5 py-2 text-xs uppercase tracking-[0.14em] text-cocoa transition-colors hover:border-espresso hover:text-espresso disabled:opacity-50"
          >
            {review.is_visible ? "Hide" : "Restore"}
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setEditingResponse((open) => !open);
              setResponseText(review.owner_response ?? "");
            }}
            className="border border-caramel/50 px-3.5 py-2 text-xs uppercase tracking-[0.14em] text-cocoa transition-colors hover:border-espresso hover:text-espresso disabled:opacity-50"
          >
            {review.owner_response ? "Edit reply" : "Reply"}
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmingDelete(true)}
            className="border border-danger/40 px-3.5 py-2 text-xs uppercase tracking-[0.14em] text-danger transition-colors hover:bg-danger hover:text-ivory disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* ── The review ────────────────────────────────────────────────── */}
      <p className="mt-5 whitespace-pre-line border-l-2 border-caramel/40 pl-4 text-[0.9375rem] leading-relaxed text-cocoa">
        {review.review_text}
      </p>

      {/* ── Existing reply ────────────────────────────────────────────── */}
      {review.owner_response && !editingResponse && (
        <div className="mt-4 border-l-2 border-plum/40 bg-vanilla px-4 py-3">
          <p className="text-[0.625rem] uppercase tracking-[0.16em] text-plum">
            Your reply
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm text-cocoa">
            {review.owner_response}
          </p>
        </div>
      )}

      {/* ── Reply editor ──────────────────────────────────────────────── */}
      {editingResponse && (
        <div className="mt-4 border border-caramel/40 bg-vanilla p-4">
          <label className="block">
            <span className="mb-1.5 block text-[0.625rem] uppercase tracking-[0.16em] text-plum">
              Your reply — shown publicly beneath this review
            </span>
            <textarea
              rows={3}
              maxLength={1000}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="w-full border border-caramel/50 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-plum focus:outline-none focus:ring-1 focus:ring-plum"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await setResponse(review.id, responseText);
                  if (result.ok) setEditingResponse(false);
                  return result;
                })
              }
              className="bg-espresso px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-plum disabled:opacity-50"
            >
              Save reply
            </button>

            {review.owner_response && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await setResponse(review.id, "");
                    if (result.ok) {
                      setEditingResponse(false);
                      setResponseText("");
                    }
                    return result;
                  })
                }
                className="border border-caramel/50 px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-cocoa transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
              >
                Remove reply
              </button>
            )}

            <button
              type="button"
              onClick={() => setEditingResponse(false)}
              className="px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-cocoa-soft transition-colors hover:text-espresso"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      {confirmingDelete && (
        <div className="mt-4 border border-danger/40 bg-danger/5 p-4">
          <p className="text-sm text-espresso">
            Delete this review from {review.customer_name} permanently? This
            cannot be undone. To remove it from the website while keeping a
            record, choose <strong className="font-medium">Hide</strong> instead.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteReview(review.id))}
              className="bg-danger px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-ivory transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Yes, delete permanently
            </button>

            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="border border-caramel/50 px-5 py-2.5 text-xs uppercase tracking-[0.14em] text-cocoa transition-colors hover:border-espresso hover:text-espresso"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ivory px-5 py-6">
      <p className="text-[0.625rem] uppercase tracking-[0.16em] text-cocoa-soft">
        {label}
      </p>
      <p className="mt-2 font-serif text-4xl text-espresso">{value}</p>
    </div>
  );
}
