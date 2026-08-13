"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/**
 * MOTION
 * ────────────────────────────────────────────────────────────────────────────
 * One registration point for GSAP, and the shared helpers every section uses.
 *
 * The guiding rule is restraint: movement stays between 10 and 50px, image
 * scale between 2 and 8%, and everything is tied to scroll position rather
 * than firing once and finishing on its own.
 */

/*
 * Registered as the module is evaluated rather than from an effect.
 *
 * Child components call useGSAP in a layout effect, and layout effects run
 * from the inside out — so a parent effect would register ScrollTrigger only
 * after the Hero had already tried to use it. Doing it on import means the
 * plugin is always in place before any component can reach for it.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export { gsap, ScrollTrigger };

/** True when the visitor has asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Coarse pointer, i.e. a touchscreen. Used to skip hover-only behaviour. */
export function isTouch(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * The starting state for each kind of reveal, and where each one lands.
 */
const REVEAL_FROM: Record<string, gsap.TweenVars> = {
  up: { opacity: 0, y: 24 },
  fade: { opacity: 0 },
  mask: { clipPath: "inset(0 0 100% 0)" },
  "mask-x": { clipPath: "inset(0 100% 0 0)" },
  scale: { opacity: 0, scale: 1.04 },
};

const REVEAL_TO: Record<string, gsap.TweenVars> = {
  up: { opacity: 1, y: 0 },
  fade: { opacity: 1 },
  mask: { clipPath: "inset(0 0 0% 0)" },
  "mask-x": { clipPath: "inset(0 0 0 0%)" },
  scale: { opacity: 1, scale: 1 },
};

/**
 * Animates every `[data-reveal]` element inside `scope` as it comes into view.
 *
 * Elements that enter together are staggered as a group, so a row of cakes
 * arrives in sequence rather than all at once — but the stagger is kept short
 * so the page never feels like it is waiting for itself.
 *
 * Call inside `useGSAP` so the triggers are cleaned up on unmount.
 */
export function createScrollReveals(scope: HTMLElement | null): void {
  if (!scope || prefersReducedMotion()) return;

  const elements = gsap.utils.toArray<HTMLElement>("[data-reveal]", scope);
  if (elements.length === 0) return;

  /*
   * The hidden starting state is applied here, in a layout effect, rather than
   * by a stylesheet. Two reasons: the browser has not painted yet so there is
   * no flash, and if this code never runs — a failed chunk, JavaScript off —
   * the content is simply visible. Nothing is ever left hidden waiting for an
   * animation that is not coming.
   */
  for (const node of elements) {
    const element = node as HTMLElement;
    const kind = element.dataset.reveal ?? "up";
    gsap.set(element, REVEAL_FROM[kind] ?? REVEAL_FROM.up);
  }

  ScrollTrigger.batch(elements, {
    start: "top 88%",
    once: true,
    onEnter: (batch) => {
      for (const node of batch) {
        const element = node as HTMLElement;
        const kind = element.dataset.reveal ?? "up";
        const from = REVEAL_FROM[kind] ?? REVEAL_FROM.up;
        const to = REVEAL_TO[kind] ?? REVEAL_TO.up;
        const delay = Number(element.dataset.revealDelay ?? 0);

        gsap.fromTo(element, from, {
          ...to,
          duration: kind.startsWith("mask") ? 1.1 : 0.85,
          delay,
          ease: "power3.out",
          // Leaves no inline styles behind, so hover and layout stay clean.
          clearProps: "clipPath,transform,opacity",
        });
      }
    },
    batchMax: 6,
    // A short gap between siblings; long enough to read as sequence, short
    // enough that the last item is not left waiting.
    interval: 0.08,
  });
}

/**
 * A gentle parallax: the element moves a little slower than the page.
 *
 * `strength` is the total travel in pixels across the whole scroll through the
 * section. Anything above about 80 starts to feel like a gimmick.
 */
export function createParallax(
  element: HTMLElement | null,
  strength = 60,
): void {
  if (!element || prefersReducedMotion()) return;

  gsap.fromTo(
    element,
    { yPercent: -strength / 20 },
    {
      yPercent: strength / 20,
      ease: "none",
      scrollTrigger: {
        trigger: element.parentElement ?? element,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    },
  );
}
