"use client";

import { useEffect, useRef } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { gsap } from "@/lib/motion";

/**
 * A real cake, turning with the scroll.
 *
 * Twenty-eight photographs of one cake on a turntable, cut out and aligned by
 * `scripts/build-turntable.py`, played as a sequence. Which frame is shown is a
 * function of how far the visitor has scrolled through the section, so the
 * cake turns under their hand and turns back when they scroll up. Nothing
 * animates on its own.
 *
 * Every frame is in the DOM at once and only the current one is opaque.
 * Swapping the `src` of a single image would flash on any frame the browser
 * had not already decoded, and a cake that blinks once per turn is worse than
 * one that costs a little more markup.
 *
 * The frame is chosen inside a GSAP ticker rather than in React state. The
 * section writes scroll progress into a ref precisely so that turning the cake
 * costs no re-render, and putting the frame number into state would undo that
 * — twenty-eight renders per turn instead of none.
 */

const DESKTOP_FRAMES = 28;
const MOBILE_FRAMES = 14;

/** The frame that best represents the cake when it is not turning. */
const RESTING_FRAME = 1;

function frameSrc(folder: "desktop" | "mobile", index: number): string {
  return `/turntable/${folder}/${String(index).padStart(2, "0")}.webp`;
}

export function CakeTurntable({
  progress,
  active,
  reducedMotion,
  alt,
}: {
  /** Scroll progress through the section, 0 to 1. Written by the section. */
  progress: React.RefObject<number>;
  active: boolean;
  reducedMotion: boolean;
  alt: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(-1);

  // Phones get every second frame: half the bytes, and at that size the wider
  // step between angles is not noticeable.
  const isPhone = useMediaQuery("(max-width: 639px)");
  const folder = isPhone ? "mobile" : "desktop";
  const count = isPhone ? MOBILE_FRAMES : DESKTOP_FRAMES;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const frames = Array.from(
      root.querySelectorAll<HTMLImageElement>("[data-frame]"),
    );
    if (frames.length === 0) return;

    const show = (index: number) => {
      if (index === shownRef.current) return;
      const previous = frames[shownRef.current];
      if (previous) previous.style.opacity = "0";
      const next = frames[index];
      if (next) next.style.opacity = "1";
      shownRef.current = index;
    };

    /*
     * Reduced motion, or a section that is not on screen: hold one frame.
     *
     * Someone who has asked for less movement should not be given a cake that
     * spins because they scrolled; they get the photograph instead, which says
     * the same thing.
     */
    if (reducedMotion || !active) {
      show(Math.min(RESTING_FRAME - 1, frames.length - 1));
      return;
    }

    const update = () => {
      const value = progress.current ?? 0;
      const clamped = value < 0 ? 0 : value > 1 ? 1 : value;
      // The last frame meets the first, so the turn can run to the end without
      // a jump back.
      show(Math.min(frames.length - 1, Math.floor(clamped * frames.length)));
    };

    update();
    gsap.ticker.add(update);
    return () => {
      gsap.ticker.remove(update);
    };
  }, [active, reducedMotion, progress, count]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full"
      // One image with a description; the rest are the same cake at other
      // angles and would only repeat it to a screen reader.
      role="img"
      aria-label={alt}
    >
      {Array.from({ length: count }, (_, index) => (
        /*
          A plain img, on purpose.

          next/image exists to pick a size and format for a photograph whose
          dimensions are not known in advance. These frames were produced by
          the build script at exactly the two sizes served, already in WebP,
          already stripped of everything but the cake. Routing twenty-eight of
          them through the optimiser would add twenty-eight transformations per
          visit, and on Netlify those are billed, to arrive at the file that is
          already sitting there.
        */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={index}
          data-frame={index}
          src={frameSrc(folder, index + 1)}
          alt=""
          aria-hidden="true"
          draggable={false}
          /*
           * The resting frame loads eagerly and every other frame lazily. The
           * cake is visible the moment the section is reached, and the rest of
           * the turn arrives while the visitor reads the heading beside it.
           */
          loading={index === RESTING_FRAME - 1 ? "eager" : "lazy"}
          fetchPriority={index === RESTING_FRAME - 1 ? "high" : "low"}
          decoding="async"
          width={760}
          height={1013}
          className="absolute inset-0 h-full w-full select-none object-contain"
          style={{ opacity: index === RESTING_FRAME - 1 ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
