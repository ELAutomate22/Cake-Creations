"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion";
import { useMediaQuery, useReducedMotion } from "@/hooks/useMediaQuery";

/**
 * The repetition hover effect.
 *
 * Several identical copies of the photograph are stacked on top of one another.
 * On hover the copies above collapse to nothing one after another — last one
 * first, which is what the negative stagger buys — while the copy underneath
 * settles back from a slight zoom. The result reads as the photograph folding
 * in on itself in rhythm rather than a single element being scaled.
 *
 * Two departures from the reference implementation, both deliberate:
 *
 * The reference paints each copy with a CSS `background-image` pointing at the
 * original file. Here every copy is a `next/image`, because the alternative is
 * handing every visitor the full-size master of each photograph and undoing the
 * responsive sizes the asset pipeline exists to produce. All the copies share
 * one `src`, so the browser makes a single request and reuses one decode.
 *
 * A touchscreen has no hover, so it gets the same effect on a different
 * trigger: each photograph plays it once as it scrolls into view. The timeline
 * begins and ends on the plain photograph, which is what makes this work as a
 * reveal as well as a hover.
 *
 * On touch the copies are also built and thrown away around that one play,
 * rather than sitting in the page for the whole visit. A gallery of seventeen
 * photographs would otherwise carry sixty-eight image elements on the device
 * least able to spare the memory. Either way the server HTML holds one image,
 * which is what the crawler and the largest-contentful paint want.
 */

export type RepetitionHoverProps = {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  imageClassName?: string;
  blurDataURL?: string;
  /** Total copies, including the one underneath. Two is the minimum. */
  repetitions?: number;
  /** How far the bottom copy is zoomed in before it settles back to rest. */
  initialScale?: number;
  duration?: number;
  /** Negative, so the copy on top leaves first. */
  stagger?: number;
  ease?: string;
  /** Where the collapse converges on, as a CSS transform-origin. */
  origin?: string;
  /** `scale` collapses inwards; `scaleX` and `scaleY` wipe. */
  animate?: "scale" | "scaleX" | "scaleY";
};

export function RepetitionHover({
  src,
  alt,
  sizes,
  priority = false,
  imageClassName = "",
  blurDataURL,
  repetitions = 4,
  initialScale = 1.4,
  duration = 0.75,
  stagger = -0.11,
  ease = "power2.inOut",
  origin = "50% 50%",
  animate = "scale",
}: RepetitionHoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // A mouse or trackpad, rather than a finger. Both halves matter: a phone
  // reports no hover, and a tablet with a stylus reports hover it cannot
  // sustain. Returns false during server rendering, so the extra copies are
  // added on the client or not at all.
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reducedMotion = useReducedMotion();

  // Hover drives it where there is a pointer; scrolling drives it where there
  // is not. Reduced motion means neither.
  const hoverDriven = canHover && !reducedMotion;
  const scrollDriven = !canHover && !reducedMotion;

  // On touch the copies exist only for the length of one play.
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");

  const active = hoverDriven || (scrollDriven && phase === "playing");

  // The copies stacked above the base one.
  const echoes = useMemo(
    () => Array.from({ length: active ? Math.max(2, repetitions) - 1 : 0 }),
    [active, repetitions],
  );

  /*
   * Touch: arm the effect as the photograph comes into view.
   *
   * The observer is disconnected the moment it fires. This plays once per
   * photograph — replaying it on every pass would turn a scroll back up the
   * page into a screenful of cakes flickering.
   */
  useEffect(() => {
    if (!scrollDriven || phase !== "idle") return;

    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setPhase("playing");
      },
      // A little inside the viewport, so the effect is not already over by the
      // time the photograph is actually looked at.
      { rootMargin: "0px 0px -15% 0px" },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, [scrollDriven, phase]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || !active) return;

      const layers = gsap.utils.toArray<HTMLElement>(
        "[data-repetition-layer]",
        root,
      );
      if (layers.length < 2) return;

      // The root and the base copy share an origin; the copies above collapse
      // about their own centres, which is what gives the effect its depth.
      gsap.set([root, layers[0]], { transformOrigin: origin });

      const timeline = gsap
        .timeline({ paused: true })
        .set(layers[0], { [animate]: initialScale })
        .to(
          layers,
          {
            // The base copy returns to rest; everything above it goes to nothing.
            [animate]: (index: number) => (index === 0 ? 1 : 0),
            duration,
            ease,
            stagger,
          },
          0,
        );

      /*
       * Touch: play it through once, then drop the copies.
       *
       * The timeline ends where it began, on the plain photograph, so there is
       * nothing to reverse and nothing left looking mid-animation. Clearing the
       * phase unmounts the copies a beat later, leaving the single image behind.
       */
      if (scrollDriven) {
        timeline.eventCallback("onComplete", () => setPhase("done"));
        timeline.play();
        return () => {
          timeline.kill();
        };
      }

      const play = () => timeline.play();
      const reverse = () => timeline.reverse();

      root.addEventListener("pointerenter", play);
      root.addEventListener("pointerleave", reverse);

      /*
       * Keyboard parity.
       *
       * These photographs sit inside the button or link that already owns the
       * focus — adding a tabindex here would put a second, silent stop in the
       * tab order for the same thing. So the effect listens to whichever
       * interactive ancestor it happens to be inside, and does nothing when
       * there is not one.
       */
      const focusable = root.closest<HTMLElement>("a[href], button, [tabindex]");
      focusable?.addEventListener("focus", play);
      focusable?.addEventListener("blur", reverse);

      return () => {
        root.removeEventListener("pointerenter", play);
        root.removeEventListener("pointerleave", reverse);
        focusable?.removeEventListener("focus", play);
        focusable?.removeEventListener("blur", reverse);
        timeline.kill();
      };
    },
    {
      scope: rootRef,
      dependencies: [
        active,
        scrollDriven,
        animate,
        duration,
        ease,
        initialScale,
        origin,
        stagger,
        echoes.length,
      ],
      revertOnUpdate: true,
    },
  );

  const image = (decorative: boolean) => (
    <Image
      src={src}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={blurDataURL ? "blur" : "empty"}
      blurDataURL={blurDataURL}
      className={imageClassName}
    />
  );

  return (
    <div ref={rootRef} className="repetition">
      {/* The photograph itself, and the only one that exists server-side. */}
      <div data-repetition-layer className="repetition__layer">
        {image(false)}
      </div>

      {/* Copies. Described by the one above, so silent to a screen reader. */}
      {echoes.map((_, index) => (
        <div
          key={index}
          data-repetition-layer
          aria-hidden="true"
          className="repetition__layer"
        >
          {image(true)}
        </div>
      ))}
    </div>
  );
}
