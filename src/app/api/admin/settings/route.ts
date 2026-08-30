import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { sanitiseText } from "@/lib/reviews/sanitise";
import { SETTING_KEYS, getSettings, setSetting, type SettingKey } from "@/lib/admin/settings";
import { SITE_SETTINGS_TAG } from "@/lib/site-settings";

/**
 * Business settings.
 *
 * Only the keys in SETTING_KEYS may be written; anything else in the body is
 * ignored, so this cannot be used to add arbitrary rows to the settings table.
 *
 * Changing the default deposit affects future quotes only. Quotes already
 * created hold their own percentage, so nothing here can alter a figure a
 * customer has already been given.
 *
 * Several of these are shown on the public website, which caches its copy so
 * that a page view does not cost a database query. A save therefore has to
 * invalidate that cache, or the change would sit in the database while the
 * site kept serving the old value — which is exactly what used to happen.
 */

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ ok: true, settings: await getSettings() });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  const written: string[] = [];

  for (const key of SETTING_KEYS) {
    if (!(key in body)) continue;

    let value = sanitiseText(String(body[key] ?? "")).slice(0, 2000);

    if (key === "default_deposit_percentage") {
      const percentage = Math.round(Number(value));
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        return NextResponse.json(
          { ok: false, message: "The deposit percentage must be between 0 and 100." },
          { status: 422 },
        );
      }
      value = String(percentage);
    }

    await setSetting(key as SettingKey, value);
    written.push(key);
  }

  // Only when something actually changed, and only after it is written.
  //
  // "max" is the widest cache profile, so every stored entry under the tag is
  // purged regardless of how long it was meant to live. A narrower profile
  // would leave older copies in place, which is the bug this is here to stop.
  if (written.length > 0) {
    revalidateTag(SITE_SETTINGS_TAG, "max");
  }

  return NextResponse.json({ ok: true, written, settings: await getSettings() });
}
