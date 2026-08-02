import Image from "next/image";

/**
 * A cake photograph, or a labelled frame where one has not been supplied yet.
 *
 * The placeholder is deliberately designed rather than blank: fine diagonal
 * hatching, a hairline inset border and the label it is waiting for. The site
 * therefore reads as "photography to come" rather than "something is broken",
 * which matters while the owner is still gathering images.
 */
export function CakeImage({
  src,
  alt,
  label,
  aspect = "4 / 5",
  sizes = "100vw",
  priority = false,
  className = "",
}: {
  src?: string;
  alt?: string;
  /** Shown inside the placeholder — usually the cake name or occasion. */
  label?: string;
  /** Any valid CSS aspect-ratio, e.g. "4 / 5" or "16 / 9". */
  aspect?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const hasImage = Boolean(src);

  return (
    <div
      className={`relative overflow-hidden ${hasImage ? "bg-vanilla" : "media-placeholder"} ${className}`}
      style={{ aspectRatio: aspect }}
    >
      {hasImage ? (
        <Image
          src={src as string}
          alt={alt ?? ""}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover"
        />
      ) : (
        <PlaceholderMark label={label} />
      )}
    </div>
  );
}

/** The mark shown inside an empty frame. */
function PlaceholderMark({ label }: { label?: string }) {
  return (
    <div className="relative z-[1] flex flex-col items-center gap-3 px-6 text-center">
      {/* A simple three-tier cake outline. */}
      <svg
        width="46"
        height="46"
        viewBox="0 0 46 46"
        fill="none"
        aria-hidden="true"
        className="text-caramel"
      >
        <path
          d="M23 6v5M18 34h10M13 34h20a2 2 0 0 1 2 2v4H11v-4a2 2 0 0 1 2-2ZM15 26h16a2 2 0 0 1 2 2v6H13v-6a2 2 0 0 1 2-2ZM17 18h12a2 2 0 0 1 2 2v6H15v-6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <circle cx="23" cy="11" r="1.6" fill="currentColor" />
      </svg>

      {label && (
        <span className="text-[0.625rem] uppercase tracking-[0.18em] text-cocoa-soft">
          {label}
        </span>
      )}
    </div>
  );
}
