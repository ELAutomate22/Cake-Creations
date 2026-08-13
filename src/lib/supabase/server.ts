import { createClient } from "@supabase/supabase-js";

/**
 * Supabase access from the server.
 *
 * There is deliberately no service-role key anywhere in this project. Reviews
 * are submitted through the public key with row level security doing the
 * enforcing, so nothing here can bypass the database's own rules — which means
 * a mistake in application code cannot turn into a data leak.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether the database has been connected yet.
 *
 * The website is built to work before Supabase exists: the reviews section
 * says so plainly rather than throwing, so the rest of the site is unaffected.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** A client for public reads and review submission. Carries no user session. */
export function createPublicClient() {
  return createClient(
    requireEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
