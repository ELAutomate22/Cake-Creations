# Elshadai Cake Creations

A presentation and portfolio website for **Elshadai Cake Creations**, a cake
business creating personalised and classic cakes for celebrations.

The site shows cakes, explains the styles offered, publishes customer reviews,
and provides contact details. **It is not a shop.** There is deliberately no
ordering, booking, quoting or payment of any kind — customers read the contact
details and get in touch directly.

---

## Contents

1. [Running it locally](#running-it-locally)
2. [Changing the words and pictures](#changing-the-words-and-pictures)
3. [Adding cake photographs](#adding-cake-photographs)
4. [Reviews](#reviews)
5. [The owner area](#the-owner-area)
6. [The opening sequence](#the-opening-sequence)
7. [How the security works](#how-the-security-works)
8. [Deploying](#deploying)
9. [Before launch — checklist](#before-launch--checklist)

---

## Running it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

Copy the example environment file and fill it in:

```bash
cp .env.example .env.local
```

Then start it:

```bash
npm run dev
```

The site runs at <http://localhost:3000>.

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the site locally with live reloading |
| `npm run build` | Builds the production version |
| `npm start` | Serves the built production version |
| `npm run lint` | Checks the code for problems |
| `npm run assets` | Turns photographs in `assets-source/` into optimised web images |

---

## Changing the words and pictures

**Almost everything you will want to change lives in one file:**

```
src/content/site.ts
```

That file holds the business name, the brand statement, contact details, the
carousel, the benefits list, the gallery cakes and the sample reviews. It is
written in plain language with comments explaining each part — you only need to
replace the text between the quote marks.

### Placeholders

Anything written like `[THIS]` is waiting for real information:

```ts
phone: {
  display: "[PHONE NUMBER]",
  dial: "[PHONE NUMBER]",
},
```

**Placeholders are hidden automatically.** While a contact detail is still a
placeholder, that row simply does not appear in the Contact panel — no broken
link is ever shown to a visitor. Fill it in and it appears.

To find everything still outstanding, search `src/content/site.ts` for `[`.

### The brand statement

The hero currently reads `[BRAND STATEMENT TO BE PROVIDED LATER]`. Replace
`business.brandStatement` when you have the final wording.

### The business name

The name must always read exactly **Elshadai Cake Creations**. It comes from
`business.name` in the content file, so changing it in that one place updates
the header, footer, contact panel, page titles and search-engine data together.

---

## Adding cake photographs

1. Put your full-size photographs in the `assets-source/` folder.
2. Run `npm run assets`.
3. Optimised copies appear in `public/cakes/` (or `public/media/` for anything
   named `intro-*` or `hero-*`), in several sizes and modern formats.

Your originals are never modified, so the highest-quality copy is always kept.

Then list each cake in `galleryCakes` in the content file:

```ts
{
  id: "amelia-first-birthday",
  src: "/cakes/amelia-first-birthday.jpg",
  alt: "A two-tier pale pink cake with hand-piped detail and a single candle",
  name: "Amelia's First Birthday",
  style: "personalised",        // or "classic"
  occasion: "birthday",         // must match an id in the occasions list
  description: "Soft pink buttercream with hand-piped shell detail.",
  flavour: "Vanilla sponge with raspberry",
  size: "tall",                 // "tall" | "wide" | "regular"
},
```

**The category filters build themselves** from the cakes you add. A category
with no photographs never appears, so a visitor can never click through to an
empty page.

`alt` matters: it is read aloud to visitors who cannot see the image, and search
engines use it. Describe the cake, not the file.

---

## Reviews

Customers leave reviews through the **Leave a Review** button. Valid reviews are
**published immediately** — there is no approval queue and nothing waits for you.

- The average rating and the review count are always calculated from the reviews
  currently visible to the public. Nothing is hard-coded.
- Hiding or deleting a review updates both figures straight away.
- **Email addresses are never published.** They are collected so you can contact
  a reviewer, and are visible only to you in the owner area.

Spam is handled without troubling the customer: a hidden field that only
automated scripts fill in, a check that the form was not completed impossibly
fast, link stripping, and limits of three reviews per person per day with a
minute between them.

---

## The owner area

The dashboard is at **`/admin`**. It is not linked from anywhere on the public
site and is excluded from search engines.

There you can search and filter every review, see the private email addresses,
hide a review, restore it, delete it (with confirmation), and reply publicly.

### Setting up your login — do this once

**Step 1. Create your account.**
In the [Supabase dashboard](https://supabase.com/dashboard) open your project,
go to **Authentication → Users → Add user**, and create a user with your email
address and a strong password. Tick *Auto Confirm User*.

**Step 2. Register that address as an owner.**
Go to **SQL Editor** and run this, with your own email address:

```sql
insert into public.cake_admins (email)
values ('you@example.com')
on conflict (email) do nothing;
```

You can now sign in at `/admin`.

Being signed in is **not** the same as being the owner. Only an address listed
in `cake_admins` can see private information or change anything — this is
enforced by the database itself, not just by the website.

To remove someone's access:

```sql
delete from public.cake_admins where email = 'them@example.com';
```

---

## The opening sequence

The first time someone arrives at the Home page in a browsing session, a cake is
presented, an elegant knife cuts down through its centre, and the screen opens
along that cut like curtains to reveal the site.

- It plays **once per session**, not on every page.
- There is a **Skip intro** button, and Escape skips it too.
- Visitors who ask their device to reduce motion get a calm split reveal with no
  knife and no movement.
- Without JavaScript it does not appear at all and the site works normally.

### Using a video instead of the drawn sequence

The sequence is currently drawn in code, built around the photograph in
`public/media/`. To use a real cake-cutting video instead, put the file in
`public/media/` and set it in the content file:

```ts
intro: {
  video: "/media/intro-cut.mp4",
  videoMobile: "/media/intro-cut-portrait.mp4",
  poster: "/media/intro-cake.webp",
  splitAtSeconds: 3.6,   // when the curtains open — match your video's cut
  durationSeconds: 6,
},
```

`splitAtSeconds` is the moment the knife finishes the cut in your video; the
curtains open then, so the two line up. Nothing else needs changing — the skip
button, the reduced-motion path and the once-per-session behaviour all keep
working.

The Home page hero video works the same way, under `media.hero`.

---

## How the security works

Worth knowing, because it is deliberately unusual:

**This website holds no key that can bypass database security.** There is no
service-role key in the environment file. Many Next.js projects ship one; if it
ever leaks, every record is exposed. Here it simply does not exist.

That is possible because:

- **Publishing a review** happens inside a database function that accepts only
  the fields a visitor may supply. A crafted request cannot set `is_visible` or
  attach an owner reply, because those are not parameters.
- **Throttling** lives in that same function, so it applies to every caller.
- **Email addresses** are protected by column privileges, not application code.
  The public role is not granted permission to read `customer_email` at all — a
  hand-written query asking for it is refused by the database.
- **Owner actions** run under your own login, and each one re-checks that you
  are a registered owner before doing anything.

Hiding a button is never what protects anything here.

---

## Deploying

The site runs on any host that supports Next.js. Vercel is the simplest.

1. Push the code to GitHub. `.env.local` is git-ignored and will not be included.
2. Import the repository into [Vercel](https://vercel.com/new).
3. Add the environment variables from `.env.example` in **Settings →
   Environment Variables**.
4. Deploy.

Then set your real domain in `business.url` in the content file, so the
search-engine data and sitemap point at the right place.

### Environment variables

| Name | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The public key. Safe in the browser — it cannot read email addresses |
| `REVIEW_HASH_SALT` | A long random string used to code submitter addresses for throttling. Keep it secret, and do not change it after launch |

---

## Before launch — checklist

**Content**

- [ ] Replace `[BRAND STATEMENT TO BE PROVIDED LATER]`
- [ ] Fill in the contact details — phone, email, WhatsApp, social links
- [ ] Fill in `[BUSINESS DESCRIPTION]`, `[BUSINESS LOCATION]`, `[SERVICE AREA]`
- [ ] Fill in collection, delivery, notice period and response hours
- [ ] Add real cake photographs and list them in `galleryCakes`
- [ ] Add photographs for the carousel, the introduction and the two cake-style
      sections
- [ ] Set `available: false` for any occasion you do not offer
- [ ] Check every `[PLACEHOLDER]` is gone: search `src/content/site.ts` for `[`

**Demonstration content**

- [ ] **Set `showSampleReviews` to `false`** in `src/content/site.ts`
- [ ] Confirm no review labelled *Example* appears on the live site

**Owner access**

- [ ] Create your Supabase user
- [ ] Add your email to `cake_admins`
- [ ] Sign in at `/admin` and confirm you can hide, restore, reply and delete
- [ ] Confirm `/admin` sends you to the login page when signed out

**Legal**

- [ ] Have the Privacy Policy and Cookie Policy checked by someone qualified
- [ ] Remove the "For the owner" notice from both pages once you are satisfied
- [ ] Confirm the allergy wording on the Website Information page is accurate

**Final checks**

- [ ] `npm run build` completes without errors
- [ ] Look at the site on a phone, a tablet and a laptop
- [ ] Leave a test review, confirm it appears, then delete it from `/admin`
- [ ] Confirm no cupcakes, cookies, brownies, pastries or other desserts appear
      anywhere — this business shows cakes only
- [ ] Confirm there is no Order, Book Now or Request a Quote button anywhere
- [ ] Set `business.url` to your real domain
