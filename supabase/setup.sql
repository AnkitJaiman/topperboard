-- TopperBoard database setup
-- Supabase > SQL Editor > New query > ye poora paste karo > Run

create table if not exists listings (
  id         uuid primary key default gen_random_uuid(),
  category   text not null check (category in ('influencer','creator','coaching','teacher','startup','fitness','food','clinic','local')),
  name       text not null check (char_length(name) between 1 and 40),
  url        text not null check (url ~* '^https?://' and char_length(url) <= 300),
  tagline    text check (char_length(tagline) <= 80),
  amount     integer not null check (amount between 99 and 10000000),
  ref        text not null,
  order_id   text unique,
  payment_id text,
  status     text not null default 'pending' check (status in ('pending','paid','removed')),
  created_at timestamptz not null default now(),
  paid_at    timestamptz
);
create index if not exists listings_board on listings (category, status, amount desc);

alter table listings enable row level security;

-- Public sirf paid listings dekh sakti hai (ref, order_id jaise private columns nahi)
revoke select on listings from anon, authenticated;
grant select (id, category, name, url, tagline, amount, paid_at, status) on listings to anon, authenticated;
create policy "public can read paid listings" on listings
  for select using (status = 'paid');

-- Backup UPI mode: koi bhi 'pending' listing bhej sakta hai, aap admin se 'paid' karte ho
grant insert (category, name, url, tagline, amount, ref) on listings to anon;
create policy "anyone can submit a pending listing" on listings
  for insert to anon with check (status = 'pending' and order_id is null and paid_at is null);

-- Razorpay mode mein listings Edge Functions (service role) se bante aur paid hote hain.
