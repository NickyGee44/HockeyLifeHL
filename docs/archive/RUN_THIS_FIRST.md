# 🚀 RUN THIS FIRST

## Step 1: Run Supabase Setup (2 minutes)

1. Go to: **https://supabase.com/dashboard/project/ntplczcmhvfkijjxavdl/sql/new**

2. Copy the entire contents of this file:
   ```
   supabase/migrations/20260125_setup_realtime_and_storage.sql
   ```

3. Paste into the SQL Editor

4. Click **Run**

5. You should see: **"Success. No rows returned"**

**Done!** This enables:
- ✅ Real-time updates on games, player_stats, goalie_stats
- ✅ Storage buckets for league-logos, team-logos, player-avatars
- ✅ Proper RLS policies for security

---

## Step 2: Configure Stripe Connect (20 minutes)

Follow this guide **step-by-step**:
```
STRIPE_CONNECT_SETUP.md
```

It has:
- Screenshots of every screen
- Exact choices to make at each step
- How to get your API keys
- How to set up webhooks

---

## Step 3: Add Environment Variables

Add these to your `.env.local`:

```bash
# Stripe Connect (get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET_V2=whsec_xxxxx
STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS=whsec_xxxxx
STRIPE_SUBSCRIPTION_PRICE_ID=price_xxxxx

# App URL (for local dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to get these:** See `STRIPE_CONNECT_SETUP.md`

---

## Step 4: Test Everything

```bash
# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# Visit: http://localhost:3000
```

Then test the Stripe Connect flow:
1. Go to a league's settings page
2. Click "Connect Stripe"
3. Complete onboarding with test data
4. Create a product
5. Visit the storefront and test purchasing

---

## ✅ Checklist

- [ ] Ran Supabase migration
- [ ] Configured Stripe Connect (Platform mode, Express accounts)
- [ ] Got TEST API keys from Stripe Dashboard
- [ ] Created platform subscription price
- [ ] Set up 2 webhook endpoints
- [ ] Added all environment variables to .env.local
- [ ] Tested the integration

---

## 📚 Full Documentation

- **Quick Summary:** `SETUP_COMPLETE_SUMMARY.md`
- **Stripe Integration:** `STRIPE_CONNECT_INTEGRATION.md`
- **Stripe Setup:** `STRIPE_CONNECT_SETUP.md`
- **All Commands:** `SETUP_COMMANDS.md`

---

**That's it!** 🎉

The entire Stripe Connect integration is production-ready with:
- V2 Connect accounts
- Direct Charges with application fees
- Platform subscriptions
- Webhook handlers (thin events + regular events)
- UI components
- Real-time updates
- Secure storage

Just configure and test!
