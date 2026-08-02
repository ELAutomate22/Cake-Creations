import { benefits } from "@/content/site";

/**
 * What makes an Elshadai cake special.
 *
 * Set as a numbered editorial list rather than a grid of identical cards: each
 * entry is separated by a hairline rule with its number set large in the
 * margin, so the section reads like a page from a printed piece.
 */
export function Benefits() {
  return (
    <section
      aria-labelledby="benefits-heading"
      className="relative py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.4fr] lg:gap-20">
          {/* ── Heading ─────────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="eyebrow">{benefits.eyebrow}</p>
            <h2
              id="benefits-heading"
              className="heading mt-5 max-w-[14ch] text-balance"
            >
              {benefits.heading}
            </h2>

            {/* Stacked bands, echoing the layers of a cake. */}
            <div
              className="cake-layers mt-10 hidden h-24 w-32 lg:block"
              aria-hidden="true"
            />
          </div>

          {/* ── The list ────────────────────────────────────────────────── */}
          <ol className="border-t border-caramel/40">
            {benefits.items.map((item, index) => (
              <li
                key={item.title}
                className="group grid grid-cols-[3rem_1fr] gap-5 border-b border-caramel/40 py-8 sm:grid-cols-[4.5rem_1fr] sm:gap-8 sm:py-10"
              >
                <span
                  className="font-serif text-3xl leading-none text-caramel transition-colors group-hover:text-plum sm:text-4xl"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div>
                  <h3 className="font-serif text-2xl text-espresso sm:text-[1.75rem]">
                    {item.title}
                  </h3>
                  <p className="measure mt-3 text-[0.9375rem] leading-relaxed text-cocoa-soft">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
