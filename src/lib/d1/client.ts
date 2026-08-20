import "server-only";

/**
 * Cloudflare D1, over HTTP.
 *
 * The website is hosted on Netlify, not on Cloudflare, so there is no Worker
 * binding to reach D1 through. It is queried over its REST API instead, with an
 * account-scoped API token.
 *
 * That token is the important difference from what came before. Supabase had a
 * publishable key which the browser used directly, with row level security
 * deciding what it could see. D1 has no row level security and no public key:
 * anything that can talk to it can do anything to it. So the token is a server
 * secret, this module is marked server-only so a stray import into a client
 * component fails the build rather than shipping the token to a browser, and
 * every read the website performs goes through server code that names the
 * columns it wants.
 *
 * Statements are always parameterised. String building is not available here
 * even as a shortcut: `query` takes SQL and a separate list of values.
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

/**
 * Whether the database has been connected yet.
 *
 * The website is built to work before a database exists — the reviews section
 * says so plainly rather than throwing — so this is checked, not assumed.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(ACCOUNT_ID && DATABASE_ID && API_TOKEN);
}

type D1Response<T> = {
  success: boolean;
  errors: { code: number; message: string }[];
  result: {
    success: boolean;
    results: T[];
    meta: { changes?: number; rows_read?: number; rows_written?: number };
  }[];
};

export type D1Result<T> = {
  rows: T[];
  changes: number;
};

/**
 * Runs one parameterised statement and returns its rows.
 *
 * Throws on failure rather than returning an error value, because every caller
 * here is a route handler that turns a thrown error into a 500 — swallowing it
 * would mean a review silently not being saved.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<D1Result<T>> {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "Cloudflare D1 is not configured. Set CLOUDFLARE_ACCOUNT_ID, " +
        "CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_API_TOKEN.",
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      // Reviews must never be served from a cached response.
      cache: "no-store",
    },
  );

  const body = (await response.json()) as D1Response<T>;

  if (!response.ok || !body.success) {
    const detail =
      body.errors?.map((error) => error.message).join("; ") ||
      `HTTP ${response.status}`;
    throw new Error(`D1 query failed: ${detail}`);
  }

  const first = body.result?.[0];
  return {
    rows: first?.results ?? [],
    changes: first?.meta?.changes ?? 0,
  };
}
