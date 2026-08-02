import { createBrowserClient } from "@supabase/ssr";

/**
 * The browser client, used only to sign the owner in and out.
 *
 * It carries the public anonymous key, which is safe to ship: row level
 * security decides what it can reach, and customer email addresses are not
 * readable through it under any circumstances.
 */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
