/**
 * Pricing constants shared by the server and the screen.
 *
 * This file imports nothing. `orders.ts` is marked server-only so that an
 * accidental import into a client component fails the build rather than
 * shipping database code to a browser, and the pricing screen is a client
 * component that legitimately needs this one value. Keeping it here is the
 * same split `fields.ts` exists for.
 */

/**
 * The description stored against the single priced line.
 *
 * Pricing is one figure — what the cake costs — rather than a list the owner
 * has to assemble. The line still exists because a quote freezes its lines
 * into JSON and the customer's quote page renders them, so the shape the rest
 * of the system reads is unchanged; there is simply always exactly one.
 */
export const CAKE_LINE_DESCRIPTION = "Cake";

/**
 * The most a cake may be priced at, in pence.
 *
 * A misplaced decimal point turns £120 into £12,000, and a quote is a document
 * someone is asked to pay against. Refusing the impossible figure is cheaper
 * than explaining it afterwards.
 */
export const MAX_CAKE_PRICE_PENCE = 100_000_00;
