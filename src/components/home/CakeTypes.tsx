import { availableOccasions, cakeTypes } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";

/**
 * Personalised and classic — the two creative directions of the business.
 *
 * Laid out as two facing columns that mirror one another, so the comparison is
 * legible at a glance rather than reading as two unrelated blocks.
 */
export function CakeTypes() {
  const directions = [
    { key: "personalised", ...cakeTypes.personalised },
    { key: "classic", ...cakeTypes.classic },
  ];

  return (
    <section
      aria-labelledby="cake-types-heading"
      className="relative bg-espresso py-24 text-ivory sm:py-32"
    >
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
        {/* ── Heading ───────────────────────────────────────────────────── */}
        <div className="max-w-[42rem]">
          <p className="text-[0.6875rem] uppercase tracking-[0.22em] text-rose">
            {cakeTypes.eyebrow}
          </p>
          <h2
            id="cake-types-heading"
            className="heading mt-5 text-ivory text-balance"
          >
            {cakeTypes.heading}
          </h2>
          <p className="voice mt-6 text-ivory/70">{cakeTypes.standfirst}</p>
        </div>

        {/* ── The two directions ────────────────────────────────────────── */}
        <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-16">
          {directions.map((direction, index) => (
            <article key={direction.key} className="flex flex-col">
              <CakeImage
                src={direction.image.src || undefined}
                alt={direction.image.alt}
                label={direction.title}
                aspect="3 / 2"
                sizes="(max-width: 1024px) 100vw, 44vw"
                className="border border-ivory/15"
              />

              <div className="mt-8 flex items-baseline gap-4">
                <span
                  className="font-serif text-5xl leading-none text-rose/40"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-3xl text-ivory">
                  {direction.title}
                </h3>
              </div>

              <p className="measure mt-5 text-[1.0625rem] leading-relaxed text-ivory/75">
                {direction.body}
              </p>

              <ul className="mt-8 space-y-0">
                {direction.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3.5 border-t border-ivory/12 py-3 text-[0.9375rem] text-ivory/80"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-rose"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* ── Occasions ─────────────────────────────────────────────────── */}
        {availableOccasions.length > 0 && (
          <div className="mt-20 border-t border-ivory/15 pt-14">
            <p className="measure text-[1.0625rem] text-ivory/75">
              {cakeTypes.closing}
            </p>

            <ul className="mt-8 flex flex-wrap gap-x-3 gap-y-3">
              {availableOccasions.map((occasion) => (
                <li
                  key={occasion.id}
                  className="border border-ivory/20 px-4 py-2 text-[0.8125rem] text-ivory/80"
                >
                  {occasion.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
