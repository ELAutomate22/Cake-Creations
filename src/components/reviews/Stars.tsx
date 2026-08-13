"use client";

/**
 * Star ratings, for display and for choosing.
 *
 * The visual stars are decorative; the rating is always available as real text
 * to a screen reader. Choosing a rating is a radio group, so it works with
 * arrow keys the way a group of mutually exclusive options should.
 */

function Star({ fill }: { fill: number }) {
  // A single clip covers the partial-star case (an average of 4.3, say).
  const clipId = `star-${Math.round(fill * 100)}`;
  return (
    <svg viewBox="0 0 20 20" className="h-full w-full" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={20 * fill} height="20" />
        </clipPath>
      </defs>
      <path
        d="M10 1.6l2.47 5.16 5.53.72-4.05 3.86 1.03 5.56L10 14.2l-4.98 2.7 1.03-5.56L2 7.48l5.53-.72L10 1.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        opacity="0.42"
      />
      <path
        d="M10 1.6l2.47 5.16 5.53.72-4.05 3.86 1.03 5.56L10 14.2l-4.98 2.7 1.03-5.56L2 7.48l5.53-.72L10 1.6z"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}

export function StarRating({
  value,
  size = "1rem",
  className = "",
}: {
  value: number;
  size?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index} style={{ width: size, height: size }}>
          <Star fill={Math.max(0, Math.min(1, value - index))} />
        </span>
      ))}
      <span className="sr-only">
        {value.toFixed(1)} out of 5 stars
      </span>
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  name = "rating",
  describedBy,
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
  describedBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Your rating out of five"
      aria-describedby={describedBy}
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = value === star;
        return (
          <label
            key={star}
            className="cursor-pointer p-1 text-caramel transition-colors hover:text-plum"
            style={{ color: star <= value ? "var(--color-plum)" : undefined }}
          >
            <input
              type="radio"
              name={name}
              value={star}
              checked={selected}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <span className="sr-only">
              {star} {star === 1 ? "star" : "stars"}
            </span>
            <span aria-hidden="true" className="block h-7 w-7">
              <Star fill={star <= value ? 1 : 0} />
            </span>
          </label>
        );
      })}
    </div>
  );
}
