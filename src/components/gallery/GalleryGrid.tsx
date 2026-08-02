"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  gallery,
  galleryCakes,
  occasionLabel,
  type GalleryCake,
} from "@/content/site";
import { Lightbox } from "./Lightbox";
import { useSiteUI } from "@/components/layout/SiteChrome";

/**
 * The cake portfolio.
 *
 * Filters are built from the cakes that actually exist, so a category with no
 * photographs simply never appears — there is no way to reach an empty result
 * by clicking. Selecting a filter updates the address bar, which means a
 * filtered view can be linked to directly (the carousel does exactly that).
 *
 * The layout is an editorial masonry: cakes are given different heights
 * according to their `size`, so the grid reads as a curated page rather than a
 * uniform contact sheet. Nothing is stretched — each photograph keeps its own
 * proportions inside its frame.
 */

type Filter = { id: string; label: string; count: number };

export function GalleryGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openContact } = useSiteUI();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const activeStyle = searchParams.get("style") ?? "all";
  const activeOccasion = searchParams.get("occasion") ?? null;
  const activeFilter = activeOccasion ?? activeStyle;

  /** Only categories with real cakes behind them become filters. */
  const filters = useMemo<Filter[]>(() => {
    const list: Filter[] = [
      { id: "all", label: "All Cakes", count: galleryCakes.length },
    ];

    const personalised = galleryCakes.filter((c) => c.style === "personalised");
    const classic = galleryCakes.filter((c) => c.style === "classic");

    if (personalised.length > 0) {
      list.push({
        id: "personalised",
        label: "Personalised Cakes",
        count: personalised.length,
      });
    }
    if (classic.length > 0) {
      list.push({
        id: "classic",
        label: "Classic Cakes",
        count: classic.length,
      });
    }

    // One filter per occasion that has at least one cake, in the order the
    // occasions are listed in the content file.
    const seen = new Set<string>();
    for (const cake of galleryCakes) {
      if (seen.has(cake.occasion)) continue;
      seen.add(cake.occasion);

      const count = galleryCakes.filter(
        (c) => c.occasion === cake.occasion,
      ).length;

      list.push({
        id: cake.occasion,
        label: occasionLabel(cake.occasion),
        count,
      });
    }

    return list;
  }, []);

  const visible = useMemo<GalleryCake[]>(() => {
    if (activeFilter === "all") return galleryCakes;
    if (activeFilter === "personalised" || activeFilter === "classic") {
      return galleryCakes.filter((cake) => cake.style === activeFilter);
    }
    return galleryCakes.filter((cake) => cake.occasion === activeFilter);
  }, [activeFilter]);

  /** Updates the address bar without scrolling or reloading the page. */
  const applyFilter = useCallback(
    (id: string) => {
      const params = new URLSearchParams();

      if (id === "personalised" || id === "classic") {
        params.set("style", id);
      } else if (id !== "all") {
        params.set("occasion", id);
      }

      const query = params.toString();
      router.replace(query ? `/gallery?${query}` : "/gallery", {
        scroll: false,
      });
    },
    [router],
  );

  // ── No photographs at all yet ──────────────────────────────────────────
  if (galleryCakes.length === 0) {
    return (
      <div className="mx-auto max-w-[88rem] px-5 pb-28 sm:px-8 lg:px-12">
        <div className="media-placeholder flex-col gap-6 px-6 py-28 text-center">
          <div className="relative z-[1] max-w-[34rem]">
            <p className="font-serif text-3xl text-espresso">
              Cake photographs coming soon
            </p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-cocoa-soft">
              New photography is being prepared for this gallery. In the
              meantime, please get in touch to talk about a cake for your
              occasion.
            </p>

            <button
              type="button"
              onClick={openContact}
              className="mt-9 border border-espresso/30 px-8 py-3.5 text-xs uppercase tracking-[0.18em] text-espresso transition-colors hover:bg-espresso hover:text-ivory"
            >
              Contact Us
            </button>

            {/*
              A note for the owner while the site is being set up. It is removed
              automatically the moment the first cake is added, and never
              appears on the deployed website.
            */}
            {process.env.NODE_ENV === "development" && (
              <p className="mt-12 border-t border-caramel/40 pt-6 text-xs leading-relaxed text-cocoa-soft">
                <strong className="font-medium text-espresso">
                  Setting up:
                </strong>{" "}
                add your cakes to <code className="font-mono">galleryCakes</code>{" "}
                in <code className="font-mono">src/content/site.ts</code>. The
                category filters build themselves from what you add. This note
                only shows while developing.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[88rem] px-5 pb-28 sm:px-8 lg:px-12">
      {/* ── Filters ───────────────────────────────────────────────────────── */}
      {filters.length > 1 && (
        <div className="mb-12">
          <h2 className="sr-only">Filter cakes by category</h2>
          <ul className="flex flex-wrap gap-2.5">
            {filters.map((filter) => {
              const current = filter.id === activeFilter;

              return (
                <li key={filter.id}>
                  <button
                    type="button"
                    onClick={() => applyFilter(filter.id)}
                    aria-pressed={current}
                    className={`border px-5 py-2.5 text-[0.8125rem] transition-colors ${
                      current
                        ? "border-espresso bg-espresso text-ivory"
                        : "border-caramel/50 text-cocoa hover:border-espresso hover:text-espresso"
                    }`}
                  >
                    {filter.label}
                    <span
                      className={`ml-2 text-[0.6875rem] ${current ? "text-ivory/60" : "text-cocoa-soft"}`}
                    >
                      {filter.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── The grid ──────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <p className="border border-dashed border-caramel/60 px-6 py-24 text-center text-cocoa-soft">
          {gallery.emptyMessage}
        </p>
      ) : (
        <>
          <ul
            // A masonry column layout. Items keep their natural height, so no
            // photograph is ever cropped to force a uniform grid.
            className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5"
          >
            {visible.map((cake, index) => (
              <li key={cake.id} className="break-inside-avoid">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="group block w-full text-left"
                >
                  <span className="relative block overflow-hidden bg-vanilla">
                    <Image
                      src={cake.src}
                      alt={cake.alt}
                      width={900}
                      height={
                        cake.size === "tall"
                          ? 1200
                          : cake.size === "wide"
                            ? 600
                            : 1125
                      }
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                      loading="lazy"
                      className="h-auto w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                    />

                    {/* A soft wash on hover, so the caption below stays legible. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-espresso/0 transition-colors duration-500 group-hover:bg-espresso/10"
                    />
                  </span>

                  <span className="mt-4 block">
                    <span className="block font-serif text-xl text-espresso">
                      {cake.name}
                    </span>
                    <span className="mt-1 block text-[0.6875rem] uppercase tracking-[0.16em] text-cocoa-soft">
                      {cake.style === "personalised" ? "Personalised" : "Classic"}{" "}
                      · {occasionLabel(cake.occasion)}
                    </span>
                  </span>

                  <span className="sr-only">— open larger view</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="sr-only" aria-live="polite">
            Showing {visible.length}{" "}
            {visible.length === 1 ? "cake" : "cakes"}.
          </p>
        </>
      )}

      <Lightbox
        cakes={visible}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}
