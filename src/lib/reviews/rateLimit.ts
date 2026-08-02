import { createHash } from "node:crypto";

/**
 * Submission throttling.
 *
 * The durable limits — three reviews per submitter per day, a minute between
 * submissions, and no duplicate text — live inside the `submit_cake_review`
 * database function, so they apply to every caller and survive restarts.
 *
 * What remains here is a fast in-process burst limiter that turns away a script
 * hammering the route before any database work is done at all.
 *
 * Submitters are identified by a SALTED HASH of their IP address, never the
 * address itself, so no raw personal data is stored.
 */

/** In-process burst limiter: at most this many requests per minute per hash. */
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 60 * 1000;

const burstBuckets = new Map<string, number[]>();

/**
 * Derives the submitter's identifier.
 *
 * The salt means the stored value cannot be reversed into an IP address, and
 * cannot be matched against hashes from any other system.
 */
export function hashSubmitter(ip: string): string {
  const salt = process.env.REVIEW_HASH_SALT ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Reads the client IP from the proxy headers set by Vercel or Netlify. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // The first entry is the original client; the rest are proxies.
    return forwarded.split(",")[0]!.trim();
  }
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "unknown";
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/** Fast, in-memory check. Catches bursts before any database work happens. */
export function checkBurst(hash: string): RateLimitResult {
  const now = Date.now();
  const recent = (burstBuckets.get(hash) ?? []).filter(
    (time) => now - time < BURST_WINDOW_MS,
  );

  if (recent.length >= BURST_LIMIT) {
    return {
      allowed: false,
      reason: "Too many attempts just now. Please wait a minute and try again.",
    };
  }

  recent.push(now);
  burstBuckets.set(hash, recent);

  // Keep the map from growing without bound on a long-running server.
  if (burstBuckets.size > 5000) {
    for (const [key, times] of burstBuckets) {
      if (times.every((time) => now - time > BURST_WINDOW_MS)) {
        burstBuckets.delete(key);
      }
    }
  }

  return { allowed: true };
}

/**
 * Turns an error raised by `submit_cake_review` into wording for the visitor.
 * Returns null when the error is not one of the throttling cases.
 */
export function throttleMessage(message: string): string | null {
  if (message.includes("rate_limit_daily")) {
    return "You have already left several reviews today. Thank you — please get in touch directly if you would like to add anything else.";
  }
  if (message.includes("rate_limit_gap")) {
    return "Please wait a moment before leaving another review.";
  }
  if (message.includes("duplicate_review")) {
    return "That review has already been published. Thank you.";
  }
  return null;
}
