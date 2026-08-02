import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { business, contact, resolved } from "@/content/site";

export const metadata: Metadata = {
  title: "Website Information",
  description: `Information about the ${business.name} website.`,
  alternates: { canonical: "/website-information" },
};

export default function WebsiteInformationPage() {
  const email = resolved(contact.email);
  const location = resolved(business.location);

  return (
    <LegalPage
      title="Website Information"
      updated="Please review before launch"
    >
      <h2>About this website</h2>
      <p>
        This website presents the work of {business.name}. It is a portfolio and
        information website: it shows photographs of cakes, explains the styles
        offered, and provides contact details.
      </p>

      <h2>Ordering</h2>
      <p>
        <strong>
          Cakes cannot be ordered, booked or paid for through this website.
        </strong>{" "}
        There is no order form, no booking calendar and no payment system.
        Everything about a cake — dates, sizes, flavours, designs and prices — is
        discussed directly with {resolved(contact.person) ?? "the business"}{" "}
        using the contact details published here.
      </p>

      <h2>Accuracy of the photographs</h2>
      <p>
        Photographs show cakes that have been made previously. Every cake is made
        by hand, so no two are identical and the finished result may differ in
        small ways from a photograph.
      </p>

      <h2>Reviews</h2>
      <p>
        Reviews on this website are written by customers and published
        immediately, without being approved first. The business can hide or
        delete a review afterwards — for example if it is abusive, if it is not
        about a cake, or at the request of the person who wrote it. Reviewers&rsquo;
        email addresses are collected but never published. See the{" "}
        <a href="/privacy">Privacy Policy</a> for details.
      </p>

      <h2>Allergies and dietary requirements</h2>
      <p>
        Cakes are made in a kitchen that handles common allergens. Please discuss
        any allergy or dietary requirement directly with the business before
        agreeing a cake.
      </p>

      <h2>Contact</h2>
      <p>
        {location && <>Based in {location}. </>}
        {email ? (
          <>
            For any question about this website, email{" "}
            <a href={`mailto:${email}`}>{email}</a>.
          </>
        ) : (
          <>Contact details are shown in the Contact panel on this website.</>
        )}
      </p>
    </LegalPage>
  );
}
