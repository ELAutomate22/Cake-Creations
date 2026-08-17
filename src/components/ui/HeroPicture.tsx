import manifest from "@/content/asset-manifest.json";

/**
 * The hero photograph, art-directed across breakpoints.
 *
 * This is the one image on the site that does not go through `next/image`, and
 * the reason is art direction rather than optimisation.
 *
 * The hero has to fill everything from a 21:9 desktop to a tall phone, and the
 * photography is all upright shots of a single cake. No single crop survives
 * both shapes, so the same cake is framed twice — upright and landscape — and
 * the breakpoint decides. Rendering both through `next/image` meant both were
 * preloaded and both were fetched, so every visitor downloaded a full-screen
 * photograph they would never see.
 *
 * A `<picture>` with `media` on each `<source>` is the primitive that actually
 * solves this: the browser evaluates the queries and fetches exactly one file.
 * It is discovered by the preload scanner in the first bytes of the HTML, so it
 * still starts loading immediately without needing a preload hint.
 *
 * The sources come from the asset pipeline, which has already written each
 * photograph at several widths in both WebP and JPEG.
 */

type ManifestEntry = {
  path: string;
  width: number;
  widths: number[];
  blurDataURL?: string;
};

const entries = manifest as Record<string, ManifestEntry | undefined>;

/** Looks up a pipeline entry from a public path like "/media/hero-lakeside.jpg". */
function entryFor(src: string): ManifestEntry | undefined {
  const name = src.split("/").pop()?.replace(/\.[^.]+$/, "");
  return name ? entries[name] : undefined;
}

/**
 * A srcset across every width the pipeline generated, plus the full-size file.
 *
 * `widths` holds only the sizes that were smaller than the original — the
 * pipeline skips upscaling — so the original is appended at its true width to
 * cap the set honestly rather than claiming a size that was never rendered.
 */
function srcSet(entry: ManifestEntry, extension: "webp" | "jpg"): string {
  const scaled = entry.widths.map(
    (width) => `${entry.path}-${width}.${extension} ${width}w`,
  );
  return [...scaled, `${entry.path}.${extension} ${entry.width}w`].join(", ");
}

export type HeroPictureProps = {
  /** The upright frame, used below `wideFrom`. */
  src: string;
  /** The landscape frame. Leave undefined to use the upright one everywhere. */
  wideSrc?: string;
  alt: string;
  /** The width at which the landscape frame takes over. */
  wideFrom?: string;
  className?: string;
};

export function HeroPicture({
  src,
  wideSrc,
  alt,
  wideFrom = "(min-width: 1024px)",
  className = "",
}: HeroPictureProps) {
  const upright = entryFor(src);
  const wide = wideSrc ? entryFor(wideSrc) : undefined;

  // Without a manifest entry there are no generated widths to offer, so fall
  // back to the single file rather than building a srcset that lies.
  if (!upright) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        fetchPriority="high"
        decoding="async"
        className={className}
      />
    );
  }

  return (
    <picture>
      {wide && (
        <>
          <source
            media={wideFrom}
            type="image/webp"
            srcSet={srcSet(wide, "webp")}
            sizes="100vw"
          />
          <source media={wideFrom} srcSet={srcSet(wide, "jpg")} sizes="100vw" />
        </>
      )}

      <source type="image/webp" srcSet={srcSet(upright, "webp")} sizes="100vw" />

      <img
        src={`${upright.path}.jpg`}
        srcSet={srcSet(upright, "jpg")}
        sizes="100vw"
        alt={alt}
        // The hero is the largest contentful paint on the page; it should never
        // wait behind scripts or below-the-fold images.
        fetchPriority="high"
        decoding="async"
        className={className}
      />
    </picture>
  );
}
