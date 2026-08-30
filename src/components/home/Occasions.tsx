"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { occasions } from "@/content/site";
import { gsap, isTouch, prefersReducedMotion } from "@/lib/motion";

/**
 * The occasions a cake can be made for, as a list that writes itself.
 *
 * Each name is set twice: a pale copy, and the full-strength one clipped over
 * it. Scrolling wipes the second across the first, so a name fills in from the
 * left as it arrives. The movement is tied to the scroll rather than to a
 * clock, which means it belongs to the visitor's own gesture instead of
 * playing at them.
 *
 * There is deliberately no image here. The section has carried a 3D cake and
 * then a photographed one, and both competed with the list rather than
 * supporting it. The names are the content.
 */

export function Occasions() {
  const rootRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      if (prefersReducedMotion()) return;

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

        {/* ── The occasions ──────────────────────────────────────────── */}
        <ul className="mt-14 lg:mt-20">
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
    </section>
  );
}
