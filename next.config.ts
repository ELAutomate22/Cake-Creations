import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Cake photographs are served from /public and fingerprinted by the asset
  // pipeline, so they can be cached hard.
  async headers() {
    /*
     * Security headers.
     *
     * Netlify adds HSTS; nothing else was being set. These are the ones that
     * cost nothing and close real classes of attack:
     *
     * - frame-ancestors / X-Frame-Options stop the site being loaded inside
     *   someone else's page, which is how a click on what looks like their
     *   button becomes a click on ours. The admin area is the reason this
     *   matters: it has buttons that decline orders and record refunds.
     * - nosniff stops a browser deciding a response is a script because its
     *   contents look like one, whatever the Content-Type says.
     * - Referrer-Policy keeps the full URL out of requests to other sites. The
     *   quote and payment links carry a secret token in the path, and without
     *   this a referrer header could hand that token to any third party a
     *   customer's page happened to contact.
     * - Permissions-Policy turns off hardware the site never uses, so a script
     *   that somehow got in cannot reach for a camera or a location.
     *
     * A full Content-Security-Policy is deliberately not set here. Next inlines
     * hydration scripts, so a strict one needs per-request nonces; a loose one
     * with 'unsafe-inline' reads as protection while providing almost none.
     * frame-ancestors is the part that works without nonces, so that is set.
     */
    const security = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
    ];

    return [
      { source: "/:path*", headers: security },

      /*
       * Pages that must never reach a search index.
       *
       * The quote and payment pages already carry a noindex meta tag, but a
       * header covers what a tag cannot: a crawler that fetches without
       * executing, and the admin routes, which redirect rather than render and
       * so have no tag of their own to carry.
       */
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/quote/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/pay/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/payment/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },

      {
        source: "/cakes/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
