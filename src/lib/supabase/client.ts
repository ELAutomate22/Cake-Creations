"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase in the browser.
 *
 * Only the public key is ever exposed here, and row level security decides what
 * it can actually reach: visible reviews, without customer email addresses, and
 * nothing else. The key being public is expected and safe.
 *
 * No session handling is needed — nobody signs in on this website.
 */

let client: ReturnType<typeof createClient> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseClient() {
  if (!isDatabaseConfigured()) return null;

  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  return client;
}
