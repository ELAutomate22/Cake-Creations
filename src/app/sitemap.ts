import type { MetadataRoute } from "next";
import { business } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // The owner area is deliberately absent — it must not be discoverable.
  return [
    { url: business.url, lastModified: now, changeFrequency: "monthly", priority: 1 },
    {
      url: `${business.url}/gallery`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${business.url}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${business.url}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${business.url}/website-information`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
