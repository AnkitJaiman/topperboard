set client_min_messages = warning;
-- Topper Board database schema (PostgreSQL 14+ / Supabase)
-- Safe to run more than once: `npm run db:setup` or paste into Supabase > SQL Editor.

create table if not exists settings (
  key   text primary key,
  value integer not null
);
insert into settings (key, value) values
  ('min_bid', 99),          -- minimum first bid for a new listing (₹)
  ('min_increment', 10),    -- minimum top-up / amount above the next rank (₹)
  ('max_payment', 100000)   -- maximum single payment (₹), UPI-friendly
on conflict (key) do nothing;

create table if not exists listings (
  id            bigserial primary key,
  url           text not null,
  url_key       text not null,              -- normalised URL used to prevent duplicates
  domain        text not null,
  title         text not null,
  description   text not null default '',
  favicon_url   text,
  category      text not null,
  total_amount  bigint not null default 0,  -- cumulative verified bids (₹), never decreases
  first_paid_at timestamptz,
  last_bid_at   timestamptz,                -- time the current total was reached (tie-break)
  clicks_total  integer not null default 0,
  status        text not null default 'active' check (status in ('active','removed')),
  created_at    timestamptz not null default now()
);
create unique index if not exists listings_active_url on listings (url_key) where status = 'active';
create index if not exists listings_rank on listings (status, total_amount desc, last_bid_at asc);
create index if not exists listings_cat_rank on listings (category, status, total_amount desc, last_bid_at asc);

create table if not exists payments (
  id                  bigserial primary key,
  kind                text not null check (kind in ('new','topup')),
  listing_id          bigint references listings(id),
  draft               jsonb,                       -- listing details for a new listing, applied after payment
  amount              integer not null check (amount > 0),   -- ₹ (whole rupees)
  gateway             text not null default 'razorpay',
  razorpay_order_id   text not null unique,
  razorpay_payment_id text unique,
  status              text not null default 'created' check (status in ('created','paid','failed','review')),
  note                text,
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);
create index if not exists payments_paid on payments (status, paid_at);
create index if not exists payments_listing on payments (listing_id, status);

create table if not exists webhook_events (
  event_id    text primary key,
  event_type  text not null,
  received_at timestamptz not null default now()
);

create table if not exists activity (
  id          bigserial primary key,
  listing_id  bigint not null references listings(id),
  type        text not null check (type in ('new_listing','top_up','moved_up','new_number_one')),
  amount      integer,
  rank        integer,
  created_at  timestamptz not null default now()
);
create index if not exists activity_recent on activity (created_at desc);

create table if not exists clicks (
  listing_id   bigint not null references listings(id),
  visitor_hash text not null,                 -- anonymous, salted daily hash; no IP stored
  day          date not null,                 -- IST calendar day
  created_at   timestamptz not null default now(),
  primary key (listing_id, visitor_hash, day)
);
create index if not exists clicks_day on clicks (day);

create table if not exists rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);

-- Daily totals per listing, by IST calendar day (built from immutable paid payments, so history never disappears)
create or replace view daily_totals as
select (p.paid_at at time zone 'Asia/Kolkata')::date as day,
       p.listing_id,
       sum(p.amount)::bigint as amount,
       max(p.paid_at)        as last_paid_at
from payments p
where p.status = 'paid' and p.listing_id is not null
group by 1, 2;

-- Rank of one listing on the all-time board (1 = top). Ties: whoever reached the total first.
create or replace function listing_rank(p_listing_id bigint) returns integer
language sql stable as $$
  select 1 + count(*)::int
  from listings o, listings me
  where me.id = p_listing_id and o.status = 'active' and o.id <> me.id
    and (o.total_amount > me.total_amount
         or (o.total_amount = me.total_amount and o.last_bid_at < me.last_bid_at));
$$;

