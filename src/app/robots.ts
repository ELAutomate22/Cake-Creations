import type { MetadataRoute } from "next";
import { business } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The owner area and the internal API are not for search engines.
      disallow: ["/admin", "/admin/", "/api/"],
    },
    sitemap: `${business.url}/sitemap.xml`,
  };
}
