import { createHash } from "node:crypto";

/**
 * Input cleaning for reviews.
 *
 * React escapes everything it renders, so this is not the only thing standing
 * between the site and an injected script — but storing clean text means the
 * data is safe wherever it later ends up, including a spreadsheet export or an
 * email notification that does not have React's escaping.
 */

/**
 * Control characters to strip: everything below space except newline (000A)
 * and tab (0009), plus DEL. Written as escapes so no literal control character
 * ever appears in this source file.
 */
const CONTROL_CHARACTERS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]",
  "g",
);

/** Strips markup, control characters and runaway whitespace. */
export function sanitiseText(value: string): string {
  return (
    value
      // Anything resembling a tag goes, rather than trying to allow "safe" ones.
      .replace(/<[^>]*>/g, "")
      // Entity forms, which would otherwise survive the strip above.
      .replace(/&lt;|&gt;|&#x?[0-9a-f]+;?/gi, " ")
      .replace(CONTROL_CHARACTERS, "")
      // Collapse long runs of blank lines and repeated spaces.
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

/**
 * Reduces a name to a first name and, at most, an initial.
 *
 * Reviews are published immediately and publicly, so a full name is more
 * personal data than the page actually needs.
 */
export function publicName(value: string): string {
  const cleaned = sanitiseText(value).replace(/\s+/g, " ").trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 0) return "Anonymous";
  if (parts.length === 1) return parts[0].slice(0, 40);
  return `${parts[0].slice(0, 30)} ${parts[1][0].toUpperCase()}.`;
}

/**
 * A one-way fingerprint of the submitter, used for rate limiting and duplicate
 * detection.
 *
 * The raw IP address is never stored. The salt means the hashes cannot be
 * reversed by testing every possible address.
 */
export function fingerprint(ip: string, salt: string): string {
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

/** Best-effort client address from the proxy headers. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
