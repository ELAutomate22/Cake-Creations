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

## 3. Connecting reviews

Reviews need a Supabase database. Without one, everything else on the site
works normally.

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`,
   and run it
3. Copy `.env.example` to `.env.local` and fill in the three values
4. Restart the dev server

Nobody signs in on this website — there is no login and no admin area. Reviews
are submitted by customers and appear immediately.

All objects are prefixed `cake_` because this Supabase project is shared with
another business.

### How reviews are kept safe

Reviews publish **immediately** — there is no approval queue. That puts the
whole burden on validation, so:

- every submission is re-validated on the server, whatever the browser claimed
- text is stripped of markup and control characters before it is stored
- links are refused outright; genuine cake reviews essentially never contain one
- a hidden field catches automated form-fillers
- submissions are limited to three per person per day
- the same review text cannot be posted twice

The customer's email address is **never** shown publicly. That is enforced by
the database itself, not by application code: the public role has no privilege
on that column, so a query asking for it fails rather than returning data. A
mistake in the website cannot leak it — verified by asking for it directly and
getting `permission denied`.

There is deliberately **no service-role key** in this project.

---

## 4. Managing reviews

There is no admin area on the website. Reviews are managed directly in the
Supabase dashboard, under **Table Editor → cake_reviews**, where you can see
everything including the customer's email address.

Three columns are worth knowing about:

| Column | What it does |
| --- | --- |
| `is_visible` | Set to `false` to hide a review from the website without deleting it |
| `owner_response` | Type a reply here and it appears beneath that review on the site |
| `customer_email` | Private. Visible only here, never sent to a browser |

The website already renders `owner_response` and already hides anything with
`is_visible = false`, so both work the moment you edit the row — no code change
needed.

If you later want a proper admin screen on the website, the database side is
already prepared for it: `cake_admins` and the `is_cake_admin()` policies are
in place, so it is a front-end job only.

---

## 5. How it is built

Next.js App Router, React 19, Tailwind CSS 4, GSAP with ScrollTrigger,
Supabase.

```
src/
  app/
    (site)/        Home, Gallery, Privacy, Cookies
    api/reviews/   Review submission
  components/
    home/          The Home page sections
    gallery/       Grid and lightbox
    reviews/       Reviews list and the review form
    contact/       Contact dialog
    layout/        Header, footer, shared state
    motion/        Scroll reveal and progress
    ui/            Image frame, modal
  content/site.ts  ALL wording and cake data
  lib/
    motion.ts      GSAP setup and shared scroll helpers
    reviews/       Validation, sanitising, types
    supabase/      Database clients
supabase/schema.sql
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
