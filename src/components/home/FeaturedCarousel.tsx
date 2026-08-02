"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { featuredCakes, resolved } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";

/**
 * The featured cake carousel.
 *
 * Exactly three cakes, and exactly three indicators beneath them.
 *
 * The track is a native horizontal scroller with scroll snapping, which means
 * touch swiping is handled by the browser itself — smooth on every phone, and
 * it never fights with vertical page scrolling. The desktop controls and the
 * indicators simply scroll that same track, so every input method stays in
 * agreement about which slide is showing.
 *
 * It never advances on its own.
 */
export function FeaturedCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  const count = featuredCakes.length;

  /** Scrolls the track to a given slide. */
  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;

    const slide = track.children[index] as HTMLElement | undefined;
    if (!slide) return;

    // Centre the slide, so the same position is reached whether the visitor
    // arrived by control, keyboard or swipe.
    const target =
      slide.offsetLeft -
      track.offsetLeft -
      (track.clientWidth - slide.clientWidth) / 2;

    const left = Math.max(0, Math.min(target, track.scrollWidth - track.clientWidth));

    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (smooth && typeof track.scrollTo === "function") {
      track.scrollTo({ left, behavior: "smooth" });
    }

    // Setting the property directly is what actually guarantees the move.
    // scrollTo can be ignored in some environments, and a carousel that does
    // not respond to its own controls is worse than one that jumps.
    if (!smooth || Math.abs(track.scrollLeft - left) > 1) {
      track.scrollLeft = left;
    }

    // Mark it immediately rather than waiting to be told. When the visitor
    // uses a control or the keyboard we already know which slide they asked
    // for, so the indicator should never lag behind — or fail to move at all
    // if the observer below is unavailable.
    setActive(index);
  }, []);

  /**
   * Keeps the indicators in step when the visitor swipes.
   *
   * Controls and the keyboard already set the active slide themselves, so this
   * exists for touch scrolling, where nothing tells us which slide was chosen.
   *
   * Two mechanisms rather than one, because they fail in different places: an
   * observer reports which slide occupies the track, and a scroll listener
   * measures which slide sits nearest the centre. Whichever runs first wins,
   * and setting the same value twice costs nothing.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const slides = Array.from(track.children) as HTMLElement[];

    /** Works out which slide is nearest the middle of the track. */
    const nearestToCentre = () => {
      const centre = track.scrollLeft + track.clientWidth / 2;

      let nearest = 0;
      let shortest = Infinity;

      slides.forEach((slide, index) => {
        const slideCentre =
          slide.offsetLeft - track.offsetLeft + slide.clientWidth / 2;
        const distance = Math.abs(slideCentre - centre);

        if (distance < shortest) {
          shortest = distance;
          nearest = index;
        }
      });

      setActive(nearest);
    };

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(nearestToCentre);
    };

    track.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;

        for (const entry of entries) {
          const index = slides.indexOf(entry.target as HTMLElement);
          if (index === -1) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { index, ratio: entry.intersectionRatio };
          }
        }

        if (best && best.ratio > 0.5) setActive(best.index);
      },
      { root: track, threshold: [0.25, 0.5, 0.75, 1] },
    );

    slides.forEach((slide) => observer.observe(slide));

    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const previous = () => goTo(Math.max(0, active - 1));
  const next = () => goTo(Math.min(count - 1, active + 1));

  return (
    <section
      aria-labelledby="featured-heading"
      aria-roledescription="carousel"
      className="relative overflow-hidden py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
        {/* ── Heading and desktop controls ─────────────────────────────── */}
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="eyebrow">A closer look</p>
            <h2 id="featured-heading" className="heading mt-4 max-w-[16ch] text-balance">
              Three ways a cake begins
            </h2>
          </div>

          <div className="hidden shrink-0 gap-3 sm:flex">
            <CarouselButton
              onClick={previous}
              disabled={active === 0}
              label="Previous cake"
              direction="left"
            />
            <CarouselButton
              onClick={next}
              disabled={active === count - 1}
              label="Next cake"
              direction="right"
            />
          </div>
        </div>
      </div>

      {/* ── Track ────────────────────────────────────────────────────────── */}
      <ul
        ref={trackRef}
        className="snap-row mt-12 gap-5 px-5 sm:gap-7 sm:px-8 lg:px-12"
        // Arrow keys move between slides when the track itself has focus.
        tabIndex={0}
        aria-label="Featured cakes"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            next();
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            previous();
          }
        }}
      >
        {featuredCakes.map((cake, index) => {
          const flavour = resolved(cake.flavour);

          return (
            <li
              key={cake.id}
              className="snap-item w-[min(85vw,26rem)] lg:w-[min(38vw,30rem)]"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}: ${cake.name}`}
            >
              <article className="group h-full border border-caramel/40 bg-ivory">
                <CakeImage
                  src={cake.image.src || undefined}
                  alt={cake.image.alt}
                  label={cake.name}
                  aspect="4 / 5"
                  sizes="(max-width: 640px) 85vw, (max-width: 1024px) 60vw, 30rem"
                />

                <div className="p-7">
                  <p className="text-[0.625rem] uppercase tracking-[0.2em] text-plum">
                    {cake.category}
                  </p>

                  <h3 className="mt-3 font-serif text-3xl text-espresso">
                    {cake.name}
                  </h3>

                  <p className="mt-4 text-[0.9375rem] leading-relaxed text-cocoa-soft">
                    {cake.description}
                  </p>

                  <dl className="mt-6 space-y-1.5 text-xs text-cocoa-soft">
                    {cake.occasion && (
                      <div className="flex gap-2">
                        <dt className="sr-only">Occasion</dt>
                        <dd>{cake.occasion}</dd>
                      </div>
                    )}
                    {flavour && (
                      <div className="flex gap-2">
                        <dt className="uppercase tracking-[0.14em]">Flavour</dt>
                        <dd>{flavour}</dd>
                      </div>
                    )}
                  </dl>

                  {cake.galleryFilter && (
                    <Link
                      href={
                        cake.galleryFilter === "all"
                          ? "/gallery"
                          : `/gallery?style=${cake.galleryFilter}`
                      }
                      className="mt-7 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-espresso underline decoration-caramel underline-offset-[6px] transition-colors hover:text-plum"
                    >
                      View in Gallery
                      <span aria-hidden="true">→</span>
                      <span className="sr-only">— {cake.name}</span>
                    </Link>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {/* ── Indicators — exactly three ───────────────────────────────────── */}
      <div className="mx-auto mt-10 flex max-w-[88rem] items-center justify-center gap-2.5 px-5">
        {featuredCakes.map((cake, index) => {
          const current = index === active;

          return (
            <button
              key={cake.id}
              type="button"
              onClick={() => goTo(index)}
              aria-current={current ? "true" : undefined}
              // Generous tap target around a small, elegant mark.
              className="group p-2.5"
            >
              <span className="sr-only">
                Show {cake.name}, slide {index + 1} of {count}
              </span>
              <span
                aria-hidden="true"
                className={`block h-[3px] transition-all duration-500 ${
                  current
                    ? "w-9 bg-plum"
                    : "w-4 bg-caramel/60 group-hover:bg-caramel"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Announces the change for screen readers without stealing focus. */}
      <p className="sr-only" aria-live="polite">
        {featuredCakes[active]?.name}, slide {active + 1} of {count}
      </p>
    </section>
  );
}

function CarouselButton({
  onClick,
  disabled,
  label,
  direction,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  direction: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-12 items-center justify-center border border-caramel/50 text-espresso transition-all hover:border-espresso hover:bg-espresso hover:text-ivory disabled:pointer-events-none disabled:opacity-30"
    >
      <span className="sr-only">{label}</span>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path
          d={direction === "left" ? "M11 3 L5 9 L11 15" : "M7 3 L13 9 L7 15"}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
