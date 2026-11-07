# 🏆 Topper Board

**Pay More. Rank Higher. Get Seen.** India's pay-to-rank public leaderboard. Founded by Ankit Jaiman.

Users paste a website link, pick one of 30 categories and bid in rupees (from ₹99). After Razorpay confirms the payment, the listing is ranked by its total verified bid. Listings can increase their bid at any time and pay only the extra amount.

## What's inside

| Part | Where |
|---|---|
| Home: "Claim #1 for ₹X", bid box (− / amount / +), link, category dropdown, live rank preview | `app/page.tsx`, `components/BidBox.tsx` |
| Leaderboards: All-time and Today (IST), filter by category | `components/Board.tsx`, `app/leaderboards`, `app/c/[slug]` |
| Daily archive (every past IST day, kept forever) | `app/daily` |
| Listing page with stats and "Increase bid" | `app/l/[id]`, `components/TopUp.tsx` |
| Latest activity (new listing, bid increased, moved up, new #1) | `components/ActivityFeed.tsx` |
| Tracked outbound links (unique visitor per day, bots ignored, no IPs stored) | `app/go/[id]/route.ts` |
| Razorpay: order creation, signature check, payment confirmation, webhook | `app/api/orders`, `app/api/payments/verify`, `app/api/webhooks/razorpay` |
| Admin panel: revenue, listings, transactions, clicks, remove / edit listings, bid settings, daily history | `app/admin` |
| About, Rules, FAQ, Categories, Terms, Privacy, Refunds, Contact | `app/*` |
| Database (PostgreSQL / Supabase) with the atomic `apply_payment()` function | `db/schema.sql` |
| Tests: 16 backend + 5 browser tests (real Postgres + mock Razorpay) | `tests/` |

**Ranking rules:** All-time = cumulative verified bids (never decreases). Today = only what was paid today in India time, resets at midnight IST. Ties go to whoever reached the amount first. Nothing changes until Razorpay confirms the payment; each payment is applied exactly once even if the checkout callback and the webhook both arrive, or the webhook arrives twice.

## Environment variables

Copy `.env.example` to `.env.local` for local runs. On your host, add them in the project settings.

| Name | What it is | Secret? |
|---|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction pooler** (port 6543) | **Yes** |
| `RAZORPAY_KEY_ID` | Razorpay → Account & Settings → API Keys → Key ID | No (public) |
| `RAZORPAY_KEY_SECRET` | Razorpay → API Keys → Key Secret | **Yes** |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you type when creating the Razorpay webhook | **Yes** |
| `ADMIN_PASSWORD` | Password for `/admin` (10+ characters) | **Yes** |
| `APP_SECRET` | Any long random text (signs the admin cookie, hashes visitor IDs) | **Yes** |
| `NEXT_PUBLIC_SITE_URL` | Your site address, e.g. `https://topperboard.in` | No |

Never put secrets in the code or send them in chat. If a secret was ever shared, regenerate it in its dashboard.

## Launch steps (Hinglish, simple)

### 1. Database: Supabase (free)
1. https://supabase.com → **New project** → Region: **Mumbai (ap-south-1)** → ek strong database password rakho.
2. **SQL Editor → New query** → `db/schema.sql` ka poora text paste karo → **Run**. (Dobara chalana safe hai.)
3. **Project Settings → Database → Connection string → Transaction pooler** copy karo, `[YOUR-PASSWORD]` ki jagah apna password daalo. Ye `DATABASE_URL` hai.

### 2. Hosting
Next.js app ko server chahiye, isliye GitHub Pages se nahi chalega. Options:
- **Vercel** (sabse aasaan): https://vercel.com → Import GitHub repo `topperboard` → branch `nextjs-app` (ya main par merge karke) → Environment Variables daalo → **Deploy**. Note: Vercel ka free "Hobby" plan commercial use ke liye nahi hai; paise lene wali site ke liye **Pro** plan chahiye.
- **Netlify**: https://netlify.com → Add new site → GitHub repo → env vars → Deploy.

Deploy ke baad apna domain (jaise `topperboard.in`) host ki settings mein jodo aur `NEXT_PUBLIC_SITE_URL` update karo.

### 3. Razorpay
1. **API Keys**: Live mode mein Key ID + Key Secret → host ke env vars mein (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
2. **Webhooks → Add New Webhook**:
   - URL: `https://YOUR-DOMAIN/api/webhooks/razorpay`
   - Secret: koi lamba random text → wahi `RAZORPAY_WEBHOOK_SECRET` mein
   - Events: `payment.captured`, `payment.failed`
3. Razorpay → Settings → Payment Capture → **Automatic** rakho (code "authorized" payments ko khud bhi capture kar leta hai).
4. Pehle **Test Mode keys** se ek payment karo, board par listing aani chahiye. Phir Live keys lagao.

### 4. Admin
`https://YOUR-DOMAIN/admin` → `ADMIN_PASSWORD` se login. Yahan revenue, transactions, listings (remove / edit), clicks, daily history aur bid settings (minimum bid, increment, max payment) hain. "review" status wale payments check karke Razorpay se refund do.

## Run locally / tests
```bash
npm install
cp .env.example .env.local   # fill in values
npm run db:setup             # creates tables
npm run build && npm start
```
Tests need a local PostgreSQL you can create databases on, and Playwright for the browser tests:
```bash
TEST_PG=postgresql://postgres@127.0.0.1:5432 npm test
```
They use a mock Razorpay server; no real money moves.

## Security notes
- Prices, ranks and amounts are computed on the server; the browser can't change them.
- Payments count only after signature verification **and** confirmation from Razorpay's API (or a signed webhook).
- Duplicate webhooks are ignored (`webhook_events`), and payments are applied in one locked transaction.
- Rate limits on order creation, link lookups, verification and admin login.
- The link-preview fetcher refuses private/internal addresses (SSRF guard) and reads at most 512 KB.
- Admin cookie is HttpOnly, SameSite=Strict, signed and expires in 12 hours; admin forms check the request origin.
- Blocked words list for gambling, adult and scam listings; the admin can remove anything else.
