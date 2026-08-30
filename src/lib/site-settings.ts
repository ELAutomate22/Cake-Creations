import "server-only";
import { unstable_cache } from "next/cache";
import {
  contact,
  isProvided,
  type PhoneNumber,
  type PublicContact,
} from "@/content/site";
import { getSettings, type Settings } from "@/lib/admin/settings";

/**
 * What the public pages show, once the admin has had its say.
 *
 * The website's wording lives in `src/content/site.ts`, which is fixed at
 * build time. A handful of those details — the phone numbers, the email
 * address, the collection and delivery notes — are things the owner needs to
 * change without a deploy, so they are also rows in the `settings` table. This
 * module is the single place the two are reconciled.
 *
 * The rule is precise, because the obvious version of it is wrong. A saved
 * setting wins whenever the row *exists*, even if it is empty — otherwise
 * clearing a field in the admin would silently restore the old value from the
 * content file and there would be no way to remove a number at all. Only a key
 * that has never been saved falls back to the content file.
 *
 * Reads are cached under a tag rather than hit on every request, so the
 * database is not queried once per page view. Saving in the admin invalidates
 * that tag, which is what makes a change appear on the site immediately.
 *
 * If the database cannot be reached the site does not break: the read fails
 * quietly to no overrides and the content file's values are shown. A cake shop
 * losing its phone number because of a network blip would be worse than
 * showing one that is a few minutes out of date.
 */

export const SITE_SETTINGS_TAG = "site-settings";

async function readSettings(): Promise<Settings> {
  try {
    return await getSettings();
  } catch (error) {
    console.error("Could not read site settings; using the content file.", error);
    return {};
  }
}

const readCachedSettings = unstable_cache(readSettings, ["site-settings"], {
  tags: [SITE_SETTINGS_TAG],
});

/** A saved row wins even when empty; an absent key falls back to the file. */
function override(settings: Settings, key: keyof Settings, fallback: string): string {
  return key in settings ? (settings[key] ?? "") : fallback;
}

export async function getPublicContact(): Promise<PublicContact> {
  const settings = await readCachedSettings();

  const phones: PhoneNumber[] = [
    {
      number: override(settings, "business_phone", contact.phones[0]?.number ?? ""),
      label: override(settings, "business_phone_label", contact.phones[0]?.label ?? ""),
    },
    {
      number: override(
        settings,
        "business_phone_secondary",
        contact.phones[1]?.number ?? "",
      ),
      label: override(
        settings,
        "business_phone_secondary_label",
        contact.phones[1]?.label ?? "",
      ),
    },
    // Only numbers that are real. A cleared field, or a placeholder still in
    // square brackets, must not be printed at a customer.
  ].filter((entry) => isProvided(entry.number));

  return {
    phones,
    email: override(settings, "business_email", contact.email),
    collection: override(settings, "collection_information", contact.collection),
    delivery: override(settings, "delivery_information", contact.delivery),
  };
}
