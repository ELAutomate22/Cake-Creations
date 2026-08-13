import type { Metadata } from "next";
import { business, legal } from "@/content/site";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `How ${business.name} uses cookies and similar storage.`,
  alternates: { canonical: "/cookies" },
};

/**
 * Cookie policy.
 *
 * The public website sets no cookies at all — there is no analytics, no
 * advertising and no tracking. Saying so plainly is more useful than a generic
 * consent notice for cookies that do not exist.
 */
export default function CookiesPage() {
  return (
    <article className="bg-ivory pt-40 pb-28 sm:pt-44">
      <div className="shell max-w-3xl">
        <p className="eyebrow text-cocoa-soft">Legal</p>
        <h1 className="display-lg mt-5 text-espresso">Cookie Policy</h1>
        <p className="mt-6 text-sm text-cocoa-soft">
          Last updated: {legal.cookiesUpdated}
        </p>

        <div className="mt-12 space-y-10 text-cocoa">
          <section>
            <h2 className="display-sm text-espresso">Cookies on this website</h2>
            <p className="voice mt-4">
              The public pages of this website set no cookies. There is no
              analytics, no advertising, and no third-party tracking of any
              kind, which is why you are not asked to accept anything.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">The owner&rsquo;s area</h2>
            <p className="voice mt-4">
              A single sign-in cookie is set when {business.name} logs in to
              manage reviews. It is strictly necessary for that sign-in to work
              and is never set for ordinary visitors.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Your browser</h2>
            <p className="voice mt-4">
              You can clear or block cookies in your browser settings at any
              time. Nothing on the public side of this website depends on them.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
