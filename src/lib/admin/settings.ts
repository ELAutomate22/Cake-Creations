import "server-only";
import { query } from "@/lib/d1/client";

/**
 * Business settings.
 *
 * Values the owner can change without a deploy, kept in the `settings` table
 * as text and read here. Anything read for a quote is copied onto that quote
 * when it is sent, so changing a default later never rewrites a quote a
 * customer has already been given.
 */

export const SETTING_KEYS = [
  "default_deposit_percentage",
  "default_quote_message",
  "business_email",
  "business_phone",
  "business_phone_secondary",
  "collection_information",
  "delivery_information",
  "email_footer",
  "policy_version",
  "retention_days_after_close",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];
export type Settings = Partial<Record<SettingKey, string>>;

export async function getSettings(): Promise<Settings> {
  const { rows } = await query<{ key: SettingKey; value: string }>(
    `SELECT key, value FROM settings`,
  );

  const settings: Settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, new Date().toISOString()],
  );
}

/**
 * The default deposit percentage.
 *
 * Falls back to 50 rather than 0 if the setting is missing or unreadable: a
 * quote defaulting to no deposit is a quote that confirms an order for
 * nothing, which is a worse failure than one the owner has to correct.
 */
export async function defaultDepositPercentage(): Promise<number> {
  const settings = await getSettings();
  const value = Number(settings.default_deposit_percentage);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 50;
}
