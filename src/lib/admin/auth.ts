import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { query } from "@/lib/d1/client";

/**
 * Admin sessions.
 *
 * One person runs this business, so this is a single password rather than a
 * user system: no accounts to manage, no password reset flow to get wrong, no
 * dependency to keep patched. What it must still do properly is prove a
 * request came from someone who knew the password, and prove it on the server
 * every time — hiding a button is not access control.
 *
 * The cookie holds an expiry and a signature over it, made with a secret that
 * never leaves the server. Nothing in the cookie is trusted: the signature is
 * recomputed and compared, and an unsigned or edited cookie fails.
 *
 * Both comparisons are timing-safe. A plain `===` on a secret leaks how much
 * of a guess was correct through how long the comparison took, which is enough
 * to recover a value one character at a time.
 *
 * Signing out ends every session, everywhere.
 *
 * A signed token needs no server record to be valid, which is what makes it
 * cheap — and it is also why clearing the browser's cookie is not, on its own,
 * signing out: a copy of that cookie taken beforehand stays valid until it
 * expires. The fix is one row, not a table of sessions. Every token carries
 * the current value of a single marker, and signing out changes it, which
 * invalidates every token ever issued in one write. Storage does not grow with
 * use: there is exactly one row whatever happens.
 *
 * For a business run by one person that is the behaviour you want anyway —
 * signing out means signed out, not signed out here.
 */

const COOKIE = "elshadai_admin";
const SESSION_HOURS = 12;

/** The single settings row every session is measured against. */
const EPOCH_KEY = "admin_session_epoch";

/**
 * The last marker this instance managed to read.
 *
 * If the database cannot be reached, this is used rather than refusing the
 * request. Locking the owner out of their own admin during a network blip is
 * a worse failure than briefly honouring a session that was signed out, and
 * the signature and the expiry are still checked either way.
 */
let lastKnownEpoch: string | null = null;

async function readEpoch(): Promise<string> {
  const { rows } = await query<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    [EPOCH_KEY],
  );
  // No row yet means no one has ever signed out. "0" is a real value, not a
  // failure, and tokens are minted against it quite happily.
  return rows[0]?.value ?? "0";
}

/*
 * Read once per request, and not cached beyond it.
 *
 * A cache with a lifetime would make signing out take effect "soon", which is
 * not a property a sign-out may have: for the length of the window a cookie
 * that was signed out still works, and whether it does depends on which
 * instance answers. React's `cache` deduplicates within a single request, so a
 * page that checks access several times still costs one read, and the answer
 * is never stale.
 *
 * One small indexed read per admin request is a price worth paying. Nothing
 * else in the admin is on this path, and an order page already makes nine
 * queries to render.
 */
const readEpochOnce = cache(readEpoch);

async function currentEpoch(): Promise<string> {
  try {
    const epoch = await readEpochOnce();
    lastKnownEpoch = epoch;
    return epoch;
  } catch (error) {
    console.error("Could not read the session marker; using the last known one.", error);
    return lastKnownEpoch ?? "0";
  }
}

/**
 * Ends every admin session.
 *
 * One write. Every token issued before this moment stops verifying, on every
 * device, because the marker they carry no longer matches.
 */
export async function endAllSessions(): Promise<void> {
  const next = randomBytes(8).toString("hex");

  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [EPOCH_KEY, next, new Date().toISOString()],
  );

  lastKnownEpoch = next;
}

const PASSWORD = process.env.ADMIN_PASSWORD;
const SECRET = process.env.ADMIN_SESSION_SECRET;

export function isAdminConfigured(): boolean {
  return Boolean(PASSWORD && SECRET);
}

/** Constant-time comparison that tolerates different lengths. */
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  // timingSafeEqual throws on a length mismatch, and the throw itself would
  // leak the length. Compare a fixed-size digest of each instead.
  const digest = (value: Buffer) =>
    createHmac("sha256", SECRET as string).update(value).digest();

  return timingSafeEqual(digest(left), digest(right));
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET as string).update(payload).digest("hex");
}

/** True when the password given matches the one configured. */
export function passwordMatches(candidate: string): boolean {
  if (!isAdminConfigured()) return false;
  return equals(candidate, PASSWORD as string);
}

/**
 * A signed session value: expiry, a nonce, the session marker, and a signature
 * over all three.
 *
 * The marker is inside the signed payload rather than beside it, so it cannot
 * be edited to revive a token that signing out has already killed.
 */
export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  // The nonce makes two sessions issued in the same millisecond differ, so a
  // token is never a predictable function of the clock alone.
  const payload = `${expires}.${randomBytes(12).toString("hex")}.${await currentEpoch()}`;
  return `${payload}.${sign(payload)}`;
}

/** Whether a session value is genuine, still current, and not signed out. */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !isAdminConfigured()) return false;

  const parts = token.split(".");
  // Three parts is a token from before sign-out ended sessions everywhere.
  // Those are not honoured: it cannot be shown they were not signed out.
  if (parts.length !== 4) return false;

  const [expires, nonce, epoch, signature] = parts;
  const payload = `${expires}.${nonce}.${epoch}`;

  if (!equals(signature, sign(payload))) return false;

  const expiry = Number(expires);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return false;

  // The marker is not a secret — it is a version number — so a plain
  // comparison is right here. Nothing is learned from how long it takes.
  return epoch === (await currentEpoch());
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = SESSION_HOURS * 60 * 60;

/**
 * Whether the current request carries a valid admin session.
 *
 * Every admin page and every admin endpoint calls this. It is the only thing
 * that decides access — no route relies on not being linked to.
 */
export async function isAdminRequest(): Promise<boolean> {
  const store = await cookies();
  return await verifySessionToken(store.get(COOKIE)?.value);
}

/**
 * Guard for admin API routes.
 *
 * Returns a 401 to be sent back, or null when the caller may proceed. The
 * response says nothing about why, so it cannot be used to work out whether a
 * given order exists.
 */
export async function requireAdmin(): Promise<Response | null> {
  if (await isAdminRequest()) return null;
  return new Response(JSON.stringify({ ok: false, message: "Not authorised." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
