/**
 * Shared layout for the policy pages.
 *
 * Kept plain and readable — these pages exist to be understood, not admired.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-[46rem] px-5 pb-28 pt-36 sm:px-8 sm:pt-44">
      <h1 className="display">{title}</h1>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-cocoa-soft">
        {updated}
      </p>

      <hr className="icing-rule my-12" />

      <div
        className={[
          "space-y-5 text-[1.0625rem] leading-relaxed text-cocoa",
          "[&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-espresso",
          "[&_h2:first-child]:mt-0",
          "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
          "[&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
          "[&_a]:text-plum [&_a]:underline [&_a]:underline-offset-2",
          "[&_strong]:font-medium [&_strong]:text-espresso",
          "[&_code]:font-mono [&_code]:text-sm",
        ].join(" ")}
      >
        {children}
      </div>
    </article>
  );
}

/**
 * A standing reminder that this text is a starting point.
 *
 * These pages were drafted to describe what the website actually does, but they
 * have not been checked by anyone qualified to confirm they meet the owner's
 * legal obligations. Saying so plainly is more useful than implying otherwise.
 */
export function LegalNotice() {
  return (
    <div className="mb-10 border-l-2 border-caramel bg-vanilla px-5 py-4">
      <p className="text-sm leading-relaxed text-cocoa">
        <strong className="font-medium text-espresso">
          For the owner — please read before launch.
        </strong>{" "}
        This text was written to describe accurately what this website does with
        visitors&rsquo; information. It has <strong>not</strong> been reviewed by
        a solicitor, and no claim is made that it satisfies UK GDPR or any other
        legal requirement. Please have it checked, and remove this notice once
        you are satisfied it is correct.
      </p>
    </div>
  );
}
