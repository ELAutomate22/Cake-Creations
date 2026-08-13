"use client";

import { useMemo, useRef, useState } from "react";
import { occasions } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";
import { isTouch } from "@/lib/motion";

/**
 * Cake occasions.
 *
 * Not an icon grid. A single large photograph holds one side while the
 * occasions are listed down the other; moving through the list crossfades the
 * image beside it. On desktop that happens on hover and on keyboard focus — the
 * focus part matters, because an interaction that only works on hover is
 * invisible to a keyboard.
 *
 * Occasions with a photograph become the visual entries. Everything else is
 * still listed as text, so the section never presents an empty category as
 * though it were browsable.
 */
export function Occasions() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Only occasions that have real photography can drive the image panel.
  const withImages = useMemo(
    () => occasions.items.filter((item) => Boolean(item.image.src)),
    [],
  );

  const hasImagery = withImages.length > 0;
  const active = withImages.find((item) => item.id === activeId) ?? withImages[0];

  return (
    <section className="relative bg-ivory py-24 sm:py-28 lg:py-36">
      <div className="shell">
        <div className="max-w-3xl">
          <p className="eyebrow text-cocoa-soft">{occasions.eyebrow}</p>
          <h2 data-reveal="up" className="display mt-5 text-espresso">
            {occasions.heading}
          </h2>
          <p data-reveal="up" className="voice measure-wide mt-6 text-cocoa">
            {occasions.standfirst}
          </p>
        </div>

        {hasImagery ? (
          <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-20">
            {/* ── The photograph, held in place while the list is read ── */}
            <div className="relative aspect-[4/5] w-full lg:sticky lg:top-28">
              {withImages.map((item) => {
                const isActive = item.id === active?.id;
                return (
                  <div
                    key={item.id}
                    aria-hidden={!isActive}
                    className="absolute inset-0 transition-opacity duration-700"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transitionTimingFunction: "var(--ease-silk)",
                    }}
                  >
                    <CakeImage
                      src={item.image.src}
                      alt={item.image.alt}
                      label={`${item.label} photograph`}
                      className="h-full w-full"
                      sizes="(min-width: 1024px) 46vw, 100vw"
                    />
                  </div>
                );
              })}
            </div>

            {/* ── The list ───────────────────────────────────────────── */}
            <ul ref={listRef} className="lg:pt-6">
              {withImages.map((item) => {
                const isActive = item.id === active?.id;
                return (
                  <li key={item.id} className="border-b border-espresso/10">
                    <button
                      type="button"
                      onMouseEnter={() => {
                        if (!isTouch()) setActiveId(item.id);
                      }}
                      onFocus={() => setActiveId(item.id)}
                      onClick={() => setActiveId(item.id)}
                      aria-pressed={isActive}
                      className="group flex w-full items-baseline justify-between gap-6 py-5 text-left"
                    >
                      <span
                        className="display-sm transition-colors duration-500"
                        style={{
                          color: isActive
                            ? "var(--color-espresso)"
                            : "color-mix(in srgb, var(--color-espresso) 42%, transparent)",
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="block h-px shrink-0 bg-espresso transition-all duration-500"
                        style={{ width: isActive ? "2.5rem" : "0.75rem" }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          /* ── No photography yet: the occasions still read as a list ── */
          <ul className="mt-14 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {occasions.items.map((item) => (
              <li
                key={item.id}
                data-reveal="up"
                className="flex items-baseline gap-4 border-b border-espresso/10 pb-4"
              >
                <span
                  aria-hidden="true"
                  className="block h-px w-5 shrink-0 bg-caramel"
                />
                <span className="text-cocoa">{item.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
