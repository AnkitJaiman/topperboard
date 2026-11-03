# 🏆 TopperBoard

India's pay-to-rank leaderboard. Bid to rank your brand, startup, coaching or influencer profile across categories. UPI payments, live rankings.

- **Settings (sirf ye file bharni hai):** `config.js`
- **Pages:** `index.html` (main), `terms.html`, `privacy.html`, `refund.html`, `contact.html`
- **Database:** `supabase/setup.sql`
- **Automatic payments:** `supabase/functions/create-order`, `supabase/functions/razorpay-webhook`
- **Preview with sample data:** open `index.html?demo`

## Setup (aasaan steps)

### 0. Business details (launch se pehle zaroori)
`config.js` mein bharo: `LEGAL_NAME`, `CITY`, `ADDRESS`, `EMAIL`, `GRIEVANCE_OFFICER` (aur optional `PHONE`, `WHATSAPP`, `GSTIN`).
Jab tak ye khaali hain, legal pages par "[to be added]" dikhega aur Razorpay site approve nahi karega.

### 1. Database (Supabase)
1. supabase.com par project banao (Region: Mumbai)
2. **SQL Editor** mein `supabase/setup.sql` paste karke **Run** dabao (dobara chalana safe hai)
3. **Project Settings → API** se `Project URL` aur `anon public` key copy karo
4. `config.js` mein `SUPABASE_URL` aur `SUPABASE_ANON_KEY` bharo

> Free Supabase project 7 din bina use ke "pause" ho sakta hai. Launch ke baad dashboard check karte raho.

### 2. Automatic payments (Razorpay)
1. Razorpay account banao aur KYC poora karo
2. Pehle **Test Mode** mein: Dashboard → **Account & Settings → API Keys** se `Key ID` + `Key Secret`
3. Supabase → **Edge Functions → Secrets**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (koi bhi lamba random password)
4. Supabase → **Edge Functions → Deploy a new function → Via Editor**:
   - `create-order` ← `supabase/functions/create-order/index.ts`
   - `razorpay-webhook` ← `supabase/functions/razorpay-webhook/index.ts`
   - **Dono** functions mein **Enforce JWT verification = OFF**
5. Razorpay → **Webhooks → Add**: URL `https://<project>.supabase.co/functions/v1/razorpay-webhook`, Secret = `RAZORPAY_WEBHOOK_SECRET`, Event = `order.paid`
6. `config.js` mein `RAZORPAY_KEY_ID` bharo → test payment karo → listing board par aani chahiye
7. Sab theek ho to **Live Mode** keys se repeat karo

**Backup (Razorpay se pehle):** sirf `UPI_ID` bharo. Payment aane par Supabase → Table Editor → `listings` → `status` ko `paid` kar do.

### 3. Website live (GitHub Pages)
Repo → **Settings → Pages** → Source: **Deploy from a branch** → `main` / `(root)` → **Save**.
Site: `https://ankitjaiman.github.io/topperboard/`

### 4. Roz ka kaam (2 minute)
Supabase → SQL Editor → `setup.sql` ke end wali "Daily check" query chalao. `review` status = payment hua par amount match nahi hua → check karke `paid` karo ya refund do.

## Rules
- Ranking sirf boli (bid) se; har listing par rakam + "bid" label dikhta hai; board par "Paid rankings" likha hai.
- Top 3 ko clickable link (sponsored); baaki ka sirf naam aur rakam.
- Bid: ₹99 se ₹1,00,000. Naya bid = nayi listing (top-up nahi hota).
- Not allowed: betting/gambling/real-money gaming, adult, dating/escort, investment/crypto, doctors/medical claims, legal services, political ads, impersonation, hate, guaranteed-result claims, illegal content.