-- Apply a verified payment exactly once. Called by both the checkout verification and the webhook.
-- Returns json: {result: 'applied'|'already'|'unknown_order'|'amount_mismatch', listing_id, rank, total}
create or replace function apply_payment(p_order_id text, p_payment_id text, p_amount_paise bigint)
returns json language plpgsql as $$
declare
  pay        payments%rowtype;
  lst        listings%rowtype;
  old_top    bigint;
  old_rank   integer;
  new_rank   integer;
  d          jsonb;
  existing   bigint;
begin
  -- One payment at a time: keeps ranks and "new #1" events consistent under concurrent payments.
  perform pg_advisory_xact_lock(727001);

  select * into pay from payments where razorpay_order_id = p_order_id for update;
  if not found then
    return json_build_object('result','unknown_order');
  end if;
  if pay.status = 'paid' then
    return json_build_object('result','already','listing_id',pay.listing_id,
                             'rank',listing_rank(pay.listing_id));
  end if;
  if p_amount_paise <> pay.amount::bigint * 100 then
    update payments set status = 'review', razorpay_payment_id = coalesce(razorpay_payment_id, p_payment_id),
           note = 'amount mismatch: paid ' || p_amount_paise || ' paise' where id = pay.id;
    return json_build_object('result','amount_mismatch');
  end if;

  select id into old_top from listings where status = 'active'
   order by total_amount desc, last_bid_at asc limit 1;

  if pay.kind = 'new' then
    d := pay.draft;
    -- If the same URL got listed meanwhile, credit that listing instead of creating a duplicate.
    select id into existing from listings where url_key = d->>'url_key' and status = 'active' for update;
    if existing is not null then
      select * into lst from listings where id = existing;
      old_rank := listing_rank(lst.id);
    else
      insert into listings (url, url_key, domain, title, description, favicon_url, category)
      values (d->>'url', d->>'url_key', d->>'domain', d->>'title', coalesce(d->>'description',''),
              d->>'favicon_url', d->>'category')
      returning * into lst;
      old_rank := null;
    end if;
  else
    select * into lst from listings where id = pay.listing_id for update;
    if not found or lst.status <> 'active' then
      update payments set status = 'review', razorpay_payment_id = p_payment_id,
             note = 'listing not active at payment time' where id = pay.id;
      return json_build_object('result','listing_inactive');
    end if;
    old_rank := listing_rank(lst.id);
  end if;

  update listings
     set total_amount  = total_amount + pay.amount,
         last_bid_at   = clock_timestamp(),
         first_paid_at = coalesce(first_paid_at, clock_timestamp())
   where id = lst.id;

  update payments
     set status = 'paid', paid_at = clock_timestamp(), listing_id = lst.id,
         razorpay_payment_id = p_payment_id
   where id = pay.id;

  new_rank := listing_rank(lst.id);

  insert into activity (listing_id, type, amount, rank)
  values (lst.id, case when old_rank is null then 'new_listing' else 'top_up' end, pay.amount, new_rank);
  if new_rank = 1 and (old_top is null or old_top <> lst.id) then
    insert into activity (listing_id, type, amount, rank) values (lst.id, 'new_number_one', pay.amount, 1);
  elsif old_rank is not null and new_rank < old_rank then
    insert into activity (listing_id, type, amount, rank) values (lst.id, 'moved_up', pay.amount, new_rank);
  end if;

  return json_build_object('result','applied','listing_id',lst.id,'rank',new_rank,
                           'total',(select total_amount from listings where id = lst.id));
end $$;

-- Simple fixed-window rate limiter. Returns true when the call is allowed.
create or replace function rate_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean language plpgsql as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into rate_limits (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into c;
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;
  return c <= p_max;
end $$;

-- Lock the tables down for Supabase's public API roles: the app talks to Postgres directly from the server.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon, authenticated';
    execute 'alter table listings enable row level security';
    execute 'alter table payments enable row level security';
    execute 'alter table webhook_events enable row level security';
    execute 'alter table activity enable row level security';
    execute 'alter table clicks enable row level security';
    execute 'alter table rate_limits enable row level security';
    execute 'alter table settings enable row level security';
  end if;
end $$;
