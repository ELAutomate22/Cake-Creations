import type { Metadata } from "next";
import { LegalPage, LegalNotice } from "@/components/legal/LegalPage";
import { business } from "@/content/site";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `How ${business.name} uses browser storage on this website.`,
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="This policy has not yet been reviewed for launch"
    >
      <LegalNotice />

      <h2>The short version</h2>
      <p>
        This website does not use advertising cookies, does not build a profile
        of you, and does not track you across other websites. There is no cookie
        banner because there is nothing to consent to.
      </p>

      <h2>What is stored in your browser</h2>
      <ul>
        <li>
          <strong>Opening sequence</strong> — a single value is stored for the
          length of your visit so the opening animation does not replay every
          time you move between pages. It is cleared automatically when you close
          your browser, and never leaves your device.
        </li>
        <li>
          <strong>Owner sign-in</strong> — if you are the business owner and sign
          in to the private owner area, a secure cookie keeps you signed in.
          This applies only to the owner and never to ordinary visitors.
        </li>
      </ul>

      <h2>What is not used</h2>
      <ul>
        <li>Advertising or marketing cookies</li>
        <li>Cross-site tracking of any kind</li>
        <li>Social media tracking pixels</li>
        <li>Website analytics</li>
      </ul>

      <p>
        If analytics are added in future, this page and the{" "}
        <a href="/privacy">Privacy Policy</a> must be updated before they are
        switched on.
      </p>

      <h2>Controlling browser storage</h2>
      <p>
        You can clear or block browser storage through your browser settings.
        Doing so will simply mean the opening sequence plays again on your next
        visit; nothing else on the website depends on it.
      </p>
    </LegalPage>
  );
}
