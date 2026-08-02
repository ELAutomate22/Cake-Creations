"use client";

import { useState } from "react";

const STAR_PATH =
  "M10 1.6l2.6 5.3 5.8.85-4.2 4.1 1 5.75L10 14.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z";

const RATING_WORDS = ["One star", "Two stars", "Three stars", "Four stars", "Five stars"];

/* ═══════════════════════════════════════════════════════════════════════════
   DISPLAY — a read-only rating
   ═══════════════════════════════════════════════════════════════════════════ */

export function StarsDisplay({
  rating,
  size = 16,
  label,
}: {
  rating: number;
  size?: number;
  /** Overrides the spoken text. Useful for an average, e.g. "4.8 out of 5". */
  label?: string;
}) {
  // Rounded to the nearest half so an average of 4.6 reads honestly.
  const rounded = Math.round(rating * 2) / 2;

  return (
    <span className="inline-flex items-center gap-[3px]">
      <span className="sr-only">
        {label ?? `${rating} out of 5 stars`}
      </span>

      {[1, 2, 3, 4, 5].map((star) => {
        const fill =
          rounded >= star ? "full" : rounded >= star - 0.5 ? "half" : "empty";

        return (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="shrink-0"
          >
            {fill === "half" && (
              <defs>
                <linearGradient id={`half-${star}-${size}`}>
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            )}
            <path
              d={STAR_PATH}
              className={fill === "empty" ? "text-caramel/45" : "text-plum"}
              fill={
                fill === "full"
                  ? "currentColor"
                  : fill === "half"
                    ? `url(#half-${star}-${size})`
                    : "currentColor"
              }
              stroke="currentColor"
              strokeWidth={fill === "empty" ? 0 : 0.8}
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INPUT — choosing a rating
   ═══════════════════════════════════════════════════════════════════════════
   Built as a radio group so it works with a mouse, a finger, a keyboard and a
   screen reader without any custom key handling: arrow keys move between
   options natively, and each option announces its own meaning in words rather
   than relying on the colour of a star.
   ═══════════════════════════════════════════════════════════════════════════ */

export function StarsInput({
  value,
  onChange,
  error,
  describedBy,
}: {
  value: number;
  onChange: (rating: number) => void;
  error?: string;
  describedBy?: string;
}) {
  const [hovered, setHovered] = useState(0);

  // What the stars show right now: the hovered value while pointing, otherwise
  // the chosen one.
  const shown = hovered || value;

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Your rating out of five stars"
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className="inline-flex items-center gap-1"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const selected = value === star;
          const lit = shown >= star;

          return (
            <label
              key={star}
              onMouseEnter={() => setHovered(star)}
              className="cursor-pointer p-1.5 transition-transform duration-150 hover:scale-110"
            >
              {/* The real control. Visually hidden, fully operable. */}
              <input
                type="radio"
                name="rating"
                value={star}
                checked={selected}
                onChange={() => onChange(star)}
                className="sr-only"
              />
              <span className="sr-only">{RATING_WORDS[star - 1]}</span>

              <svg
                width="30"
                height="30"
                viewBox="0 0 20 20"
                aria-hidden="true"
                className={lit ? "text-plum" : "text-caramel/40"}
              >
                <path
                  d={STAR_PATH}
                  fill={lit ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
              </svg>
            </label>
          );
        })}
      </div>

      {/* The choice in words, so the rating never depends on colour alone. */}
      <p className="mt-1 min-h-[1.25rem] text-xs text-cocoa-soft" aria-live="polite">
        {shown > 0 ? RATING_WORDS[shown - 1] : "Select a rating"}
      </p>
    </div>
  );
}
