"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { introduction, isProvided } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * The business introduction.
 *
 * Deliberately not an "About us" box with a picture on one side and text on the
 * other. A single photograph holds the wider column, the heading arrives a line
 * at a time, and a hairline draws itself across the section as it enters.
 */
export function Introduction() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top 72%",
          once: true,
        },
      });

      timeline
        .from("[data-rule]", { scaleX: 0, duration: 1.1, ease: "power3.inOut" })
        .from(
          "[data-heading-line]",
          {
            yPercent: 110,
            duration: 1,
            ease: "power3.out",
            stagger: 0.09,
          },
          0.15,
        )
        .from(
          "[data-body]",
          { opacity: 0, y: 22, duration: 0.9, ease: "power3.out", stagger: 0.1 },
          0.5,
        )
        .from(
          "[data-primary]",
          { clipPath: "inset(0 0 100% 0)", duration: 1.25, ease: "power3.inOut" },
          0.1,
        );

      // The photographs drift a touch slower than the page.
      //
      // Only when there is a photograph to drift. Before the real photography
      // arrives these slots render a labelled frame with no <img> inside, and
      // GSAP warns about a missing target on every page load.
      const primaryImage = rootRef.current?.querySelector("[data-primary] img");
      if (primaryImage) {
        gsap.to(primaryImage, {
          yPercent: 6,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    },
    { scope: rootRef },
  );

  // The heading is split so each line can arrive from behind a mask.
  const headingLines = introduction.heading.split(" ").reduce<string[]>(
    (lines, word) => {
      const current = lines[lines.length - 1];
      if (current && (current + " " + word).length <= 28) {
        lines[lines.length - 1] = current + " " + word;
      } else {
        lines.push(word);
      }
      return lines;
    },
    [],
  );

  return (
    <section ref={rootRef} className="relative bg-ivory py-24 sm:py-32 lg:py-40">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* ── Words ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 lg:pt-12">
            <p className="eyebrow text-cocoa-soft">{introduction.eyebrow}</p>

            <div
              data-rule
              className="rule mt-6 w-full origin-left"
              aria-hidden="true"
            />

            <h2 className="display mt-9 text-espresso">
              {headingLines.map((line, index) => (
                <span key={index} className="block overflow-hidden">
                  <span data-heading-line className="block">
                    {line}
                  </span>
                </span>
              ))}
            </h2>

            <p data-body className="voice measure mt-8 text-cocoa">
              {introduction.body}
            </p>

            {isProvided(introduction.bodySecondary) && (
              <p data-body className="voice measure mt-5 text-cocoa">
                {introduction.bodySecondary}
              </p>
            )}
          </div>

          {/* ── Photographs ────────────────────────────────────────────── */}
          <div className="relative lg:col-span-7">
            <div data-primary className="relative">
              <CakeImage
                src={introduction.primaryImage.src}
                alt={introduction.primaryImage.alt}
                label="Main introduction cake photograph"
                // 4:3 rather than 3:2 in the tablet band. The photographs are
                // framed upright at 4:5, and a 3:2 window centred on one cuts
                // through the cake itself — 4:3 keeps the whole cake in frame
                // while still widening out from the phone layout.
                className="aspect-[4/5] w-full sm:aspect-[4/3] lg:aspect-[4/5]"
                sizes="(min-width: 1024px) 58vw, 100vw"
                imageClassName="scale-105"
              />

              {isProvided(introduction.primaryImage.caption) && (
                <p className="mt-4 text-[0.6875rem] uppercase tracking-[0.22em] text-cocoa-soft">
                  {introduction.primaryImage.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
