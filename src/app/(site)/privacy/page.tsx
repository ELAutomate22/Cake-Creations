import type { Metadata } from "next";
import { business, contact, isProvided, legal } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${business.name} handles personal information.`,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

/**
 * Privacy policy.
 *
 * Describes only what this website actually does. It collects nothing except a
 * review when someone chooses to leave one, so the policy says that rather
 * than listing practices copied from a template.
 */
export default function PrivacyPage() {
  return (
    <article className="bg-ivory pt-40 pb-28 sm:pt-44">
      <div className="shell max-w-3xl">
        <p className="eyebrow text-cocoa-soft">Legal</p>
        <h1 className="display-lg mt-5 text-espresso">Privacy Policy</h1>
        <p className="mt-6 text-sm text-cocoa-soft">
          Last updated: {legal.privacyUpdated}
        </p>

        <div className="mt-12 space-y-10 text-cocoa">
          <section>
            <h2 className="display-sm text-espresso">What this website collects</h2>
            <p className="voice mt-4">
              This website has no account system and takes no payment. It
              collects information in two places only: a review, when someone
              chooses to leave one, and a cake request, when someone chooses to
              send one.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Cake requests</h2>
            <p className="voice mt-4">
              When a cake request is sent, we store what was entered on the
              form: your name, email address and phone number, the details of
              the cake and occasion, the date it is needed, and — if delivery
              was chosen — the delivery address and postcode. Any reference
              photographs attached are stored alongside it.
            </p>
            <p className="voice mt-4">
              This is used to price the cake, reply to you, and make it. It is
              not used for marketing, is never sold, and is not shared with
              anyone beyond the services that host this website and its data.
            </p>
            <p className="voice mt-4">
              A one-way fingerprint of your network address is also stored, so
              the form cannot be used to send hundreds of requests at once. The
              address itself is never kept, and the fingerprint cannot be turned
              back into one.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">
              How long cake requests are kept
            </h2>
            <p className="voice mt-4">
              An order is deleted 30 days after it is completed, cancelled,
              declined or refunded. Deletion removes the order, its quotes and
              messages, its history, and any reference photographs you sent.
            </p>
            <p className="voice mt-4">
              The 30 days are counted from the day the order closed, not from
              the day it was sent — a cake ordered a year ahead stays live until
              it has been made. Records of any payment are held separately by
              the payment provider under its own terms.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Reviews</h2>
            <p className="voice mt-4">When a review is submitted, we store:</p>
            <ul className="mt-4 space-y-2 text-cocoa">
              <li>• the name given, shortened to a first name and an initial</li>
              <li>• the email address given, which is never shown publicly</li>
              <li>• the rating, review text, cake style and occasion</li>
              <li>• the date it was submitted</li>
              <li>
                • a one-way fingerprint used to limit repeated submissions. Your
                IP address itself is never stored
              </li>
            </ul>
            <p className="voice mt-4">
              The name, rating, review and any reply are shown publicly on this
              website. The email address is visible only to {business.name} and
              is used to confirm reviews are genuine.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Your choices</h2>
            <p className="voice mt-4">
              You can ask for your review to be hidden or deleted at any time,
              and you can ask what information is held about you. Get in touch
              using the contact details on this website.
            </p>
          </section>

          <section>
            <h2 className="display-sm text-espresso">Contact</h2>
            <p className="voice mt-4">
              {isProvided(contact.email)
                ? `Please contact ${business.name} at ${contact.email}.`
                : `Contact details for ${business.name} are shown in the Contact dialog on this website.`}
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
