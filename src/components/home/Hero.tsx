"use client";

import Link from "next/link";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { business, media } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";
import { HeroPicture } from "@/components/ui/HeroPicture";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useSiteUI } from "@/components/layout/SiteChrome";

/**
 * The Home hero.
 *
 * A full-height cake photograph or video with the business name over it. As the
 * visitor scrolls away, the media scales very slightly, the words drift upward
 * and fade, and the section beneath appears to slide over the top.
 *
 * The movement is scrubbed against real scroll position rather than played once
 * on entry, so it tracks the visitor's own gesture — including scrolling back.
 */
export type HeroProps = {
  /**
   * The line beneath the business name, chosen per request on the server so it
   * changes on every visit. Falls back to the fixed one in the content file.
   */
  statement?: string;
};

export function Hero({ statement }: HeroProps) {
  const { openContact } = useSiteUI();
  const rootRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = Boolean(media.hero.video);
  const hasImage = Boolean(media.hero.image);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      // The entrance. Runs once, before any scrolling.
      gsap.from("[data-hero-line]", {
        opacity: 0,
        y: 26,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.11,
        delay: 0.15,
      });

      // The departure, tied to scroll.
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      timeline
        .to(mediaRef.current, { scale: 1.06, ease: "none" }, 0)
        .to(contentRef.current, { yPercent: -22, opacity: 0, ease: "none" }, 0);
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      className="on-dark relative flex min-h-[100svh] items-end overflow-hidden bg-espresso"
    >
      {/* ── Background ─────────────────────────────────────────────────── */}
      <div ref={mediaRef} className="absolute inset-0 will-change-transform">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={media.hero.video}
            poster={media.hero.image || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        ) : hasImage ? (
          /*
           * The photograph stands in a band down the middle rather than being
           * blown up to cover the screen, so the cake is seen whole. The band
           * is what carries the blend: masking the full-bleed layer would fade
           * at the window edges, which is nowhere near the photograph.
           *
           * The band takes the photograph's own 4:5 shape, so `cover` has
           * nothing to crop and the cake arrives whole, topper and board
           * included. A fixed width would not: at the hero's proportions it
           * would take a sixth off the top and bottom.
           *
           * On a phone the ratio would ask for more width than there is, so
           * `max-w-full` caps it and the band fills the screen instead — which
           * is what a phone wants anyway.
           */
          <div className="absolute inset-0 flex justify-center">
            <div className="hero-blend relative h-full aspect-[4/5] max-w-full">
              <HeroPicture
                src={media.hero.image}
                wideSrc={media.hero.imageWide || undefined}
                alt={media.hero.alt}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ) : (
          <CakeImage
            src={media.hero.image}
            alt={media.hero.alt}
            label="Hero cake photograph — add a photograph named hero-*.jpg to assets-source and run npm run assets"
            className="h-full w-full"
            sizes="100vw"
            priority
          />
        )}

        {/* Keeps the wordmark legible over any photograph. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/55 to-espresso/20"
        />
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div
        ref={contentRef}
        className="shell relative z-[1] pb-24 pt-36 sm:pb-28 lg:pb-32"
      >
        <div className="max-w-[46rem]">
          <p data-hero-line className="eyebrow text-ivory/70">
            Personalised &amp; classic cakes
          </p>

          <h1 data-hero-line className="display-lg mt-6 text-ivory">
            {business.name}
          </h1>

          <p data-hero-line className="voice measure mt-7 text-ivory/85">
            {statement ?? business.brandStatement}
          </p>

          <div data-hero-line className="mt-11 flex flex-wrap gap-4">
            <Link href="/gallery" className="btn btn-solid">
              View Gallery
            </Link>
            <button type="button" onClick={openContact} className="btn btn-outline">
              Contact Us
            </button>
          </div>
        </div>
      </div>

      {/* ── Scroll cue ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ivory/60 sm:flex"
      >
        <span className="text-[0.5625rem] uppercase tracking-[0.24em]">Scroll</span>
        <svg width="14" height="22" viewBox="0 0 14 22" fill="none" className="animate-scroll-cue">
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
