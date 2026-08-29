# Payments, email and retention — setting it up

Everything below is configuration you do yourself. No secret belongs in this
repository, and none of these values should be pasted into a chat, an issue or
a commit.

The site is hosted on **Netlify**, not Cloudflare Workers, so the Stripe webhook
is an application route and the nightly cleanup is a Netlify scheduled function.
Cloudflare provides the database (D1) and the image storage (R2) over their
APIs.

---

## 1. Environment variables

Set these in **Netlify → Site configuration → Environment variables**, and the
same values in `.env.local` for local development. Scope them to all contexts.

| Variable | What it is |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id — already set |
| `CLOUDFLARE_D1_DATABASE_ID` | The `elshadai-cake-reviews` database — already set |
| `CLOUDFLARE_API_TOKEN` | D1 · Edit token — already set |
| `R2_BUCKET_NAME` | `elshadai-order-images` — already set |
| `R2_ACCESS_KEY_ID` | R2 API token access key — already set |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret — already set |
| `REVIEW_HASH_SALT` | Salts the address hashes used for rate limiting — already set |
| `ADMIN_PASSWORD` | Signs in to `/admin` |
| `ADMIN_SESSION_SECRET` | Signs the admin session cookie |
| `STRIPE_SECRET_KEY` | Stripe secret key. Test key first |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint |
| `APP_BASE_URL` | `https://elshadai-cake-creations.netlify.app`, or the live domain |
| `CRON_SECRET` | Any long random string; protects the cleanup endpoint |
| `RESEND_API_KEY` | Resend API key |
| `FROM_EMAIL` | Sending address on a domain verified in Resend |
| `FROM_NAME` | `Elshadai Cake Creations` |

Generate the random ones with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`STRIPE_PUBLISHABLE_KEY` is not needed. Checkout is hosted by Stripe, so the
browser is only ever redirected to a URL the server created — no Stripe code
runs in the page.

---

## 2. Stripe, in test mode

1. Create the account, or sign in. **Keep test mode on** (the toggle in the
   dashboard) until you have run the checks in section 6.
2. **Developers → API keys** → copy the **Secret key** (`sk_test_…`) into
   `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://YOUR-DOMAIN/api/stripe/webhook`
   - Events: **`checkout.session.completed`** only. Nothing else is used, and
     subscribing to more means handling events that have no code behind them.
4. Copy the **Signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
5. Redeploy. Environment changes do not reach a build that already ran.

Test cards: `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.
`4000 0000 0000 0002` is declined, which is worth trying once.

**Receipts.** Stripe can email its own receipt (**Settings → Emails**). That is
Stripe's, not the application's, and does not count as one of the three
workflow emails. Turn it on or off as you prefer.

### Testing the webhook locally

The webhook needs to be reachable from the internet, so a local server needs a
tunnel:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

`stripe listen` prints its own `whsec_…` — use that as `STRIPE_WEBHOOK_SECRET`
locally. It is different from the dashboard one.

---

## 3. Resend

1. **Domains → Add domain**, and add the DNS records it gives you. Sending from
   an unverified domain will be rejected.
2. **API Keys → Create**, sending permission is enough → `RESEND_API_KEY`.
3. `FROM_EMAIL` must be on the verified domain.

Without these the site still works: every message is recorded with a status of
`not_configured` and the admin page offers **Retry this email**. Nothing is
silently dropped.

---

## 4. The nightly cleanup

`netlify/functions/purge.mts` runs at 03:07 UTC daily and calls
`/api/cron/purge` with `CRON_SECRET`. Netlify picks up the schedule from the
function itself — there is nothing to configure beyond setting `APP_BASE_URL`
and `CRON_SECRET`.

Check it after a deploy under **Netlify → Functions → purge**, or run it by
hand:

```bash
curl -X POST https://YOUR-DOMAIN/api/cron/purge -H "x-cron-secret: YOUR_CRON_SECRET"
```

It answers with counts only.

**What it deletes.** An order 30 days after it *closed* — completed, cancelled,
declined or refunded — along with its quotes, items, messages, activity,
payment rows, access tokens and its reference images in R2.

**What it never deletes.** An order that is still active, however old. The 30
days are counted from the terminal timestamp, never from the date the request
came in, because a wedding cake ordered a year ahead is live work for a year.

Stripe keeps its own payment records under its own retention rules. This
application does not, and should not, delete those.

---

## 5. Going live

Do this only once the test-mode checks below have passed.

1. Stripe dashboard → turn **test mode off**.
2. **Developers → API keys** → copy the **live** secret key (`sk_live_…`).
3. **Developers → Webhooks** → add the endpoint again in live mode. Live and
   test webhooks are separate, and a live payment will not reach a test
   endpoint.
4. Copy the **live** signing secret.
5. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Netlify, together,
   and redeploy. A live key with a test webhook secret means every real payment
   is rejected at the door.
6. Point `APP_BASE_URL` at the live domain.
7. Take one real payment for a small amount, confirm it appears in the admin
   payment history, then refund it in Stripe.

The admin order page says **Stripe is in test mode** while test keys are in
use, so you can tell at a glance which you are on.

---

## 6. Manual end-to-end check

Roughly fifteen minutes, in test mode, with a real email address you can read.

1. Send a cake request through `/order`, attaching one photograph.
2. `/admin` → open the order → **Reviewing**.
3. Change one detail. Confirm the **Original request** section still shows what
   the customer sent.
4. Add line items → **Save line items** → **Save quote version**.
5. **Send quote to customer**. Check the email arrives with a
   *Review quote & pay deposit* button.
6. Open the link. Check the deposit figure, and that the button stays disabled
   until the non-refundable box is ticked.
7. Pay with `4242 4242 4242 4242`. The success page should say the payment is
   being confirmed, then that it was received.
8. Check: the order reads **Deposit paid**, the banner says
   **DEPOSIT PAID — NON-REFUNDABLE**, and the confirmation email has arrived.
9. Raise the total by editing the items and saving a new quote. Confirm the
   deposit stays what was paid and the outstanding figure absorbs the increase.
10. **In progress** → **Ready** → **Request final payment**. Check the email,
    and that the amount matches the outstanding figure.
11. Pay the balance. The order should become **Paid in full**, with **no**
    fourth email.
12. Mark **Completed** by hand.
13. Optional: set `completed_at` back 31 days in D1 and run the cleanup. The
    order, its rows and its R2 image should all disappear.

---

## 7. Things worth knowing

**The browser never sets an amount.** Every Checkout session is built from a
figure read out of D1 immediately beforehand. A link opened three weeks later
charges what is owed today, not what was owed when the email was sent.

**Only the webhook records a payment.** The success page proves a browser was
redirected, not that a card was charged, so it asks the server and reports what
the verified webhook wrote.

**Payments already taken are never recalculated.** Outstanding is the current
total minus what was actually paid. Raising a total after a deposit moves the
difference into the balance and leaves the deposit alone.

**A real payment is never rolled back because email failed.** If a confirmation
cannot be sent, the payment stays paid and the admin page offers a retry.

**There are exactly three automated emails**: the quote, the deposit
confirmation, and the final payment request. Custom messages are separate and
only ever sent when the owner writes one.

**There is no refund button.** The deposit is non-refundable under the accepted
policy, so a refund is an exception made deliberately in Stripe. The admin page
only records that it happened.
