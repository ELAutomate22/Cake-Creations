"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { showcase } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * The editorial showcase.
 *
 * The one horizontal moment on the site: on desktop the three panels travel
 * sideways while the page scrolls down, each holding most of the viewport. It
 * is used once and only once — a second horizontal section would stop feeling
 * like a device and start feeling like a navigation problem.
 *
 * On phones this is an ordinary swipeable row with scroll snapping. Desktop
 * horizontal-scroll behaviour is never forced onto a touchscreen.
 */
export function EditorialShowcase() {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const canPin =
        !prefersReducedMotion() &&
        window.matchMedia("(min-width: 1024px)").matches;

      if (!canPin || !trackRef.current) return;

      const track = trackRef.current;
      // How far the track has to travel for its last panel to sit flush right.
      const distance = () => track.scrollWidth - window.innerWidth;

      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          // The scroll length matches the travel, so the sideways movement
          // tracks the wheel one-to-one and never feels rubbery.
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    },
    { scope: rootRef },
  );

  return (
    <>
      {/* ── Desktop: horizontal travel ────────────────────────────────── */}
      <section
        ref={rootRef}
        className="relative hidden overflow-hidden bg-ivory lg:block"
        aria-label={showcase.heading}
      >
        <div className="flex h-screen items-center">
          <div ref={trackRef} className="flex gap-8 pl-12 will-change-transform">
            {/* An opening card, so the row does not begin mid-photograph. */}
            <div className="flex w-[34vw] shrink-0 flex-col justify-center pr-8">
              <p className="eyebrow text-cocoa-soft">{showcase.eyebrow}</p>
              <h2 className="display mt-5 text-espresso">{showcase.heading}</h2>
              <p className="mt-8 flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.22em] text-cocoa-soft">
                Scroll
                <span aria-hidden="true" className="block h-px w-12 bg-caramel" />
              </p>
            </div>

            {showcase.panels.map((panel) => (
              <article key={panel.id} className="w-[46vw] shrink-0">
                <CakeImage
                  src={panel.image.src}
                  alt={panel.image.alt}
                  label={`${panel.word} cake photograph`}
                  className="aspect-[4/5] w-full"
                  sizes="46vw"
                />
                <div className="mt-6 flex items-baseline justify-between gap-6">
                  <h3 className="font-serif text-3xl text-espresso">{panel.word}</h3>
                  <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-cocoa-soft">
                    {panel.caption}
                  </p>
                </div>
              </article>
            ))}

            {/* Breathing room past the final panel. */}
            <div aria-hidden="true" className="w-[12vw] shrink-0" />
          </div>
        </div>
      </section>

      {/* ── Phones and tablets: an ordinary swipeable row ─────────────── */}
      <section className="bg-ivory py-24 sm:py-28 lg:hidden">
        <div className="shell">
          <p className="eyebrow text-cocoa-soft">{showcase.eyebrow}</p>
          <h2 className="display mt-5 text-espresso">{showcase.heading}</h2>
        </div>

        <div
          className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          tabIndex={0}
          aria-label="Cake showcase, scroll sideways"
        >
          {showcase.panels.map((panel) => (
            <article
              key={panel.id}
              className="w-[78vw] shrink-0 snap-center sm:w-[58vw]"
            >
              <CakeImage
                src={panel.image.src}
                alt={panel.image.alt}
                label={`${panel.word} cake photograph`}
                className="aspect-[4/5] w-full"
                sizes="78vw"
              />
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <h3 className="font-serif text-2xl text-espresso">{panel.word}</h3>
                <p className="text-[0.625rem] uppercase tracking-[0.2em] text-cocoa-soft">
                  {panel.caption}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
