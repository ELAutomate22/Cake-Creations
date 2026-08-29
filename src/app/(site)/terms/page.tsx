import type { Metadata } from "next";
import Link from "next/link";
import { business, legal } from "@/content/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms on which ${business.name} provides this website and its cakes.`,
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

/**
 * Terms and conditions.
 *
 * NOT LEGALLY REVIEWED. Written to describe what this website and business
 * actually do, in plain words, rather than assembled from a template full of
 * clauses that do not apply. It must be read and approved by the owner, and
 * ideally by a solicitor, before the site is promoted.
 *
 * Deliberately absent: any guarantee, warranty or liability cap that has not
 * been checked by someone qualified. Inventing those would be worse than
 * leaving them out.
 */
export default function TermsPage() {
  return (
    <article className="bg-ivory pt-40 pb-28 sm:pt-44">
      <div className="shell max-w-3xl">
        <p className="eyebrow text-cocoa-soft">Legal</p>
        <h1 className="display-lg mt-5 text-espresso">Terms &amp; Conditions</h1>
        <p className="mt-6 text-sm text-cocoa-soft">
          Last updated: {legal.termsUpdated}
        </p>

        <div className="mt-12 space-y-10 text-cocoa">
          <section>
            <h2 className="display-sm text-espresso">Who these terms are with</h2>
            <p className="voice mt-4">
              This website is operated by {business.name}. Using it, or sending a
              cake request through it, means accepting these terms.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">What this website does</h2>
            <p className="voice mt-4">
              The website shows previous work, publishes customer reviews and
              lets you send a cake request. It does not take payments and it
              does not sell anything directly. Nothing on it is an offer to sell
              at a stated price.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Requests, quotes and orders</h2>
            <p className="voice mt-4">
              Sending a request does not create an order. An order exists only
              once a quote has been issued, accepted and a deposit paid. The
              full sequence, including deposits and cancellation, is set out in
              the{" "}
              <Link
                href="/order-policy"
                className="border-b border-espresso/40 text-espresso hover:border-espresso"
              >
                Order &amp; Cancellation Policy
              </Link>
              , which forms part of these terms.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Information you give us</h2>
            <p className="voice mt-4">
              Please make sure the details on your request are accurate,
              particularly the date, the spelling of any name or message on the
              cake, and any allergy or dietary requirement. Cakes are made to
              what was confirmed in writing, and a cake cannot be remade because
              a detail supplied to us was wrong.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Reference photographs</h2>
            <p className="voice mt-4">
              Any photograph you attach is used only to understand the cake you
              have in mind. Please do not send images you do not have the right
              to share. A reference is a starting point rather than something to
              be copied exactly: every cake is made by hand, and no two are
              identical.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Photographs of your cake</h2>
            <p className="voice mt-4">
              {business.name} may photograph completed cakes and show them on
              this website or on social media. Personal details such as a
              surname or an address are never published. If you would rather
              your cake was not shown, say so and it will not be.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Reviews</h2>
            <p className="voice mt-4">
              Reviews are published as written, with only a first name and
              initial shown. Reviews that are abusive, contain links, or are not
              about a cake from this business may be removed.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">This website</h2>
            <p className="voice mt-4">
              The photographs, wording and design of this website belong to{" "}
              {business.name} and may not be reproduced without permission. The
              website is provided as it is: we aim to keep it accurate and
              available, but do not guarantee that it will be uninterrupted or
              free of errors.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Your information</h2>
            <p className="voice mt-4">
              How your information is handled and how long it is kept is set out
              in the{" "}
              <Link
                href="/privacy"
                className="border-b border-espresso/40 text-espresso hover:border-espresso"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Changes</h2>
            <p className="voice mt-4">
              These terms may be updated. The version that applies to an order
              is the one in force when the request was sent, which is recorded
              against the order.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
