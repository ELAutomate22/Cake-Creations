"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CakeImage } from "@/components/ui/CakeImage";
import { isProvided, occasions, type GalleryCake } from "@/content/site";

/**
 * The gallery lightbox.
 *
 * Built on the shared Modal, so the focus trap, Escape handling, scroll lock
 * and focus restoration all come for free and behave the same as every other
 * dialog on the site.
 *
 * Moving between cakes fades the photograph out a few pixels in the direction
 * of travel and brings the next one in from the opposite side — enough to give
 * the movement a direction without making the visitor wait for it.
 */

const SWIPE_THRESHOLD = 44;

export function Lightbox({
  cakes,
  index,
  onClose,
  onIndexChange,
}: {
  cakes: readonly GalleryCake[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const [direction, setDirection] = useState<1 | -1>(1);
  const [shifting, setShifting] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const open = index !== null;
  const cake = open ? cakes[index] : null;

  const move = useCallback(
    (step: 1 | -1) => {
      if (index === null || cakes.length === 0) return;
      setDirection(step);
      setShifting(true);
      const next = (index + step + cakes.length) % cakes.length;
      // Short enough that it reads as a transition, not a wait.
      window.setTimeout(() => {
        onIndexChange(next);
        setShifting(false);
      }, 160);
    },
    [index, cakes.length, onIndexChange],
  );

  // Arrow keys, alongside the Escape handling the Modal already provides.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, move]);

  if (!open || !cake) return null;

  const occasionLabel = occasions.items.find(
    (item) => item.id === cake.occasion,
  )?.label;

  return (
    <Modal
      open={open}
      onClose={onClose}
      label={`${cake.title}, cake ${index + 1} of ${cakes.length}`}
      panelClassName="max-w-6xl bg-transparent"
      align="center"
    >
      <div className="bg-ivory">
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <h2 className="display-sm truncate text-espresso">{cake.title}</h2>
            <p className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.18em] text-cocoa-soft">
              {[
                cake.style === "personalised" ? "Personalised" : "Classic",
                occasionLabel,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-cocoa-soft transition-colors hover:text-espresso"
          >
            <span className="sr-only">Close</span>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </div>

        {/* ── The photograph ───────────────────────────────────────────── */}
        <div
          className="relative bg-vanilla"
          onPointerDown={(event) => {
            if (event.pointerType === "mouse") return;
            pointerStart.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = pointerStart.current;
            pointerStart.current = null;
            if (!start) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
            move(dx < 0 ? 1 : -1);
          }}
        >
          <div
            className="transition-[opacity,transform] duration-150 ease-out"
            style={{
              opacity: shifting ? 0 : 1,
              transform: shifting
                ? `translateX(${direction * -16}px)`
                : "translateX(0)",
            }}
          >
            <CakeImage
              src={cake.image.src}
              alt={cake.image.alt}
              label={cake.title}
              className="max-h-[68svh] w-full"
              sizes="(min-width: 1024px) 70vw, 100vw"
              imageClassName="!object-contain"
            />
          </div>

          {cakes.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => move(-1)}
                className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-ivory/85 text-espresso backdrop-blur-sm transition-colors hover:bg-ivory"
              >
                <span className="sr-only">Previous cake</span>
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
                  <path d="M7 1 2 6l5 5M2 6h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-ivory/85 text-espresso backdrop-blur-sm transition-colors hover:bg-ivory"
              >
                <span className="sr-only">Next cake</span>
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
                  <path d="M11 1l5 5-5 5M16 6H2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* ── Details ──────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          {isProvided(cake.description) && (
            <p className="voice measure-wide text-cocoa">{cake.description}</p>
          )}
          {isProvided(cake.flavour) && (
            <p className="mt-3 text-sm text-cocoa-soft">{cake.flavour}</p>
          )}

          <p className="mt-5 text-[0.6875rem] uppercase tracking-[0.18em] text-cocoa-soft">
            {index + 1} / {cakes.length}
          </p>
        </div>
      </div>
    </Modal>
  );
}
