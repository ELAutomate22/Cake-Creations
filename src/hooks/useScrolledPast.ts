"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the page has been scrolled past a threshold.
 *
 * Scroll position is browser state, not React state, so it is read through
 * `useSyncExternalStore` rather than mirrored into a `useState` from an effect.
 * That keeps the value correct on the very first client render — including
 * when someone reloads halfway down the page — without a cascading re-render.
 */
export function useScrolledPast(threshold = 64): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > threshold,
    // On the server there is no scroll position; the header starts at the top.
    () => false,
  );
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange, { passive: true });
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}
