import Image from "next/image";

/**
 * A cake photograph, or an honest frame where one has not been supplied yet.
 *
 * The website is being built before the photography exists, so every image slot
 * has to handle "not yet". Rather than a broken image or an invented stock
 * photo, an empty slot shows a labelled frame that says what belongs there.
 */

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
};

export function CakeImage({
  src,
  alt,
  label = "Cake photograph",
  className = "",
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  imageClassName = "",
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

  return (
    <div className={`frame ${className}`}>
      <Image
        src={src as string}
        alt={isPlaceholderAlt ? "" : alt}
        aria-hidden={isPlaceholderAlt || undefined}
        fill
        sizes={sizes}
        priority={priority}
        className={imageClassName}
      />
    </div>
  );
}
