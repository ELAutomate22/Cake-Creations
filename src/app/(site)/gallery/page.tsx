import type { Metadata } from "next";
import { Suspense } from "react";
import { gallery, media } from "@/content/site";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

export const metadata: Metadata = {
  title: "Cake Gallery",
  description:
    "A portfolio of personalised and classic cakes by Elshadai Cake Creations, created for birthdays, weddings, christenings, anniversaries and other celebrations.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Cake Gallery — Elshadai Cake Creations",
    description:
      "Explore a collection of personalised and classic cakes created for meaningful occasions.",
    url: "/gallery",
  },
};

export default function GalleryPage() {
  const heroImage = gallery.heroImage.src || media.intro.posterFallback;

  return (
    <>
      {/* ── Gallery hero ─────────────────────────────────────────────────── */}
      <section className="on-dark relative isolate flex min-h-[58svh] items-end overflow-hidden bg-espresso pb-14 pt-36 sm:min-h-[62svh] sm:pb-20">
        <div className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-45"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/75 to-espresso/45"
          />
        </div>

        <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
          <p className="text-[0.6875rem] uppercase tracking-[0.28em] text-ivory/65">
            Portfolio
          </p>

          <h1 className="display mt-5 text-ivory">{gallery.heading}</h1>

          <p className="voice measure mt-6 text-ivory/80">
            {gallery.standfirst}
          </p>
        </div>
      </section>

      {/* ── The cakes ────────────────────────────────────────────────────── */}
      <div className="pt-14 sm:pt-20">
        {/* useSearchParams needs a Suspense boundary during prerendering. */}
        <Suspense fallback={<GalleryLoading />}>
          <GalleryGrid />
        </Suspense>
      </div>
    </>
  );
}

/** Shown for the moment before the filtered grid is ready. */
function GalleryLoading() {
  return (
    <div className="mx-auto max-w-[88rem] px-5 pb-28 sm:px-8 lg:px-12">
      <p className="sr-only" role="status">
        Loading the cake gallery.
      </p>

      <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>li]:mb-5" aria-hidden="true">
        {[
          "22rem",
          "17rem",
          "25rem",
          "19rem",
          "23rem",
          "16rem",
        ].map((height, index) => (
          <li key={index} className="break-inside-avoid">
            <div
              className="media-placeholder w-full"
              style={{ height, animation: "fade-in 500ms ease both" }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
