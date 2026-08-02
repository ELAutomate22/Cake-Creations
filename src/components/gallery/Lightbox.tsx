"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { occasionLabel, type GalleryCake } from "@/content/site";

/**
 * The gallery lightbox.
 *
 * Arrow keys and on-screen controls move between cakes, Escape closes, and a
 * horizontal swipe works on touch. Images are shown whole rather than cropped,
 * so decoration at the edge of a cake is never cut off.
 */
export function Lightbox({
  cakes,
  index,
  onClose,
  onNavigate,
}: {
  cakes: GalleryCake[];
  /** The cake being shown, or null when the lightbox is closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const open = index !== null;
  const cake = open ? cakes[index] : undefined;

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  /**
   * Which cake's photograph failed to load, rather than a plain true/false.
   * Recording the index means moving to another cake clears the error by
   * itself, with no effect needed to reset it.
   */
  const [failedIndex, setFailedIndex] = useState<number | null>(null);
  const imageFailed = failedIndex !== null && failedIndex === index;

  const goPrevious = useCallback(() => {
    if (index === null) return;
    onNavigate((index - 1 + cakes.length) % cakes.length);
  }, [index, cakes.length, onNavigate]);

  const goNext = useCallback(() => {
    if (index === null) return;
    onNavigate((index + 1) % cakes.length);
  }, [index, cakes.length, onNavigate]);

  // Arrow-key navigation. Escape is handled by the dialog itself.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goPrevious, goNext]);

  if (!open || !cake) return null;

  const multiple = cakes.length > 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="full"
      title={`${cake.name} — cake ${index + 1} of ${cakes.length}`}
      description={cake.description}
    >
      <div
        className="on-dark flex h-full w-full flex-col"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          if (!start) return;

          const touch = event.changedTouches[0];
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;

          // Only treat it as a swipe if it was clearly horizontal, so scrolling
          // the caption does not flick to the next cake.
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) {
            if (dx > 0) goPrevious();
            else goNext();
          }

          touchStart.current = null;
        }}
      >
        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8">
          <p className="text-xs uppercase tracking-[0.2em] text-ivory/60">
            {index + 1} / {cakes.length}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-ivory/80 transition-colors hover:text-ivory"
          >
            <span className="sr-only">Close</span>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M3 3 L17 17 M17 3 L3 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* ── Image ─────────────────────────────────────────────────────── */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20">
          {multiple && (
            <LightboxArrow
              direction="left"
              onClick={goPrevious}
              label="Previous cake"
            />
          )}

          {imageFailed ? (
            <p className="text-center text-sm text-ivory/70">
              This photograph could not be loaded.
            </p>
          ) : (
            <div className="relative h-full w-full">
              <Image
                src={cake.src}
                alt={cake.alt}
                fill
                sizes="(max-width: 640px) 92vw, 80vw"
                priority
                onError={() => setFailedIndex(index)}
                // `contain` keeps the whole cake in view — decoration at the
                // edges is never cropped away.
                className="object-contain"
              />
            </div>
          )}

          {multiple && (
            <LightboxArrow
              direction="right"
              onClick={goNext}
              label="Next cake"
            />
          )}
        </div>

        {/* ── Caption ───────────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 py-6 text-center sm:px-8 sm:py-8">
          <h3 className="font-serif text-2xl text-ivory sm:text-3xl">
            {cake.name}
          </h3>

          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-rose">
            {[
              cake.style === "personalised" ? "Personalised" : "Classic",
              occasionLabel(cake.occasion),
            ].join(" · ")}
          </p>

          {cake.description && (
            <p className="measure mx-auto mt-4 text-sm leading-relaxed text-ivory/70">
              {cake.description}
            </p>
          )}

          {cake.flavour && (
            <p className="mt-2 text-xs text-ivory/50">{cake.flavour}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function LightboxArrow({
  direction,
  onClick,
  label,
}: {
  direction: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-1/2 z-10 hidden h-14 w-14 -translate-y-1/2 items-center justify-center border border-ivory/25 text-ivory/80 transition-colors hover:border-ivory hover:bg-ivory hover:text-espresso sm:flex ${
        direction === "left" ? "left-3" : "right-3"
      }`}
    >
      <span className="sr-only">{label}</span>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d={direction === "left" ? "M12 4 L6 10 L12 16" : "M8 4 L14 10 L8 16"}
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
