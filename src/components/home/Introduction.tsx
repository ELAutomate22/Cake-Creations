import { introduction, resolved } from "@/content/site";
import { CakeImage } from "@/components/ui/CakeImage";

/**
 * The business introduction.
 *
 * An editorial arrangement rather than a row of cards: one tall photograph, a
 * smaller detail shot overlapping it, and the text set alongside with plenty of
 * air around it.
 */
export function Introduction() {
  const secondary = resolved(introduction.bodySecondary);

  return (
    <section
      aria-labelledby="introduction-heading"
      className="relative py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          {/* ── Photography ───────────────────────────────────────────── */}
          <div className="relative">
            <CakeImage
              src={introduction.primaryImage.src || undefined}
              alt={introduction.primaryImage.alt}
              label={introduction.primaryImage.caption}
              aspect="4 / 5"
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="border border-caramel/40"
            />

            {/* The detail shot, overlapping the corner. */}
            <div className="absolute -bottom-10 -right-4 w-[42%] sm:-right-8 sm:w-[38%] lg:-right-12">
              <CakeImage
                src={introduction.detailImage.src || undefined}
                alt={introduction.detailImage.alt}
                label={introduction.detailImage.caption}
                aspect="1 / 1"
                sizes="(max-width: 1024px) 40vw, 18vw"
                className="border-4 border-ivory shadow-[0_24px_50px_-18px_rgb(42_29_23/0.35)]"
              />
            </div>
          </div>

          {/* ── Words ─────────────────────────────────────────────────── */}
          <div className="mt-14 lg:mt-0">
            <p className="eyebrow">{introduction.eyebrow}</p>

            <h2
              id="introduction-heading"
              className="heading mt-5 max-w-[18ch] text-balance"
            >
              {introduction.heading}
            </h2>

            {/* A short piped rule, echoing an icing line. */}
            <div className="mt-8 flex items-center gap-2" aria-hidden="true">
              <span className="h-px w-14 bg-caramel" />
              <span className="h-1.5 w-1.5 rounded-full bg-plum" />
              <span className="h-px w-6 bg-caramel/60" />
            </div>

            <p className="measure mt-8 text-[1.0625rem] leading-relaxed text-cocoa">
              {introduction.body}
            </p>

            {secondary && (
              <p className="measure mt-5 text-[1.0625rem] leading-relaxed text-cocoa-soft">
                {secondary}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
