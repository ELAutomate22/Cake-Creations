import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

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
 */

const COOKIE = "elshadai_admin";
const SESSION_HOURS = 12;

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

/** A signed session value: expiry, a nonce, and a signature over both. */
export function createSessionToken(): string {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  // The nonce makes two sessions issued in the same millisecond differ, so a
  // token is never a predictable function of the clock alone.
  const payload = `${expires}.${randomBytes(12).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

/** Whether a session value is genuine and still current. */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !isAdminConfigured()) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expires, nonce, signature] = parts;
  const payload = `${expires}.${nonce}`;

  if (!equals(signature, sign(payload))) return false;

  const expiry = Number(expires);
  return Number.isFinite(expiry) && expiry > Date.now();
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
  return verifySessionToken(store.get(COOKIE)?.value);
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
