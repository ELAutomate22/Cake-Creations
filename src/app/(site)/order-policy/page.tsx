import type { Metadata } from "next";
import Link from "next/link";
import { business, legal } from "@/content/site";

export const metadata: Metadata = {
  title: "Order & Cancellation Policy",
  description: `How cake requests, quotes, deposits and cancellations work at ${business.name}.`,
  alternates: { canonical: "/order-policy" },
  robots: { index: true, follow: true },
};

/**
 * Order and cancellation policy.
 *
 * NOT LEGALLY REVIEWED. This wording describes how the ordering system on this
 * website actually behaves, written plainly, and it should be read and approved
 * by the owner — and ideally by a solicitor — before the site is promoted. The
 * non-refundable deposit clause in particular is the one a customer is most
 * likely to dispute, so it needs to say what the business will actually do.
 *
 * The page is deliberately blunt about the deposit. A customer discovering
 * after paying that the money is not coming back is the single most
 * predictable complaint this system could produce, so it is stated before they
 * request, again at the point of consent, and again here.
 */
export default function OrderPolicyPage() {
  return (
    <article className="bg-ivory pt-40 pb-28 sm:pt-44">
      <div className="shell max-w-3xl">
        <p className="eyebrow text-cocoa-soft">Legal</p>
        <h1 className="display-lg mt-5 text-espresso">
          Order &amp; Cancellation Policy
        </h1>
        <p className="mt-6 text-sm text-cocoa-soft">
          Last updated: {legal.orderPolicyUpdated}
        </p>

        <div className="mt-12 space-y-10 text-cocoa">
          <section>
            <h2 className="display-sm text-espresso">A request is not an order</h2>
            <p className="voice mt-4">
              Sending a cake request through this website does not confirm an
              order, does not reserve a date and does not create a contract. It
              tells {business.name} what you are looking for.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Availability</h2>
            <p className="voice mt-4">
              Every request is checked against the diary before anything is
              agreed. Availability must be confirmed by {business.name} in
              writing. A date is only held once a deposit has been paid.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Your quote</h2>
            <p className="voice mt-4">
              Where a request can be accepted, a written quote is sent to the
              email address given on the request. The quote sets out the price,
              the deposit required and anything that still needs confirming. No
              price is shown or implied at the point of requesting, because the
              price depends on the design, the size and the date.
            </p>
            <p className="voice mt-4">
              A quote is only valid for the cake described in it. If the design,
              size, date or delivery arrangements change, the price may change,
              and a revised quote will be issued.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Deposits</h2>
            <p className="voice mt-4">
              A deposit confirms the order and secures the date. Until it is
              paid, the date remains available to other customers. The usual
              deposit is 50% of the total, but it may differ, and the exact
              amount is always stated on your quote.
            </p>

            <p className="voice mt-4 border-l-2 border-plum pl-5 text-espresso">
              <strong className="font-normal">
                Once a deposit has been paid, it is non-refundable.
              </strong>{" "}
              This is because work, planning and diary time begin as soon as an
              order is confirmed, and the date is then no longer offered to
              anyone else.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">The remaining balance</h2>
            <p className="voice mt-4">
              The balance is payable in line with the final payment request sent
              to you, and in any event before or at collection or delivery
              unless agreed otherwise in writing. A cake may not be released
              until the balance has been paid in full.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Changes to your order</h2>
            <p className="voice mt-4">
              Changes are accommodated where possible, but they may affect the
              price and cannot be guaranteed close to the date. Please ask as
              early as you can. Any change to the price will be confirmed in
              writing before it takes effect.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Cancellation</h2>
            <p className="voice mt-4">
              You may cancel at any time by contacting {business.name} directly.
              What happens next depends on when you cancel:
            </p>
            <ul className="voice mt-4 space-y-3">
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-3 block h-px w-4 shrink-0 bg-caramel" />
                <span>
                  <strong className="font-normal text-espresso">
                    Before a deposit is paid
                  </strong>{" "}
                  — nothing is owed by either side, because no order exists yet.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-3 block h-px w-4 shrink-0 bg-caramel" />
                <span>
                  <strong className="font-normal text-espresso">
                    After a deposit is paid
                  </strong>{" "}
                  — the deposit is not refunded. If the balance has already been
                  paid, the portion above the deposit may be refundable
                  depending on how close to the date you cancel and what work
                  has already been carried out.
                </span>
              </li>
            </ul>
            <p className="voice mt-4">
              If {business.name} has to cancel an order for any reason, you will
              be told as soon as possible and everything you have paid,
              including the deposit, will be refunded in full.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">
              Allergies and dietary requirements
            </h2>
            <p className="voice mt-4">
              Please state any allergy or dietary requirement on your request and
              confirm it before paying a deposit. Cakes are made in a kitchen
              where nuts, dairy, eggs, gluten and other allergens are present,
              and it is not possible to guarantee that any cake is free from
              traces of them.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Your information</h2>
            <p className="voice mt-4">
              What is stored, and for how long, is set out in the{" "}
              <Link
                href="/privacy"
                className="border-b border-espresso/40 text-espresso hover:border-espresso"
              >
                Privacy Policy
              </Link>
              . In short: order details and any reference photographs are kept
              while the order is live, and deleted 30 days after it is
              completed, cancelled, declined or refunded.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Getting in touch</h2>
            <p className="voice mt-4">
              Questions about an order, a quote or a cancellation are best
              raised directly. The contact details are in the footer of every
              page and in the Contact panel.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
