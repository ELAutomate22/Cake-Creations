"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { business, media } from "@/content/site";
import { useSiteUI } from "@/components/layout/SiteChrome";

/**
 * The Home page hero.
 *
 * A cake video plays behind the wordmark where one has been supplied. Until
 * then the opening photograph carries the section, so there is never an empty
 * black rectangle at the top of the page.
 *
 * The video is muted, plays inline, loops, and pauses itself once scrolled well
 * out of view so it is not decoding frames nobody is watching.
 */
export function Hero() {
  const { openContact } = useSiteUI();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  const hasVideo = Boolean(media.hero.video) && !videoFailed;

  // Stop decoding once the hero is well off screen, and resume on return.
  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Autoplay refused. The poster remains, which is a fine still hero.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [hasVideo]);

  return (
    <section
      ref={sectionRef}
      className="on-dark relative flex min-h-[100svh] items-end overflow-hidden bg-espresso"
    >
      {/* ── Background ────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={media.hero.video}
            poster={media.hero.poster || media.intro.posterFallback}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            onError={() => setVideoFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.intro.posterFallback}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        )}

        {/* Keeps the wordmark legible over any photograph. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/55 to-espresso/25"
        />
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="relative z-[1] mx-auto w-full max-w-[88rem] px-5 pb-24 pt-32 sm:px-8 sm:pb-28 lg:px-12 lg:pb-32">
        <div className="max-w-[46rem]">
          <p
            className="text-[0.6875rem] uppercase tracking-[0.28em] text-ivory/70"
            style={{ animation: "rise 700ms var(--ease-silk) 100ms both" }}
          >
            Personalised &amp; classic cakes
          </p>

          <h1
            className="display-lg mt-6 text-ivory"
            style={{ animation: "rise 800ms var(--ease-silk) 200ms both" }}
          >
            {business.name}
          </h1>

          {/* The brand statement placeholder, replaced from the content file. */}
          <p
            className="voice measure mt-7 text-ivory/85"
            style={{ animation: "rise 800ms var(--ease-silk) 340ms both" }}
          >
            {business.brandStatement}
          </p>

          <div
            className="mt-11 flex flex-wrap gap-4"
            style={{ animation: "rise 800ms var(--ease-silk) 460ms both" }}
          >
            <Link
              href="/gallery"
              className="bg-ivory px-9 py-4 text-sm uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-champagne"
            >
              View Gallery
            </Link>

            <button
              type="button"
              onClick={openContact}
              className="border border-ivory/45 px-9 py-4 text-sm uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-ivory hover:text-espresso"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>

      {/* ── Scroll cue ────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ivory/60 sm:flex"
      >
        <span className="text-[0.5625rem] uppercase tracking-[0.24em]">
          Scroll
        </span>
        <svg
          width="14"
          height="22"
          viewBox="0 0 14 22"
          fill="none"
          className="animate-scroll-cue"
        >
          <path
            d="M7 2v16m0 0 4.5-4.5M7 18l-4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}
