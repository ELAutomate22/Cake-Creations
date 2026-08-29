import type { Config } from "@netlify/functions";

/**
 * The daily retention sweep.
 *
 * Netlify's scheduler rather than a Cloudflare Cron Trigger, because the
 * application runs here. It holds no logic of its own — it calls the
 * application endpoint, which owns the rule about what may be deleted, so
 * there is only one implementation of that rule to get right.
 *
 * Deliberately independent of anyone visiting the site: personal data has to
 * be deleted on time whether or not the owner opens the admin area that week.
 */

export default async function purge() {
  const base = process.env.APP_BASE_URL;
  const secret = process.env.CRON_SECRET;

  if (!base || !secret) {
    console.error("APP_BASE_URL or CRON_SECRET missing; skipping retention sweep.");
    return;
  }

  const response = await fetch(`${base.replace(/\/$/, "")}/api/cron/purge`, {
    method: "POST",
    headers: { "x-cron-secret": secret },
  });

  const body = await response.text();
  console.log(`Retention sweep responded ${response.status}: ${body.slice(0, 200)}`);
}

export const config: Config = {
  // Just after 03:00 UTC, when nobody is ordering cakes.
  schedule: "7 3 * * *",
};
