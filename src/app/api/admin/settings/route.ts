import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sanitiseText } from "@/lib/reviews/sanitise";
import { SETTING_KEYS, getSettings, setSetting, type SettingKey } from "@/lib/admin/settings";

/**
 * Business settings.
 *
 * Only the keys in SETTING_KEYS may be written; anything else in the body is
 * ignored, so this cannot be used to add arbitrary rows to the settings table.
 *
 * Changing the default deposit affects future quotes only. Quotes already
 * created hold their own percentage, so nothing here can alter a figure a
 * customer has already been given.
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

  return NextResponse.json({ ok: true, written, settings: await getSettings() });
}
