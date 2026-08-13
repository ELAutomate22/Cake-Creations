import type { Metadata } from "next";
import { Suspense } from "react";
import { business, gallery } from "@/content/site";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Explore a collection of personalised and classic cakes by Elshadai Cake Creations, created for birthdays, weddings, christenings, anniversaries and other occasions.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: `Gallery — ${business.name}`,
    description: gallery.standfirst,
    url: "/gallery",
  },
};

export default function GalleryPage() {
  return (
    <>
      <header className="bg-ivory pt-40 pb-14 sm:pt-44">
        <div className="shell">
          <p className="eyebrow text-cocoa-soft">{gallery.eyebrow}</p>
          <h1 className="display-lg mt-5 text-espresso">{gallery.heading}</h1>
          <p className="voice measure-wide mt-6 text-cocoa">
            {gallery.standfirst}
          </p>
        </div>
      </header>

      {/* useSearchParams needs a boundary so the shell can still prerender. */}
      <Suspense fallback={<div className="shell pb-28" />}>
        <GalleryGrid />
      </Suspense>
    </>
  );
}
