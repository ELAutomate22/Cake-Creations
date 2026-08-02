/**
 * Review text sanitisation.
 *
 * Reviews are plain prose. No markup of any kind is meaningful in them, so
 * rather than trying to allow a "safe" subset of HTML, everything that looks
 * like markup is removed outright. React escapes on render as well, so this is
 * defence in depth rather than the only line of protection.
 */

/**
 * Zero-width, bidirectional-override and other format characters. These can be
 * used to hide text or reverse its apparent order, so they are stripped.
 * Written as escape sequences so the source stays readable and copy-safe.
 */
const INVISIBLE_AND_BIDI = new RegExp(
  "[" +
    "\\u00AD" + //           soft hyphen
    "\\u200B-\\u200F" + //   zero-width space/joiners, LTR/RTL marks
    "\\u202A-\\u202E" + //   bidirectional embedding and overrides
    "\\u2060-\\u2064" + //   word joiner, invisible operators
    "\\u2066-\\u206F" + //   bidirectional isolates, deprecated formatting
    "\\uFEFF" + //           byte order mark
    "]",
  "g",
);

/** Anything resembling a tag, entity or protocol handler. */
const MARKUP = /<[^>]*>?/g;
const HTML_ENTITY = /&(?:#x?[0-9a-f]+|[a-z]+);/gi;

/** Bare and protocol-prefixed links. Reviews have no legitimate use for them. */
const URL_LIKE =
  /\b(?:(?:https?|ftp|file|data|javascript|vbscript):\S+|www\.\S+|\S+\.(?:com|co\.uk|net|org|io|ru|cn|xyz|top|shop|info|biz)\b\S*)/gi;

/**
 * Cleans a free-text field submitted by a visitor.
 *
 * Strips markup, entities, invisible characters and links; collapses runaway
 * whitespace; and trims. Returns plain text safe to store and display.
 */
export function sanitiseText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(INVISIBLE_AND_BIDI, "")
    .replace(MARKUP, "")
    .replace(HTML_ENTITY, "")
    .replace(URL_LIKE, "")
    // Collapse three or more blank lines down to a single paragraph break.
    .replace(/\n{3,}/g, "\n\n")
    // Collapse runs of spaces and tabs, but keep single newlines intact.
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

/**
 * Cleans a short single-line field such as a name or occasion.
 * Same rules as above, plus newlines are removed entirely.
 */
export function sanitiseLine(input: string): string {
  return sanitiseText(input)
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

/** Normalises an email for storage and comparison. */
export function normaliseEmail(input: string): string {
  return input.trim().toLowerCase().replace(INVISIBLE_AND_BIDI, "");
}

/**
 * Flags text that looks like automated spam.
 *
 * Both the original and the cleaned text are needed: a submission that was
 * mostly links is only visible as such by comparing the two lengths.
 *
 * Deliberately conservative — it is far worse to reject a real customer's
 * review than to let an occasional odd one through, since the owner can hide
 * anything unwanted from /admin afterwards.
 */
export function looksLikeSpam(original: string, cleaned: string): boolean {
  const lower = original.toLowerCase();

  // More than half the submission disappeared during cleaning, which means it
  // was largely links or markup.
  if (original.length > 0 && cleaned.length / original.length < 0.5) {
    return true;
  }

  // Common bulk-submission markers.
  const spamMarkers = [
    "[url=",
    "[link=",
    "buy now",
    "viagra",
    "casino",
    "crypto investment",
    "seo services",
    "backlinks",
    "telegram.me",
    "bit.ly",
  ];
  if (spamMarkers.some((marker) => lower.includes(marker))) return true;

  // A single character repeated to pad the review out to the minimum length.
  if (/(.)\1{9,}/.test(cleaned)) return true;

  // A long body of text with almost no word breaks.
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  if (cleaned.length > 120 && words.length < 8) return true;

  return false;
}
