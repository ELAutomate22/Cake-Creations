"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { benefits } from "@/content/site";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Why choose Elshadai Cake Creations.
 *
 * Six numbered entries rather than six identical cards. The numerals are the
 * design: oversized, set in the serif, and drifting at a slightly different
 * rate from the text beside them so the column has some depth to it.
 *
 * Every claim here is about design and communication. Nothing is asserted
 * about ingredients, hygiene or delivery that the business has not stated.
 */
export function Benefits() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const rows = gsap.utils.toArray<HTMLElement>("[data-benefit]", rootRef.current);

      for (const row of rows) {
        const numeral = row.querySelector("[data-numeral]");
        const body = row.querySelector("[data-benefit-body]");

        gsap
          .timeline({
            scrollTrigger: { trigger: row, start: "top 82%", once: true },
          })
          .from(numeral, {
            opacity: 0,
            y: 34,
            scale: 0.92,
            duration: 1,
            ease: "power3.out",
          })
          .from(
            body,
            { opacity: 0, y: 22, duration: 0.85, ease: "power3.out" },
            0.12,
          );

        // The numeral rides slightly slower than its text.
        gsap.to(numeral, {
          yPercent: -18,
          ease: "none",
          scrollTrigger: {
            trigger: row,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className="bg-vanilla py-24 sm:py-28 lg:py-36">
      <div className="shell">
        <div className="max-w-3xl">
          <p className="eyebrow text-cocoa-soft">{benefits.eyebrow}</p>
          <h2 className="display mt-5 text-espresso">{benefits.heading}</h2>
        </div>

        <div className="mt-16 grid gap-x-16 gap-y-14 sm:grid-cols-2">
          {benefits.items.map((item) => (
            <article
              key={item.number}
              data-benefit
              className="flex gap-6 border-t border-espresso/12 pt-8"
            >
              <p
                data-numeral
                aria-hidden="true"
                className="shrink-0 font-serif leading-none text-espresso/18"
                style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)" }}
              >
                {item.number}
              </p>

              <div data-benefit-body>
                <h3 className="display-sm text-espresso">{item.title}</h3>
                <p className="voice mt-3 text-cocoa">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
