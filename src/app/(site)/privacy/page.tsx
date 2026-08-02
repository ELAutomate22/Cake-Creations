import type { Metadata } from "next";
import { LegalPage, LegalNotice } from "@/components/legal/LegalPage";
import { business, contact, resolved } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${business.name} handles the information provided when a customer leaves a review.`,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const email = resolved(contact.email);

  return (
    <LegalPage title="Privacy Policy" updated="This policy has not yet been reviewed for launch">
      <LegalNotice />

      <h2>What this policy covers</h2>
      <p>
        This policy explains what information {business.name} collects through
        this website, why it is collected, and what happens to it. The website
        does not sell anything, take orders or process payments.
      </p>

      <h2>Information collected when you leave a review</h2>
      <p>When you submit a review, the following is collected:</p>
      <ul>
        <li>
          <strong>Your name</strong> — published publicly alongside your review.
        </li>
        <li>
          <strong>Your email address</strong> — <strong>never published</strong>.
          It is collected so the business can verify a review is genuine and
          reply to you privately if needed.
        </li>
        <li>
          <strong>The type and style of cake, and the occasion</strong> —
          published publicly.
        </li>
        <li>
          <strong>Your rating and review text</strong> — published publicly.
        </li>
        <li>
          <strong>A one-way coded version of your network address</strong>, and
          your browser identification. These are used only to prevent spam and
          repeated automated submissions. The coded value cannot be turned back
          into your actual network address.
        </li>
      </ul>

      <h2>Where your review appears</h2>
      <p>
        Reviews are published on this website immediately after submission. Your
        name, rating, cake type, cake style, occasion, review text and the date
        are visible to anyone visiting the site. Your email address is not, and
        is never shown to other visitors under any circumstances.
      </p>

      <h2>How long information is kept</h2>
      <p>
        Reviews are kept for as long as they remain published on the website. If
        a review is deleted at your request, or by the business, it is removed
        from the database permanently.
      </p>

      <h2>Asking for your review to be removed</h2>
      <p>
        You can ask for your review to be hidden or deleted at any time, and you
        do not need to give a reason.
        {email ? (
          <>
            {" "}
            Email <a href={`mailto:${email}`}>{email}</a> from the address you
            used when leaving the review, and it will be removed.
          </>
        ) : (
          <> Use the contact details published on this website to get in touch.</>
        )}
      </p>

      <h2>Cookies and analytics</h2>
      <p>
        This website does not use advertising cookies and does not track you
        across other websites. A small amount of information is stored in your
        browser to remember that you have already seen the opening sequence, so
        it does not play again on every page. That information never leaves your
        device.
      </p>
      <p>
        If the owner adds website analytics in future, this policy must be
        updated to say so before they are switched on.
      </p>

      <h2>Links to other services</h2>
      <p>
        The contact panel may link to WhatsApp, Instagram, Facebook or TikTok.
        Selecting one of those opens a service run by another company, with its
        own privacy policy. {business.name} has no control over, and takes no
        responsibility for, how those companies handle your information.
      </p>

      <h2>Who holds the information</h2>
      <p>
        Reviews are stored in a hosted database. Access to email addresses is
        restricted to the business owner, protected by a password, and enforced
        by the database itself rather than only by the website.
      </p>

      <h2>Contact about privacy</h2>
      <p>
        {email ? (
          <>
            For any question about this policy or the information held about
            you, email <a href={`mailto:${email}`}>{email}</a>.
          </>
        ) : (
          <>
            For any question about this policy, please use the contact details
            published on this website.
          </>
        )}
      </p>
    </LegalPage>
  );
}
