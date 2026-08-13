"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * A hairline showing progress through the page.
 *
 * Two pixels of muted plum along the very top. It is meant to be the sort of
 * thing a visitor only notices if they go looking — not a loading bar. Hidden
 * entirely under reduced motion, where a constantly moving element is exactly
 * what the setting is asking to avoid.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (prefersReducedMotion() || !barRef.current) return;

    gsap.to(barRef.current, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        start: 0,
        end: () => document.documentElement.scrollHeight - window.innerHeight,
        scrub: 0.3,
        invalidateOnRefresh: true,
      },
    });
  });

  return <div ref={barRef} className="progress" aria-hidden="true" />;
}
