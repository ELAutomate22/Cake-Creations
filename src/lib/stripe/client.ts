import "server-only";
import Stripe from "stripe";

/**
 * Stripe.
 *
 * The secret key is server-only and this module is marked so, which means an
 * import from a client component fails the build rather than shipping the key
 * to a browser. Nothing in this project needs the publishable key: Checkout is
 * hosted by Stripe, so the browser is only ever redirected to a URL the server
 * created.
 */

const SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export function isStripeConfigured(): boolean {
  return Boolean(SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

/** True while pointed at test keys, so the interface can say so plainly. */
export function isStripeTestMode(): boolean {
  return Boolean(SECRET_KEY?.startsWith("sk_test_"));
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }

  client ??= new Stripe(SECRET_KEY, {
    // Pinned rather than floating: an account defaulting to a newer API
    // version should not silently change the shape of a webhook this code
    // depends on.
    apiVersion: "2026-08-26.dahlia",
    typescript: true,
  });

  return client;
}

/** Where Stripe sends the customer back to. */
export function appBaseUrl(): string {
  const configured = process.env.APP_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:3000";
}
