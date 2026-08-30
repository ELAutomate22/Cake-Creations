"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { occasions } from "@/content/site";
import { CakeTurntable } from "./CakeTurntable";
import { gsap, isTouch, prefersReducedMotion, ScrollTrigger } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useMediaQuery";

/**
 * Cake occasions, told against a turning cake.
 *
 * A three-dimensional cake is held in place while the occasion names travel
 * past it, each one filling in from the left as it arrives. The cake turns in
 * step with the scroll, so the movement belongs to the visitor's own gesture
 * rather than playing at them.
 *
 * The cake is photography, not a model. Twenty-eight frames of one real cake
 * on a turntable, cut out and aligned, played against the scroll. It replaced
 * a procedural 3D cake, which needed WebGL, a fallback for when WebGL was
 * missing, and a second fallback for when the context was lost. Images need
 * none of that, and they show the cake somebody would actually receive.
 */

export function Occasions() {
  const rootRef = useRef<HTMLElement>(null);
  const progress = useRef(0);

  const [active, setActive] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const reduced = useReducedMotion();

  /*
   * Mount the canvas only once the section is near, and stop drawing entirely
   * once it has gone by.
   *
   * An IntersectionObserver rather than a ScrollTrigger: ScrollTrigger's
   * onToggle only fires on a change, so a visitor who lands directly on this
   * section — a deep link, or a reload part-way down the page — would never
   * see it fire and the cake would never appear. An observer reports the
   * current state as soon as it starts watching.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "60% 0px 20% 0px" },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      if (prefersReducedMotion()) return;

      // Scroll position is written straight into a ref. Nothing re-renders.
      ScrollTrigger.create({
        trigger: root,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          progress.current = self.progress;
        },
      });

      // Each occasion fills in from the left as it crosses the middle of the
      // screen — the same idea as a wipe, tied to scroll rather than time.
      const names = gsap.utils.toArray<HTMLElement>("[data-occasion-fill]", root);
      for (const name of names) {
        gsap.fromTo(
          name,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            ease: "none",
            scrollTrigger: {
              trigger: name,
              start: "top 82%",
              end: "top 45%",
              scrub: true,
            },
          },
        );
      }
    },
    { scope: rootRef },
  );

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden bg-ivory py-24 sm:py-28 lg:py-36"
    >
      <div className="shell">
        <div className="max-w-3xl">
          <p className="eyebrow text-cocoa-soft">{occasions.eyebrow}</p>
          <h2 data-reveal="up" className="display mt-5 text-espresso">
            {occasions.heading}
          </h2>
          <p data-reveal="up" className="voice measure-wide mt-6 text-cocoa">
            {occasions.standfirst}
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          {/* ── The cake, held in place ──────────────────────────────── */}
          <div className="lg:sticky lg:top-24 lg:h-[calc(100dvh-12rem)]">
            <div className="relative mx-auto h-[52vh] w-full max-w-md sm:h-[58vh] lg:h-full lg:max-w-none">
              {(
                /*
                  Photographs of the real cake, not a drawn one.

                  Twenty-eight frames of a single cake on a turntable, turning
                  with the scroll. This replaced a procedural 3D cake: a
                  three-dimensional model of a cake is a drawing of a cake, and
                  a customer deciding whether to order one is better served by
                  the thing itself.
                */
                <CakeTurntable
                  progress={progress}
                  active={active}
                  reducedMotion={reduced}
                  alt={occasions.turntableAlt}
                />
              )}
            </div>
          </div>

          {/* ── The occasions ────────────────────────────────────────── */}
          <ul className="lg:pt-10">
            {occasions.items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <li key={item.id} className="border-b border-espresso/10">
                  <button
                    type="button"
                    onMouseEnter={() => {
                      if (!isTouch()) setActiveId(item.id);
                    }}
                    onFocus={() => setActiveId(item.id)}
                    onClick={() => setActiveId(item.id)}
                    aria-pressed={isActive}
                    className="group relative flex w-full items-baseline justify-between gap-6 py-4 text-left sm:py-5"
                  >
                    {/*
                      Two copies of the name: a pale one underneath, and the
                      full-strength one clipped over it. Scrolling wipes the
                      second across the first.
                    */}
                    <span className="relative block">
                      <span
                        aria-hidden="true"
                        className="display-sm block text-espresso/25"
                      >
                        {item.label}
                      </span>
                      <span
                        data-occasion-fill
                        aria-hidden="true"
                        className="display-sm absolute inset-0 block text-espresso"
                      >
                        {item.label}
                      </span>
                      {/* The accessible copy, read once. */}
                      <span className="sr-only">{item.label}</span>
                    </span>

                    <span
                      aria-hidden="true"
                      className="block h-px shrink-0 bg-espresso transition-all duration-500"
                      style={{ width: isActive ? "2.5rem" : "0.75rem" }}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
