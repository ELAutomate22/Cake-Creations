import { brandStatements, business, isProvided } from "@/content/site";

/**
 * Picks the line that sits beneath the business name in the hero.
 *
 * Called during server rendering, once per request, and the result is handed
 * to the hero as a prop. That ordering matters: choosing on the client would
 * either mismatch the server's HTML during hydration, or swap the line in front
 * of the visitor a moment after the page appeared. Choosing on the server means
 * the right line is in the very first byte of HTML, works with JavaScript
 * turned off, and still changes on every refresh because the Home page is
 * rendered per request rather than built once.
 *
 * If a fixed `business.brandStatement` has been filled in, that always wins.
 */

/**
 * The last line served by this instance.
 *
 * Held in module scope so a refresh cannot repeat the line it just showed —
 * pure random would do that roughly one visit in twenty, which reads as though
 * the rotation is broken. Instances are recycled between requests, so this
 * usually survives; when it does not, the only cost is that a repeat becomes
 * possible again, and nothing depends on it being correct.
 */
let previous = -1;

export function pickBrandStatement(): string {
  // An explicit statement overrides the rotation entirely.
  if (isProvided(business.brandStatement)) return business.brandStatement;

  if (brandStatements.length === 0) return "";
  if (brandStatements.length === 1) return brandStatements[0];

  // Choose from every line except the one shown last, so consecutive refreshes
  // always differ.
  const choices = brandStatements.length - (previous >= 0 ? 1 : 0);
  let index = Math.floor(Math.random() * choices);
  if (previous >= 0 && index >= previous) index += 1;

  previous = index;
  return brandStatements[index];
}
