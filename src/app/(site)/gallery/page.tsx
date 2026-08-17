import type { Metadata } from "next";
import { business, gallery } from "@/content/site";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

/**
 * Read on the server so the cakes are in the HTML.
 *
 * The grid used to take the filter from `useSearchParams`, which is a client
 * hook. A client component reading search params forces the Suspense boundary
 * around it to bail out of prerendering, so the page shipped with the heading
 * and an empty shell, and every cake appeared only once JavaScript had run.
 * That is the wrong trade for the page the whole business is judged on: it is
 * blank without JavaScript, and a crawler only sees the cakes on a second,
 * slower pass.
 *
 * Taking the filter from the page's own `searchParams` instead means the
 * server renders the right set of cakes straight away. It costs the static
 * prerender — this route is now rendered per request — which is a fair price
 * for the gallery arriving complete.
 */

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

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const { filter } = await searchParams;
  // A repeated query parameter arrives as an array; only one filter applies.
  const requested = Array.isArray(filter) ? filter[0] : filter;

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

      <GalleryGrid initialFilter={requested} />
    </>
  );
}
