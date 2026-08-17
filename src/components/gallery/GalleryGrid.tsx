"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gallery, occasions, type GalleryCake } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";
import { Lightbox } from "./Lightbox";
import { createScrollReveals, isTouch } from "@/lib/motion";

/**
 * The cake gallery.
 *
 * An editorial layout rather than a uniform grid: each cake declares how much
 * room it takes, so portrait, landscape and feature photographs sit together
 * with some rhythm instead of every image being forced into the same square.
 *
 * Filters are built from the cakes that actually exist — a category with no
 * photographs in it is never offered, so no filter can lead to an empty page.
 *
 * The filter from the address bar is handed in by the page rather than read
 * here with `useSearchParams`. Reading it here would make this component the
 * reason the whole gallery could not be rendered on the server, and the cakes
 * would reach the visitor only after JavaScript had run.
 */

const SIZE_CLASSES: Record<GalleryCake["size"], string> = {
  regular: "sm:col-span-1 aspect-[4/5]",
  tall: "sm:col-span-1 aspect-[3/5]",
  wide: "sm:col-span-2 aspect-[16/10]",
  feature: "sm:col-span-2 lg:col-span-2 lg:row-span-2 aspect-[4/5]",
};

export type GalleryGridProps = {
  /** The `?filter=` value from the address bar, read on the server. */
  initialFilter?: string;
};

export function GalleryGrid({ initialFilter }: GalleryGridProps) {
  const scopeRef = useRef<HTMLDivElement>(null);

  const cakes = gallery.cakes;
  // null means "the visitor has not chosen yet", so the filter in the URL
  // still applies. Once they pick one, their choice wins.
  const [chosenFilter, setChosenFilter] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Only offer filters that would actually return something.
  const filters = useMemo(() => {
    const available: { id: string; label: string }[] = [
      { id: "all", label: "All Cakes" },
    ];

    if (cakes.some((cake) => cake.style === "personalised")) {
      available.push({ id: "personalised", label: "Personalised" });
    }
    if (cakes.some((cake) => cake.style === "classic")) {
      available.push({ id: "classic", label: "Classic" });
    }

    for (const occasion of occasions.items) {
      if (cakes.some((cake) => cake.occasion === occasion.id)) {
        available.push({
          id: `occasion:${occasion.id}`,
          label: occasion.label.replace(/ cakes$/i, ""),
        });
      }
    }

    return available;
  }, [cakes]);

  // A link from the Home carousel can preselect a filter. Checked against the
  // filters that exist, so a hand-typed or stale value falls back to all cakes
  // rather than showing an empty grid.
  const fromUrl =
    initialFilter && filters.some((item) => item.id === initialFilter)
      ? initialFilter
      : null;

  const filter = chosenFilter ?? fromUrl ?? "all";

  const visible = useMemo(() => {
    if (filter === "all") return cakes;
    if (filter.startsWith("occasion:")) {
      const id = filter.slice("occasion:".length);
      return cakes.filter((cake) => cake.occasion === id);
    }
    return cakes.filter((cake) => cake.style === filter);
  }, [cakes, filter]);

  // Re-run the staggered reveals whenever the visible set changes.
  useGSAP(
    () => {
      createScrollReveals(scopeRef.current);
    },
    { dependencies: [filter, visible.length], scope: scopeRef, revertOnUpdate: true },
  );

  const openAt = useCallback((index: number) => setLightboxIndex(index), []);

  if (cakes.length === 0) {
    return (
      <div className="shell py-24">
        <p className="voice measure-wide text-cocoa-soft">
          Cake photographs have not been added yet. Once they are placed in{" "}
          <code className="text-espresso">assets-source/</code> and listed in{" "}
          <code className="text-espresso">src/content/site.ts</code>, they will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div ref={scopeRef} className="shell pb-28">
      {/* ── Filters ────────────────────────────────────────────────────── */}
      {filters.length > 1 && (
        <div
          role="group"
          aria-label="Filter cakes"
          className="flex flex-wrap gap-2.5 border-b border-espresso/10 pb-8"
        >
          {filters.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setChosenFilter(item.id)}
                aria-pressed={active}
                className={`border px-5 py-2.5 text-xs uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "border-espresso bg-espresso text-ivory"
                    : "border-espresso/20 text-cocoa hover:border-espresso"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── The cakes ──────────────────────────────────────────────────── */}
      <ul className="mt-10 grid auto-rows-auto grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((cake, index) => (
          <li key={cake.id} className={SIZE_CLASSES[cake.size]}>
            <button
              type="button"
              onClick={() => openAt(index)}
              data-reveal="scale"
              className="group relative block h-full w-full overflow-hidden text-left"
              aria-label={`View ${cake.title}`}
            >
              <CakeImage
                src={cake.image.src}
                alt={cake.image.alt}
                label={cake.title}
                className="h-full w-full"
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 48vw, 100vw"
              />

              {/* A restrained caption, revealed on hover and on focus. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/85 to-transparent p-5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <span className="block font-serif text-lg text-ivory">
                  {cake.title}
                </span>
                <span className="mt-1 block text-[0.625rem] uppercase tracking-[0.18em] text-ivory/70">
                  {cake.style === "personalised" ? "Personalised" : "Classic"}
                  {" · View"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Touch devices get no hover, so the titles are always listed. */}
      {isTouch() && (
        <p className="sr-only">
          Tap any cake to view it larger, with its title and occasion.
        </p>
      )}

      <Lightbox
        cakes={visible}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
