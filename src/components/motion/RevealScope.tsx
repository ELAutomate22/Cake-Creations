"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { createScrollReveals } from "@/lib/motion";

/**
 * Runs the shared scroll reveals for everything inside it.
 *
 * Sections mark up their own elements with `data-reveal` and this handles the
 * rest, so a simple fade-up does not need its own GSAP timeline in every
 * component. Sections with genuinely bespoke choreography — the hero, the
 * pinned Personalised/Classic sequence — still own their timelines directly.
 *
 * `useGSAP` reverts everything it created when this unmounts, so navigating
 * away leaves no ScrollTriggers behind.
 */
export function RevealScope({ children }: { children: React.ReactNode }) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      createScrollReveals(scopeRef.current);
    },
    { scope: scopeRef },
  );

  return <div ref={scopeRef}>{children}</div>;
}
