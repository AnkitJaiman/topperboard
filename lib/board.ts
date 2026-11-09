import { q, q1 } from "./db";
import { getSettings, Settings } from "./settings";
import { istDate } from "./util";

export type Row = {
  id: number; url: string; domain: string; title: string; description: string; favicon_url: string | null;
  category: string; amount: number; total_amount: number; clicks_total: number; created_at: string; rank: number;
};

const COLS = `l.id::int as id, l.url, l.domain, l.title, l.description, l.favicon_url, l.category, l.total_amount::int as total_amount,
  l.clicks_total, l.created_at`;

/** All-time board: cumulative verified bids. Ties go to whoever reached the total first. */
export async function allTime(category?: string, limit = 100): Promise<Row[]> {
  return q<Row>(
    `select ${COLS}, l.total_amount::int as amount,
            row_number() over (order by l.total_amount desc, l.last_bid_at asc)::int as rank
       from listings l
      where l.status = 'active' and l.total_amount > 0 and ($1::text is null or l.category = $1)
      order by l.total_amount desc, l.last_bid_at asc
      limit $2`, [category ?? null, limit]);
}

/** Board for one IST calendar day: only what each listing paid that day. */
export async function dayBoard(day: string, category?: string, limit = 100): Promise<Row[]> {
  return q<Row>(
    `select ${COLS}, d.amount::int as amount,
            row_number() over (order by d.amount desc, d.last_paid_at asc)::int as rank
       from daily_totals d join listings l on l.id = d.listing_id
      where d.day = $1::date and l.status = 'active' and ($2::text is null or l.category = $2)
      order by d.amount desc, d.last_paid_at asc
      limit $3`, [day, category ?? null, limit]);
}

export const todayBoard = (category?: string, limit?: number) => dayBoard(istDate(), category, limit);

export async function archiveDays(limit = 60): Promise<{ day: string; listings: number; amount: number }[]> {
  return q(`select to_char(d.day,'YYYY-MM-DD') as day, count(*)::int as listings, sum(d.amount)::int as amount
              from daily_totals d join listings l on l.id = d.listing_id and l.status = 'active'
             group by d.day order by d.day desc limit $1`, [limit]);
}

export type Activity = { id: number; type: string; amount: number; rank: number; created_at: string; listing_id: number; title: string; domain: string };
export async function recentActivity(limit = 12): Promise<Activity[]> {
  return q<Activity>(`select a.id::int as id, a.type, a.amount, a.rank, a.created_at, a.listing_id::int as listing_id, l.title, l.domain
                        from activity a join listings l on l.id = a.listing_id
                       where l.status = 'active' order by a.id desc limit $1`, [limit]);
}

export async function listing(id: number) {
  return q1<Row & { rank: number; category_rank: number; clicks_today: number; first_paid_at: string }>(
    `select ${COLS}, l.total_amount::int as amount, l.first_paid_at, listing_rank(l.id) as rank,
            (select 1 + count(*)::int from listings o where o.status='active' and o.category = l.category and o.id <> l.id
               and (o.total_amount > l.total_amount or (o.total_amount = l.total_amount and o.last_bid_at < l.last_bid_at))) as category_rank,
            (select count(*)::int from clicks c where c.listing_id = l.id and c.day = (now() at time zone 'Asia/Kolkata')::date) as clicks_today
       from listings l where l.id = $1 and l.status = 'active'`, [id]);
}

export async function summary(): Promise<{ listings: number; total: number; today: number }> {
  const r = await q1<{ listings: number; total: number; today: number }>(
    `select (select count(*)::int from listings where status='active' and total_amount > 0) as listings,
            (select coalesce(sum(total_amount),0)::int from listings where status='active') as total,
            (select coalesce(sum(amount),0)::int from daily_totals d join listings l on l.id=d.listing_id
              where l.status='active' and d.day = (now() at time zone 'Asia/Kolkata')::date) as today`);
  return r ?? { listings: 0, total: 0, today: 0 };
}

export type SiteStats = { visitors: number; revenue: number; topAmount: number; topTitle: string | null; topId: number | null;
  listed: number; addedToday: number; revenueToday: number };

/** Public numbers for the About page. */
export async function siteStats(): Promise<SiteStats> {
  const r = await q1<SiteStats>(
    `with t as (select (now() at time zone 'Asia/Kolkata')::date as d),
          top as (select id, title, total_amount from listings where status='active' and total_amount > 0
                  order by total_amount desc, last_bid_at asc limit 1)
     select (select count(*)::int from visits) as visitors,
            (select coalesce(sum(amount),0)::int from payments where status='paid') as "revenue",
            (select total_amount::int from top) as "topAmount",
            (select title from top) as "topTitle",
            (select id::int from top) as "topId",
            (select count(*)::int from listings where status='active' and total_amount > 0) as listed,
            (select count(*)::int from listings, t where status='active' and (first_paid_at at time zone 'Asia/Kolkata')::date = t.d) as "addedToday",
            (select coalesce(sum(amount),0)::int from payments, t where status='paid' and (paid_at at time zone 'Asia/Kolkata')::date = t.d) as "revenueToday"`);
  return r ?? { visitors: 0, revenue: 0, topAmount: 0, topTitle: null, topId: null, listed: 0, addedToday: 0, revenueToday: 0 };
}

export async function categoryCounts(): Promise<Record<string, { n: number; top: number }>> {
  const rows = await q<{ category: string; n: number; top: number }>(
    `select category, count(*)::int as n, max(total_amount)::int as top from listings where status='active' group by category`);
  return Object.fromEntries(rows.map((r) => [r.category, { n: r.n, top: r.top }]));
}

/** Price/position quote. All rules are enforced again on the server when the order is created. */
/** claimOne = price of #1 overall; categoryClaimOne = price of #1 within the category. */
export type Quote = { rank: number; categoryRank: number; claimOne: number; categoryClaimOne: number; min: number; total: number; settings: Settings };

export async function quote(amount: number, category: string, listingId?: number): Promise<Quote> {
  const s = await getSettings();
  let own = 0, ownCat = category;
  if (listingId) {
    const l = await q1<{ total_amount: number; category: string }>(
      `select total_amount::int as total_amount, category from listings where id=$1 and status='active'`, [listingId]);
    if (l) { own = l.total_amount; ownCat = l.category; }
  }
  const total = own + amount;
  const r = await q1<{ above: number; above_cat: number; top: number | null; cat_top: number | null }>(
    `select count(*) filter (where total_amount >= $1)::int as above,
            count(*) filter (where total_amount >= $1 and category = $2)::int as above_cat,
            max(total_amount)::int as top,
            (max(total_amount) filter (where category = $2))::int as cat_top
       from listings where status='active' and total_amount > 0 and ($3::bigint is null or id <> $3)`,
    [total, ownCat, listingId ?? null]);
  const top = r?.top ?? 0;
  const min = listingId ? s.min_increment : s.min_bid;
  const claimOne = Math.max(min, top ? top + s.min_increment - own : s.min_bid);
  const catTop = r?.cat_top ?? 0;
  const categoryClaimOne = Math.max(min, catTop ? catTop + s.min_increment - own : s.min_bid);
  return { rank: (r?.above ?? 0) + 1, categoryRank: (r?.above_cat ?? 0) + 1, claimOne, categoryClaimOne, min, total, settings: s };
}
