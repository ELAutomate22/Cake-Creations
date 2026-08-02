import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { business, contact, resolved } from "@/content/site";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
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
    description:
      "Personalised and classic cakes created for meaningful occasions.",
    url: business.url,
    locale: "en_GB",
    // Replace with a photograph of a finished cake sized 1200x630.
    images: [
      {
        url: "/media/intro-cake.jpg",
        width: 1086,
        height: 1448,
        alt: "A tall white buttercream cake with a silver drip and piped decoration",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${business.name} — Personalised and Classic Cakes`,
    description:
      "Personalised and classic cakes created for meaningful occasions.",
    images: ["/media/intro-cake.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Structured data describing the business.
 *
 * Review data is deliberately NOT included here. Aggregate ratings are only
 * added once genuine customer reviews exist — see README, "Before launch".
 */
function businessStructuredData() {
  const phone = resolved(contact.phone.dial);
  const email = resolved(contact.email);
  const location = resolved(business.location);
  const socials = [
    resolved(contact.social.instagram),
    resolved(contact.social.facebook),
    resolved(contact.social.tiktok),
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: business.name,
    description:
      "A cake-creation business specialising in personalised and classic cakes for celebrations.",
    url: business.url,
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(location ? { address: { "@type": "PostalAddress", addressLocality: location } } : {}),
    ...(resolved(business.serviceArea)
      ? { areaServed: resolved(business.serviceArea) }
      : {}),
    ...(socials.length ? { sameAs: socials } : {}),
    makesOffer: [
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Personalised cakes" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Classic cakes" } },
      { "@type": "Offer", itemOffered: { "@type": "Product", name: "Occasion cakes" } },
    ],
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        {/*
          The opening sequence is part of the server-rendered HTML, so without
          JavaScript it would never be dismissed. This hides it in that case,
          leaving the website immediately usable.
        */}
        <noscript>
          <style>{`#intro-overlay{display:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <script
          type="application/ld+json"
          // Static, developer-authored JSON. No user input reaches this string.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(businessStructuredData()),
          }}
        />
        {children}
      </body>
    </html>
  );
}
