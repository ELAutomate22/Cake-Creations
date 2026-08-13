"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { twoDirections } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Personalised and Classic.
 *
 * On desktop this pins for a short stretch: the word behind the content
 * changes from Personalised to Classic, the photograph wipes across, and the
 * supporting copy swaps. The transformation is driven entirely by scroll
 * position, so the visitor is in control of the pace and can scrub back.
 *
 * The pin is deliberately short — roughly one and a half screens — so nobody
 * feels held. On phones and under reduced motion it becomes two ordinary
 * stacked panels, which tells the same story without the machinery.
 */
export function TwoDirections() {
  const rootRef = useRef<HTMLElement>(null);
  const [stage, setStage] = useState<0 | 1>(0);

  useGSAP(
    () => {
      // The pin needs both a pointer that can scroll precisely and a viewport
      // tall enough to hold the composition.
      const canPin =
        !prefersReducedMotion() &&
        window.matchMedia("(min-width: 1024px)").matches;

      if (!canPin) return;

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "+=140%",
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          // Drives the text swap at the midpoint of the pinned stretch.
          onUpdate: (self) => setStage(self.progress > 0.5 ? 1 : 0),
        },
      });

      timeline
        // The classic photograph wipes across the personalised one.
        .fromTo(
          "[data-panel='classic']",
          { clipPath: "inset(0 0 0 100%)" },
          { clipPath: "inset(0 0 0 0%)", ease: "power2.inOut", duration: 1 },
          0.15,
        )
        // The word behind the content crossfades.
        .to("[data-word='personalised']", { opacity: 0, duration: 0.5 }, 0.3)
        .fromTo(
          "[data-word='classic']",
          { opacity: 0 },
          { opacity: 1, duration: 0.5 },
          0.45,
        );
    },
    { scope: rootRef },
  );

  const active = stage === 0 ? twoDirections.personalised : twoDirections.classic;

  return (
    <>
      {/* ── Desktop: the pinned sequence ──────────────────────────────── */}
      <section
        ref={rootRef}
        className="relative hidden overflow-hidden bg-espresso lg:block"
        aria-label={`${twoDirections.heading} — ${twoDirections.standfirst}`}
      >
        <div className="on-dark relative flex h-screen items-center">
          {/* Oversized word, sitting behind everything as atmosphere. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              data-word="personalised"
              className="absolute select-none font-serif leading-none text-ivory/[0.06]"
              style={{ fontSize: "clamp(6rem, 15vw, 15rem)" }}
            >
              Personalised
            </span>
            <span
              data-word="classic"
              className="absolute select-none font-serif leading-none text-ivory/[0.06]"
              style={{ fontSize: "clamp(6rem, 15vw, 15rem)", opacity: 0 }}
            >
              Classic
            </span>
          </div>

          <div className="shell relative grid w-full grid-cols-2 items-center gap-16">
            {/* Photograph, with the classic shot wiping over the top. */}
            <div className="relative aspect-[4/5] w-full">
              <div className="absolute inset-0">
                <CakeImage
                  src={twoDirections.personalised.image.src}
                  alt={twoDirections.personalised.image.alt}
                  label="Personalised cake photograph"
                  className="h-full w-full"
                  sizes="45vw"
                />
              </div>
              <div data-panel="classic" className="absolute inset-0">
                <CakeImage
                  src={twoDirections.classic.image.src}
                  alt={twoDirections.classic.image.alt}
                  label="Classic cake photograph"
                  className="h-full w-full"
                  sizes="45vw"
                />
              </div>
            </div>

            {/* Words. Swapped at the midpoint rather than animated per line,
                so the reading experience stays calm while scrubbing. */}
            <div>
              <p className="eyebrow text-ivory/50">{twoDirections.eyebrow}</p>
              <p className="mt-6 font-serif text-6xl leading-none text-ivory/25">
                {active.number}
              </p>
              <h2 className="display mt-6 text-ivory">{active.title}</h2>
              <p className="voice measure mt-6 text-ivory/80">{active.body}</p>

              <ul className="mt-9 grid grid-cols-2 gap-x-8 gap-y-3">
                {active.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm text-ivory/75"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 block h-px w-4 shrink-0 bg-ivory/40"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Phones, tablets and reduced motion: two plain panels ──────── */}
      <section className="on-dark bg-espresso py-24 sm:py-28 lg:hidden">
        <div className="shell">
          <p className="eyebrow text-ivory/50">{twoDirections.eyebrow}</p>
          <h2 className="display mt-5 text-ivory">{twoDirections.heading}</h2>
          <p className="voice measure-wide mt-6 text-ivory/75">
            {twoDirections.standfirst}
          </p>

          <div className="mt-16 space-y-20">
            {[twoDirections.personalised, twoDirections.classic].map((entry) => (
              <article key={entry.number}>
                <div data-reveal="mask">
                  <CakeImage
                    src={entry.image.src}
                    alt={entry.image.alt}
                    label={`${entry.title} photograph`}
                    className="aspect-[4/5] w-full sm:aspect-[16/10]"
                    sizes="100vw"
                  />
                </div>

                <p className="mt-8 font-serif text-5xl leading-none text-ivory/25">
                  {entry.number}
                </p>
                <h3 className="display-sm mt-4 text-ivory">{entry.title}</h3>
                <p className="voice measure mt-4 text-ivory/80">{entry.body}</p>

                <ul className="mt-7 space-y-2.5">
                  {entry.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-ivory/75"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 block h-px w-4 shrink-0 bg-ivory/40"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
