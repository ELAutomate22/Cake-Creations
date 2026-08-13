"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { featured, isProvided } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";

/**
 * The three featured cakes.
 *
 * Exactly three, always — personalised, classic, occasion — with three
 * indicators beneath. Moving between them is a crossfade with a small scale
 * rather than a horizontal slide: the incoming photograph settles from 1.04 to
 * 1 while the outgoing one eases back, which reads as a change of shot rather
 * than a filmstrip being dragged along.
 *
 * Arrows and arrow keys on desktop, a finger swipe on touch. No ordering
 * actions — each slide leads to the Gallery.
 */

const SWIPE_THRESHOLD = 44;

export function FeaturedCarousel() {
  const [index, setIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const regionRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const count = featured.length;

  const goTo = useCallback(
    (next: number) => {
      const wrapped = (next + count) % count;
      setIndex(wrapped);
      setAnnouncement(
        `${featured[wrapped].title}, slide ${wrapped + 1} of ${count}`,
      );
    },
    [count],
  );

  const previous = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  // Arrow keys work whenever the carousel itself holds focus.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }
    },
    [previous, next],
  );

  // Touch swipe. Vertical gestures are left alone so the page still scrolls.
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) next();
    else previous();
  };

  // Keeps the announcement out of the way until an actual change happens.
  useEffect(() => {
    if (index === 0 && announcement === "") return;
  }, [index, announcement]);

  return (
    <section className="relative overflow-hidden bg-vanilla py-24 sm:py-28 lg:py-32">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="eyebrow text-cocoa-soft">A closer look</p>
            <h2 className="display mt-5 text-espresso">Three ways a cake begins</h2>
          </div>

          {/* ── Desktop controls ─────────────────────────────────────── */}
          <div className="hidden gap-3 md:flex">
            <button
              type="button"
              onClick={previous}
              className="flex h-12 w-12 items-center justify-center border border-espresso/25 text-espresso transition-colors hover:bg-espresso hover:text-ivory"
            >
              <span className="sr-only">Previous cake</span>
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
                <path d="M7 1 2 6l5 5M2 6h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-12 w-12 items-center justify-center border border-espresso/25 text-espresso transition-colors hover:bg-espresso hover:text-ivory"
            >
              <span className="sr-only">Next cake</span>
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
                <path d="M11 1l5 5-5 5M16 6H2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Slides ─────────────────────────────────────────────────── */}
        <div
          ref={regionRef}
          role="group"
          aria-roledescription="carousel"
          aria-label="Featured cakes"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className="relative mt-14 touch-pan-y"
        >
          <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Photograph */}
            <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/10] lg:aspect-[4/5]">
              {featured.map((item, itemIndex) => {
                const active = itemIndex === index;
                return (
                  <div
                    key={item.id}
                    aria-hidden={!active}
                    className="absolute inset-0 transition-[opacity,transform] duration-[900ms]"
                    style={{
                      opacity: active ? 1 : 0,
                      transform: active ? "scale(1)" : "scale(1.04)",
                      transitionTimingFunction: "var(--ease-silk)",
                      pointerEvents: active ? "auto" : "none",
                    }}
                  >
                    <CakeImage
                      src={item.image.src}
                      alt={item.image.alt}
                      label={`${item.title} photograph`}
                      className="h-full w-full"
                      sizes="(min-width: 1024px) 48vw, 100vw"
                    />
                  </div>
                );
              })}
            </div>

            {/* Words */}
            <div className="relative min-h-[19rem]">
              {featured.map((item, itemIndex) => {
                const active = itemIndex === index;
                return (
                  <div
                    key={item.id}
                    aria-hidden={!active}
                    inert={!active || undefined}
                    className="absolute inset-0 transition-[opacity,transform] duration-700"
                    style={{
                      opacity: active ? 1 : 0,
                      transform: active ? "translateY(0)" : "translateY(14px)",
                      transitionTimingFunction: "var(--ease-silk)",
                      pointerEvents: active ? "auto" : "none",
                    }}
                  >
                    <p className="eyebrow text-cocoa-soft">{item.eyebrow}</p>
                    <p className="mt-6 font-serif text-2xl italic text-plum">
                      {item.statement}
                    </p>
                    <h3 className="display-sm mt-3 text-espresso">{item.title}</h3>
                    <p className="voice measure mt-5 text-cocoa">{item.description}</p>

                    <dl className="mt-8 space-y-3 text-sm">
                      <div className="flex gap-4">
                        <dt className="w-24 shrink-0 text-[0.6875rem] uppercase tracking-[0.2em] text-cocoa-soft">
                          Occasion
                        </dt>
                        <dd className="text-cocoa">{item.occasion}</dd>
                      </div>
                      {isProvided(item.flavour) && (
                        <div className="flex gap-4">
                          <dt className="w-24 shrink-0 text-[0.6875rem] uppercase tracking-[0.2em] text-cocoa-soft">
                            Flavour
                          </dt>
                          <dd className="text-cocoa">{item.flavour}</dd>
                        </div>
                      )}
                    </dl>

                    <Link
                      href={`/gallery?filter=${item.galleryFilter}`}
                      tabIndex={active ? 0 : -1}
                      className="mt-9 inline-flex items-center gap-3 border-b border-espresso/30 pb-2 text-[0.8125rem] uppercase tracking-[0.18em] text-espresso transition-colors hover:border-espresso"
                    >
                      View in Gallery
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Exactly three indicators ───────────────────────────────── */}
        <div className="mt-12 flex items-center gap-3">
          {featured.map((item, itemIndex) => {
            const active = itemIndex === index;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(itemIndex)}
                aria-label={`Show ${item.title}, slide ${itemIndex + 1} of ${count}`}
                aria-current={active ? "true" : undefined}
                className="group flex h-8 items-center"
              >
                <span
                  className="block h-px transition-all duration-500"
                  style={{
                    width: active ? "3rem" : "1.25rem",
                    backgroundColor: active
                      ? "var(--color-espresso)"
                      : "color-mix(in srgb, var(--color-espresso) 28%, transparent)",
                    transitionTimingFunction: "var(--ease-silk)",
                  }}
                />
              </button>
            );
          })}

          <span className="ml-3 text-[0.6875rem] uppercase tracking-[0.2em] text-cocoa-soft">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
        </div>

        {/* Announces slide changes without interrupting what is being read. */}
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    </section>
  );
}
