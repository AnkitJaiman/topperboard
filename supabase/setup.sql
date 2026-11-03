-- TopperBoard database setup
-- Supabase > SQL Editor > New query > ye poora paste karo > Run
-- Safe to run more than once.

create table if not exists listings (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  name        text not null check (char_length(name) between 1 and 40),
  url         text not null check (url ~* '^https?://' and char_length(url) <= 300),
  tagline     text check (char_length(tagline) <= 80),
  amount      integer not null,
  ref         text not null,
  order_id    text unique,
  payment_id  text,
  buyer_email text,   -- private: from Razorpay, never shown publicly
  buyer_phone text,   -- private: from Razorpay, never shown publicly
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);

-- Upgrades for databases created with an older version of this file
alter table listings add column if not exists buyer_email text;
alter table listings add column if not exists buyer_phone text;

-- Allowed categories (keep in sync with index.html and create-order)
alter table listings drop constraint if exists listings_category_check;
alter table listings add constraint listings_category_check check (category in
  ('influencer','creator','gaming','startup','d2c','music','college','coaching','teacher','fitness','food','local'));

-- pending = waiting for payment, paid = live on the board,
-- review = paid but needs owner check (e.g. amount mismatch), removed = taken down
alter table listings drop constraint if exists listings_status_check;
alter table listings add constraint listings_status_check check (status in ('pending','paid','review','removed'));

-- Bid limits: ₹99 to ₹1,00,000 (UPI-friendly)
alter table listings drop constraint if exists listings_amount_check;
alter table listings add constraint listings_amount_check check (amount between 99 and 100000);

create index if not exists listings_board on listings (category, status, amount desc);

-- When a listing becomes 'paid' (automatically or by you in Table Editor), stamp paid_at.
create or replace function listings_set_paid_at() returns trigger language plpgsql as $$
begin
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end $$;
drop trigger if exists listings_paid_at on listings;
create trigger listings_paid_at before insert or update of status on listings
  for each row execute function listings_set_paid_at();

-- ---------- Security ----------
alter table listings enable row level security;

-- Start from zero for public roles, then allow only what the site needs.
revoke all on listings from anon, authenticated;

-- Public can read only the public columns of paid listings.
grant select (id, category, name, url, tagline, amount, paid_at, status) on listings to anon, authenticated;
drop policy if exists "public can read paid listings" on listings;
create policy "public can read paid listings" on listings
  for select using (status = 'paid');

-- Backup UPI mode: anyone can submit a 'pending' listing; you approve it by setting status = 'paid'.
grant insert (category, name, url, tagline, amount, ref) on listings to anon;
drop policy if exists "anyone can submit a pending listing" on listings;
create policy "anyone can submit a pending listing" on listings
  for insert to anon with check (status = 'pending' and order_id is null and paid_at is null);

-- In Razorpay mode, listings are created and marked paid only by the Edge Functions (service role).
-- Once Razorpay is live you can close the UPI door (optional, recommended):
--   drop policy if exists "anyone can submit a pending listing" on listings;
--   revoke insert on listings from anon;

-- Daily check: paid but not live / stuck payments (run in SQL Editor)
--   select ref, name, category, amount, status, buyer_email, created_at
--   from listings where status in ('review','pending') and created_at > now() - interval '2 days'
--   order by created_at desc;
