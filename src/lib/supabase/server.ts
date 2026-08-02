import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase clients.
 *
 * Two levels of access, and deliberately no third:
 *
 *   publicClient()   anonymous key, respects row level security. Reads visible
 *                    reviews and calls submit_cake_review(). Cannot read
 *                    customer_email — that column is not granted to the
 *                    anonymous role at all, so it cannot leak through this
 *                    client even if a query asks for it.
 *
 *   sessionClient()  the signed-in owner's own session, read from cookies.
 *                    Row level security recognises the owner and opens up the
 *                    hidden rows and the private columns.
 *
 * There is NO service-role client. Writing reviews and enforcing throttling
 * both happen inside SECURITY DEFINER database functions, and owner actions run
 * under the owner's own session, so this application never holds a key capable
 * of bypassing row level security. Nothing that powerful is ever deployed.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Anonymous, read-only access for public pages. Row level security applies. */
export function publicClient() {
  return createClient(
    requireEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } },
  );
}

/** The owner's authenticated session, read from request cookies. */
export async function sessionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies cannot be written.
            // Middleware refreshes the session instead, so this is safe to skip.
          }
        },
      },
    },
  );
}

// Intentionally no service-role client. See the note at the top of this file.
