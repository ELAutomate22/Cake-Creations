# Elshadai Cake Creations

The website for Elshadai Cake Creations — personalised and classic cakes for
meaningful occasions.

This is a showcase website. It deliberately **does not take orders**: there is
no basket, no checkout, no booking, no quote form and no enquiry form anywhere
in it. Customers browse the cakes, read reviews, leave their own, and get in
touch directly using the contact details.

---

## Getting started

```bash
npm install
npm run dev
```

The site runs at <http://localhost:3000>.

Everything works straight away except reviews, which need a database — see
below. Until then the reviews section says so plainly rather than breaking.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run assets` | Turn photographs into optimised web images |

---

## 1. Changing the words

**Everything customers read lives in one file: `src/content/site.ts`.**

You do not need to touch any other file to change wording, contact details or
cake listings. Open it and edit the text between the quote marks.

Anything written like `[THIS]` is a placeholder waiting for real information.
Search the file for `[` to find everything still to be filled in.

The website never shows a placeholder to a customer as though it were real. A
phone number left as `[PHONE NUMBER]` simply does not appear, and an image slot
with no photograph shows a labelled frame saying what belongs there.

Still to be provided:

- the brand statement shown under the business name on the Home page
- the business description
- contact person, phone, email, WhatsApp, location, service area
- collection and delivery information, response hours
- Instagram, Facebook and TikTok links
- all cake photography

---

## 2. Adding cake photographs

1. Put your photographs in `assets-source/`.
   - Name the main Home page image `hero-something.jpg`
   - Name the image above the footer `closing-something.jpg`
   - Name everything else whatever you like — those are treated as cakes
2. Run `npm run assets`
3. Add each cake to the `gallery.cakes` list in `src/content/site.ts`

The script writes several sizes of each photograph in modern formats, so phones
download small files and large screens get sharp ones. **Your originals are
never modified.**

A gallery entry looks like this:

```ts
{
  id: "ivory-three-tier",
  title: "Ivory Three Tier",
  style: "personalised",        // "personalised" or "classic"
  occasion: "wedding",          // an occasion id, or ""
  description: "…",
  flavour: "…",
  image: { src: "/cakes/ivory-three-tier.webp", alt: "…" },
  size: "feature",              // regular | tall | wide | feature
}
```

`size` controls how much room the cake takes in the layout. Use `feature`
sparingly — roughly one in every six or seven reads best.

Filters build themselves from the cakes that exist, so a category with no
photographs in it is never offered and no filter can lead to an empty page.

---

## 3. Connecting the database

Reviews and cake requests both live in **Cloudflare D1**. Reference photographs
live in **Cloudflare R2**. Without them the rest of the site works normally —
the reviews section says it is not connected, and the request form says
photographs cannot be received.

1. Copy `.env.example` to `.env.local` and fill it in
2. Apply the schema:

   ```bash
   npx wrangler d1 execute elshadai-cake-reviews --remote --file=db/d1/schema.sql
   npx wrangler d1 execute elshadai-cake-reviews --remote --file=db/d1/migrations/0001_orders.sql
   npx wrangler d1 execute elshadai-cake-reviews --remote --file=db/d1/migrations/0002_settings_seed.sql
   ```

3. Restart the dev server

Nobody signs in on this website — there is no login and no admin area. Reviews
are submitted by customers and appear immediately.

Everything is prefixed `cake_` or `order`, because this Cloudflare account is
shared with another business. The cake site has its own D1 database and its own
R2 bucket; nothing here touches the other one.

### How submissions are kept safe

Reviews publish **immediately** and cake requests are stored without review, so
the whole burden falls on the server:

- every submission is re-validated on the server, whatever the browser claimed
- text is stripped of markup and control characters before it is stored
- links are refused in reviews; genuine cake reviews essentially never have one
- a hidden field catches automated form-fillers
- reviews are limited to three per person per day, requests to five
- the same review text cannot be posted twice
- uploads are checked for type, extension, size and count, and then the first
  bytes are read and compared against the format claimed, so a script renamed
  to `.png` is refused

Customer email addresses are **never** sent to a browser. D1 has no row-level
security and no column privileges, so unlike the Postgres setup this replaced,
that guarantee now lives in application code: every read names the columns it
wants, and `src/lib/d1/client.ts` is marked `server-only` so an import into a
client component fails the build rather than shipping the API token.

The R2 bucket is private. Reference photographs are reachable only through
short-lived signed links, one object at a time — verified by confirming that an
unsigned request, a tampered signature and an anonymous bucket listing are all
refused.

---

## 4. Managing reviews and orders

There is no admin area on the website yet. Both are managed from the
**Cloudflare dashboard → D1 → elshadai-cake-reviews**, or from the command line:

```bash
npx wrangler d1 execute elshadai-cake-reviews --remote --command="SELECT * FROM orders"
```

Three review columns are worth knowing about:

| Column | What it does |
| --- | --- |
| `is_visible` | Set to `0` to hide a review from the website without deleting it |
| `owner_response` | Type a reply here and it appears beneath that review on the site |
| `customer_email` | Private. Never sent to a browser |

The website already renders `owner_response` and already hides anything with
`is_visible = 0`, so both work the moment you edit the row — no code change
needed.

Cake requests arrive with status `new_request`. The quote, payment and message
tables exist but are unused until Phase 2.

---

## 5. How it is built

Next.js App Router, React 19, Tailwind CSS 4, GSAP with ScrollTrigger,
Cloudflare D1 and R2.

```
src/
  app/
    (site)/        Home, Gallery, Order, Terms, Order policy, Privacy, Cookies
    api/reviews/   Review submission
    api/orders/    Cake requests
  components/
    home/          The Home page sections
    gallery/       Grid and lightbox
    reviews/       Reviews list and the review form
    contact/       Contact dialog
    order/         The cake request form and its field primitives
    layout/        Header, footer, shared state
    motion/        Scroll reveal and progress
    ui/            Image frame, modal
  content/
    site.ts        ALL wording and cake data
    order.ts       Wording for the request form and its policies
  lib/
    motion.ts      GSAP setup and shared scroll helpers
    reviews/       Validation, sanitising, types
    orders/        Validation and order-number generation
    d1/client.ts   Cloudflare D1 over its REST API
    r2/client.ts   Cloudflare R2 over its S3 API
db/d1/
  schema.sql       Reviews table
  migrations/      Ordering system
```

### Motion

Movement is tied to scroll position rather than played once on entry, and kept
restrained: 10–50px of travel, 2–8% image scale.

Sections mark elements with `data-reveal` and a shared handler does the rest.
Only the genuinely bespoke sequences own their own timelines — the hero, the
pinned Personalised/Classic sequence, the horizontal showcase, the closing
parallax.

The hidden starting state is applied by GSAP in a layout effect rather than by
a stylesheet. That means no flash before the animation, and — importantly — if
the JavaScript ever fails to run, the content is simply visible. Nothing is
left hidden waiting for an animation that is not coming.

`prefers-reduced-motion` removes parallax, pinning and moving typography
entirely, replacing them with plain content. The site stays fully functional.

### Accessibility

Dialogs and the mobile menu share one focus-trap contract: focus moves in on
open, Tab is trapped, Escape closes, the page behind cannot scroll, and focus
returns exactly where it started. No information is available only on hover —
the occasion list responds to keyboard focus as well, and gallery captions
appear on focus as well as hover.
