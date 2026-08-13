-- ═══════════════════════════════════════════════════════════════════════════
-- ELSHADAI CAKE CREATIONS — REVIEWS DATABASE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Run this once: Supabase dashboard → SQL Editor → paste → Run.
--
-- Everything is prefixed `cake_` because this Supabase project is shared with
-- another business. Nothing here touches any existing table.
--
-- The design principle is that the database enforces its own rules. The website
-- only ever holds the public key, so anything it is not allowed to do is
-- blocked here rather than in application code. A bug in the website cannot
-- expose a customer's email address.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── Who may manage cake reviews ────────────────────────────────────────────
-- In a shared project, "any signed-in user" is too broad — it would include
-- the other site's accounts. Access is granted by email, explicitly.

create table if not exists public.cake_admins (
  email text primary key
);

alter table public.cake_admins enable row level security;
-- Nobody may read or change this list through the API. It is managed here,
-- in the SQL editor, only.
revoke all on public.cake_admins from anon, authenticated;

/** True when the caller is signed in as a listed cake-site administrator. */
create or replace function public.is_cake_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cake_admins
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

grant execute on function public.is_cake_admin() to authenticated;


-- ── The table ──────────────────────────────────────────────────────────────

create table if not exists public.cake_reviews (
  id              uuid primary key default gen_random_uuid(),

  -- Shown publicly. Reduced to a first name and initial before it arrives.
  customer_name   text        not null check (char_length(customer_name) between 1 and 60),

  -- PRIVATE. Not selectable by the public role; see the grants below.
  customer_email  text        not null check (char_length(customer_email) between 3 and 160),

  cake_type       text        check (cake_type is null or char_length(cake_type) <= 80),
  cake_style      text        check (cake_style in ('personalised', 'classic', 'not-sure')),
  occasion        text        check (occasion is null or char_length(occasion) <= 60),

  rating          smallint    not null check (rating between 1 and 5),
  review_text     text        not null check (char_length(review_text) between 20 and 1500),

  -- A salted one-way hash of the submitter, for throttling. Never an address.
  submitter_hash  text        not null,

  -- New reviews are live immediately. The owner may hide one later.
  is_visible      boolean     not null default true,

  owner_response  text        check (owner_response is null or char_length(owner_response) <= 1000),

  created_at      timestamptz not null default now()
);

create index if not exists cake_reviews_visible_created_idx
  on public.cake_reviews (is_visible, created_at desc);

create index if not exists cake_reviews_submitter_idx
  on public.cake_reviews (submitter_hash, created_at desc);


-- ── Row level security ─────────────────────────────────────────────────────

alter table public.cake_reviews enable row level security;

-- Anyone may add a review, but only in a publishable state. A submission
-- cannot arrive pre-hidden, pre-answered, or with an invalid rating.
drop policy if exists "anyone may submit a cake review" on public.cake_reviews;
create policy "anyone may submit a cake review"
  on public.cake_reviews
  for insert
  to anon, authenticated
  with check (
    is_visible = true
    and owner_response is null
    and rating between 1 and 5
  );

-- The public may read visible reviews. The column grants below are what
-- actually keep the email address out of reach.
drop policy if exists "visible cake reviews are public" on public.cake_reviews;
create policy "visible cake reviews are public"
  on public.cake_reviews
  for select
  to anon, authenticated
  using (is_visible = true);

-- A listed administrator sees everything, including hidden reviews.
drop policy if exists "cake admin reads everything" on public.cake_reviews;
create policy "cake admin reads everything"
  on public.cake_reviews
  for select
  to authenticated
  using (public.is_cake_admin());

drop policy if exists "cake admin may update" on public.cake_reviews;
create policy "cake admin may update"
  on public.cake_reviews
  for update
  to authenticated
  using (public.is_cake_admin())
  with check (public.is_cake_admin());

drop policy if exists "cake admin may delete" on public.cake_reviews;
create policy "cake admin may delete"
  on public.cake_reviews
  for delete
  to authenticated
  using (public.is_cake_admin());


-- ── Column permissions ─────────────────────────────────────────────────────
-- This is the part that protects the email address. Even with a select policy
-- allowing the row, a role with no privilege on that column cannot read it —
-- the query fails rather than returning data.

revoke all on public.cake_reviews from anon, authenticated;

grant select (
  id, customer_name, cake_type, cake_style, occasion,
  rating, review_text, created_at, owner_response
) on public.cake_reviews to anon, authenticated;

-- Needed for the throttle and duplicate checks, which count rows only.
grant select (submitter_hash, is_visible) on public.cake_reviews to anon, authenticated;

grant insert (
  customer_name, customer_email, cake_type, cake_style,
  occasion, rating, review_text, submitter_hash, is_visible
) on public.cake_reviews to anon, authenticated;

-- Administrators additionally need the email column, and update/delete. Row
-- level security still restricts these to listed admins.
grant select (customer_email) on public.cake_reviews to authenticated;
grant update, delete on public.cake_reviews to authenticated;


-- ── Aggregate for the public summary ───────────────────────────────────────

create or replace view public.cake_review_summary
with (security_invoker = true) as
  select
    count(*)::int                       as count,
    coalesce(round(avg(rating), 1), 0)  as average
  from public.cake_reviews
  where is_visible = true;

grant select on public.cake_review_summary to anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- AFTER RUNNING THIS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. Create the owner account:
--      Authentication → Users → Add user
--      Enter the owner's email and a strong password, tick "Auto Confirm User"
--
-- 2. Grant it access, replacing the address with the one you just used:
--
--      insert into public.cake_admins (email) values ('owner@example.com');
--
-- 3. Stop anyone else creating an account:
--      Authentication → Providers → Email → turn OFF "Enable sign ups"
-- ═══════════════════════════════════════════════════════════════════════════
