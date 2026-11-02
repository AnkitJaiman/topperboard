# 🏆 TopperBoard

India's pay-to-rank leaderboard. Bid to rank your brand, startup, coaching or influencer profile across categories. UPI payments, live rankings.

- **Live site files:** `index.html` (main page), `terms.html`, `privacy.html`, `refund.html`, `contact.html`
- **Database:** `supabase/setup.sql`
- **Automatic payments:** `supabase/functions/create-order` and `supabase/functions/razorpay-webhook`
- **Preview with sample data:** open `index.html?demo`

## Setup (aasaan steps)

### 1. Database (Supabase)
1. supabase.com par project banao (Region: Mumbai)
2. **SQL Editor** mein `supabase/setup.sql` paste karke **Run** dabao
3. **Project Settings → API** se `Project URL` aur `anon public` key copy karo
4. `index.html` ke `CONFIG` mein `SUPABASE_URL` aur `SUPABASE_ANON_KEY` bharo

### 2. Automatic payments (Razorpay)
1. Razorpay account banao aur KYC poora karo
2. Razorpay Dashboard → **Account & Settings → API Keys** se `Key ID` aur `Key Secret` lo
3. Supabase → **Edge Functions → Secrets** mein ye daalo:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET` (koi bhi lamba random password)
4. Supabase → **Edge Functions → Deploy a new function → Via Editor**:
   - `create-order`: `supabase/functions/create-order/index.ts` ka code paste karo
   - `razorpay-webhook`: `supabase/functions/razorpay-webhook/index.ts` ka code paste karo, aur **Enforce JWT verification** OFF karo
5. Razorpay → **Webhooks → Add**:
   - URL: `https://<project>.supabase.co/functions/v1/razorpay-webhook`
   - Secret: wahi `RAZORPAY_WEBHOOK_SECRET`
   - Event: `order.paid`
6. `index.html` ke `CONFIG` mein `RAZORPAY_KEY_ID` bharo

**Backup (Razorpay se pehle):** sirf `UPI_ID` bharo. Payment aane par Supabase → Table Editor → `listings` mein `status` ko `paid` kar do.

### 3. Website live karna (GitHub Pages)
Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / `(root)` → **Save**.
Site live hogi: `https://<username>.github.io/topperboard/`

### 4. Contact email
`terms.html`, `privacy.html`, `refund.html`, `contact.html` mein `YOUR_EMAIL@example.com` ko apne email se badlo.

## Rules
- Ranking sirf boli (bid) se hoti hai; har listing par uski rakam dikhti hai aur har board par "Ranked by bid amount" likha hota hai.
- Top 3 ko clickable link milta hai; baaki ka sirf naam aur rakam.
- Not allowed: betting/gambling, adult, dating/escort, investment schemes, impersonation, hate, illegal content.
