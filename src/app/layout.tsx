import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { business, contact, isProvided } from "@/content/site";
import type { PublicContact } from "@/content/site";
import { getPublicContact } from "@/lib/site-settings";
import "./globals.css";

/**
 * Fonts are self-hosted rather than fetched from Google.
 *
 * Two clean builds in this project failed because Google Fonts served URLs
 * that immediately 404'd — a deploy should not be able to break for a reason
 * unrelated to the code. Self-hosting also means no visitor's browser makes a
 * request to Google in order to read a cake website.
 *
 * Only the weights actually used are included: 300, 400 and 500, plus one
 * italic. Adding a weight to the stylesheet means adding the file too,
 * otherwise the browser will synthesise it and it will look wrong.
 *
 * These are the `latin` subset. The `latin-ext` faces are declared in
 * globals.css, where a `unicode-range` can be expressed — see the note there.
 */

const cormorant = localFont({
  // Both families are variable, so one file each covers the whole 300-500
  // range. Google serves a single identical file for those weights, which is
  // how it advertises a variable face through the discrete-weight API.
  src: [
    {
      path: "./fonts/cormorant-garamond-latin-300-500-normal.woff2",
      weight: "300 500",
      style: "normal",
    },
    {
      path: "./fonts/cormorant-garamond-latin-400-italic.woff2",
      weight: "300 500",
      style: "italic",
    },
  ],
  variable: "--font-cormorant",
  display: "swap",
  // Metrics of the fallback, so headings do not reflow as the real face loads.
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const inter = localFont({
  src: [
    {
      path: "./fonts/inter-latin-300-500-normal.woff2",
      weight: "300 500",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(business.url),
  title: {
    default: `${business.name} — Personalised and Classic Cakes`,
    template: `%s — ${business.name}`,
  },
  description:
    "Elshadai Cake Creations designs personalised and classic cakes for birthdays, weddings, christenings, anniversaries and other meaningful occasions.",
  applicationName: business.name,
  keywords: [
    "personalised cakes",
    "classic cakes",
    "celebration cakes",
    "birthday cakes",
    "wedding cakes",
    "christening cakes",
    "anniversary cakes",
    "bespoke cake design",
    "Elshadai Cake Creations",
  ],
  authors: [{ name: business.name }],
  creator: business.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: business.name,
    title: `${business.name} — Personalised and Classic Cakes`,
    description: business.shortDescription,
    url: business.url,
    locale: "en_GB",
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: business.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${business.name} — Personalised and Classic Cakes`,
    description: business.shortDescription,
    images: ["/brand/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f1",
  colorScheme: "light",
};

/**
 * Structured data describing the business.
 *
 * Only facts that have actually been supplied are included — an unfilled
 * placeholder is left out rather than published to search engines.
 *
 * The telephone and email come from the live contact details, so a number
 * changed in the admin is the number search engines are given too.
 */
function businessSchema(details: PublicContact) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: business.name,
    description: business.shortDescription,
    url: business.url,
    servesCuisine: "Cakes",
    knowsAbout: [
      "Personalised cakes",
      "Classic cakes",
      "Celebration cakes",
      "Wedding cakes",
      "Birthday cakes",
      "Christening cakes",
    ],
  };

  // Schema.org takes one telephone or several; only collapse to a bare string
  // when there is genuinely one, so a single number is not published as a list.
  if (details.phones.length === 1) {
    schema.telephone = details.phones[0].number;
  } else if (details.phones.length > 1) {
    schema.telephone = details.phones.map((entry) => entry.number);
  }
  if (isProvided(details.email)) schema.email = details.email;
  if (isProvided(contact.location)) {
    schema.address = {
      "@type": "PostalAddress",
      addressLocality: contact.location,
    };
  }
  if (isProvided(business.serviceArea)) schema.areaServed = business.serviceArea;

  const social = [
    contact.social.instagram,
    contact.social.facebook,
    contact.social.tiktok,
  ].filter(isProvided);
  if (social.length > 0) schema.sameAs = social;

  return schema;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const details = await getPublicContact();

  return (
    <html lang="en-GB" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(businessSchema(details)),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
