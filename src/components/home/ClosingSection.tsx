"use client";

import Link from "next/link";
import { closing, media } from "@/content/site";
import { useSiteUI } from "@/components/layout/SiteChrome";

/**
 * The final section before the footer.
 *
 * Deliberately contains no ordering language: the three actions are to look at
 * the work, write about a cake already received, or get in touch.
 */
export function ClosingSection() {
  const { openContact, openReview } = useSiteUI();

  const background = closing.backgroundImage.src || media.intro.posterFallback;

  return (
    <section
      aria-labelledby="closing-heading"
      className="on-dark relative isolate overflow-hidden bg-espresso py-28 text-center sm:py-36"
    >
      {/* ── Background ────────────────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={background}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-full w-full object-cover opacity-35"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-espresso/85 via-espresso/70 to-espresso/90"
        />
      </div>

      <div className="mx-auto max-w-[52rem] px-5 sm:px-8">
        <h2
          id="closing-heading"
          className="display text-ivory text-balance"
        >
          {closing.heading}
        </h2>

        <p className="voice mx-auto mt-7 max-w-[38rem] text-ivory/80">
          {closing.body}
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/gallery"
            className="bg-ivory px-9 py-4 text-sm uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-champagne"
          >
            View Gallery
          </Link>

          <button
            type="button"
            onClick={openReview}
            className="border border-ivory/45 px-9 py-4 text-sm uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-ivory hover:text-espresso"
          >
            Leave a Review
          </button>

          <button
            type="button"
            onClick={openContact}
            className="border border-ivory/45 px-9 py-4 text-sm uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-ivory hover:text-espresso"
          >
            Contact Us
          </button>
        </div>
      </div>
    </section>
  );
}
