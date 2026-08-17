import Image from "next/image";
import manifest from "@/content/asset-manifest.json";
import { RepetitionHover } from "./RepetitionHover";

/**
 * A cake photograph, or an honest frame where one has not been supplied yet.
 *
 * Photography can still be missing — the site was built before it existed — so
 * an empty slot shows a labelled frame saying what belongs there rather than a
 * broken image or an invented stock photo.
 *
 * Where a photograph does exist, the asset pipeline has already produced a
 * twenty-pixel blurred copy of it. Handing that to next/image means the space
 * is filled with the cake's own colours from the first paint, so the layout
 * never flashes empty and then jumps.
 */

type ManifestEntry = { blurDataURL?: string; path?: string };

/** The blurred placeholder for a photograph, looked up by its public path. */
function blurFor(src: string): string | undefined {
  // "/cakes/pearl-rose-thirty.jpg" -> "pearl-rose-thirty"
  const name = src.split("/").pop()?.replace(/\.[^.]+$/, "");
  if (!name) return undefined;

  const entry = (manifest as Record<string, ManifestEntry>)[name];
  return entry?.blurDataURL;
}

export type CakeImageProps = {
  src?: string;
  alt?: string;
  /** Shown inside the frame when there is no photograph. */
  label?: string;
  /** Tailwind aspect utility, e.g. "aspect-[4/5]". */
  className?: string;
  /** Passed to next/image; describes the rendered width at each breakpoint. */
  sizes?: string;
  /** Set on the one image that is likely to be the largest contentful paint. */
  priority?: boolean;
  /** Applied to the <img> itself, for scale-on-hover and similar. */
  imageClassName?: string;
  /**
   * The repetition hover effect, on by default.
   *
   * Turn it off for a photograph that is not a photograph the visitor looks at
   * — a full-bleed background behind copy, say, where a pointer crossing the
   * page would set the whole viewport rippling.
   */
  hover?: boolean;
};

export function CakeImage({
  src,
  alt,
  label = "Cake photograph",
  className = "",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  imageClassName = "",
  hover = true,
}: CakeImageProps) {
  const hasImage = Boolean(src && src.trim().length > 0);

  if (!hasImage) {
    return (
      <div className={`frame frame-empty ${className}`}>
        <span>{label}</span>
      </div>
    );
  }

  // A placeholder alt is never shown to a screen reader as though it were a
  // description; the image is marked decorative instead.
  const isPlaceholderAlt =
    !alt || (alt.trim().startsWith("[") && alt.trim().endsWith("]"));

  const blurDataURL = blurFor(src as string);

  if (hover) {
    return (
      <div className={`frame ${className}`}>
        <RepetitionHover
          src={src as string}
          alt={isPlaceholderAlt ? "" : alt}
          sizes={sizes}
          priority={priority}
          imageClassName={imageClassName}
          blurDataURL={blurDataURL}
        />
      </div>
    );
  }

  return (
    <div className={`frame ${className}`}>
      <Image
        src={src as string}
        alt={isPlaceholderAlt ? "" : alt}
        aria-hidden={isPlaceholderAlt || undefined}
        fill
        sizes={sizes}
        priority={priority}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
        className={imageClassName}
      />
    </div>
  );
}
