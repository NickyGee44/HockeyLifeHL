# Stripe Connect Setup Guide - Step by Step

**Purpose:** Enable Stripe Connect Platform for multi-tenant league payments
**Time:** 15-20 minutes
**Mode:** Start with TEST mode, switch to LIVE later

---

## Part 1: Enable Stripe Connect (Platform Mode)

### Step 1: Go to Stripe Connect Settings

URL: https://dashboard.stripe.com/connect/accounts/overview

**What you'll see:**
- Page title: "Connect accounts"
- Big banner: "Get started with Connect"

---

### Step 2: Click "Get started with Connect"

**You'll be asked:** "What does your platform do?"

**Choose:** `Platforms and marketplaces`

**Click:** Continue

---

### Step 3: Platform Type Selection

**Question:** "How will your platform use Connect?"

**Options you'll see:**
1. Full-service platform (you handle everything)
2. Platform or marketplace (CHOOSE THIS ✅)
3. Crowdfunding platform

**Choose:** `Platform or marketplace`

**Why:** Each league collects their own payments, you facilitate the connection.

**Click:** Continue

---

### Step 4: Account Type Selection

**Question:** "What type of accounts do you want to create?"

**Options:**
1. **Express accounts** (Recommended - CHOOSE THIS ✅)
   - Simple onboarding (5 minutes for league owners)
   - Stripe handles compliance
   - Stripe-hosted onboarding
   - Less customization

2. **Custom accounts** (Don't choose)
   - Complex onboarding (30+ minutes)
   - You handle compliance
   - You build onboarding UI
   - Full customization

3. **Standard accounts** (Don't choose)
   - Leagues use their own Stripe account
   - Most complex setup

**Choose:** `Express accounts`

**Click:** Continue

---

### Step 5: Application Information

**Form fields:**

#### Application name
**Enter:** `HockeyLifeHL Multi-League Platform`

#### Application description
**Enter:** `SaaS platform connecting hockey leagues with their players, enabling stat tracking, payments, and league management.`

#### What will your platform charge fees for?
**Choose:** `Goods or services`

#### In what countries will you create accounts?
**Choose:** `United States` (add Canada later if needed)

#### Brand color (optional)
**Enter:** `#1E40AF` (HockeyLifeHL blue)

#### Icon/logo (optional)
**Action:** Skip for now (upload later)

**Click:** Continue

---

### Step 6: Branding & Loss Liability

**Question:** "Do you want to brand the Express Dashboard?"

**Choose:** `Yes, use my branding` ✅

**Why:** League owners will see "HockeyLifeHL" instead of "Stripe" during onboarding.

---

**Question:** "Who is liable for losses from disputes and refunds?"

**Options:**
1. **Application (you pay)** - CHOOSE THIS ✅
2. **Connected account (league pays)**

**Choose:** `Application`

**Why:**
- Safer for leagues (they won't be surprised by chargebacks)
- You have more control
- Better user experience
- You can set up dispute protection later

**Click:** Continue

---

### Step 7: Application Fee Structure

**Question:** "How will you charge application fees?"

**Info shown:**
- Application fees are how you make money from the platform
- Charged on top of Stripe's fees
- You can change this anytime

**For now:** Skip/Leave at 0%

**Why:**
- Focus on getting platform working first
- Add fees later when you have users
- Typical range: 1-5% application fee

**Click:** Continue

---

### Step 8: Review and Activate

**You'll see a summary:**
- Platform type: Marketplace
- Account type: Express
- Countries: United States
- Branding: Enabled
- Loss liability: Application

**Click:** `Activate Connect`

---

## Part 2: Get Your Stripe API Keys

### Step 9: Get TEST Mode Keys (Development)

1. **Ensure you're in TEST mode:**
   - Look for toggle in top right: "Test mode" should be ON (orange/yellow)
   - If it says "Live mode", click it to switch to Test mode

2. **Go to API Keys:**
   - URL: https://dashboard.stripe.com/test/apikeys

3. **Copy these keys:**

   **Publishable key** (starts with `pk_test_`)
   - Look for: "Publishable key"
   - Click **"Reveal test key"**
   - Click **"Copy"** button
   - Save to `.env.local` as: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`

   **Secret key** (starts with `sk_test_`)
   - Look for: "Secret key"
   - Click **"Reveal test key"**
   - Click **"Copy"** button
   - Save to `.env.local` as: `STRIPE_SECRET_KEY=sk_test_...`

---

### Step 10: Create Webhook Endpoint (TEST mode)

1. **Go to Webhooks:**
   - URL: https://dashboard.stripe.com/test/webhooks

2. **Click:** `Add endpoint`

3. **Endpoint URL:**
   - **For local development:** Use ngrok or Stripe CLI (see below)
   - **For Vercel preview:** `https://your-preview-url.vercel.app/api/webhooks/stripe`
   - **For production (later):** `https://hockeylifehl.app/api/webhooks/stripe`

   **For now, use Stripe CLI (easier for testing):**

4. **Install Stripe CLI** (if not already):
   ```powershell
   # Download from: https://github.com/stripe/stripe-cli/releases/latest
   # Or use scoop:
   scoop install stripe
   ```

5. **Login to Stripe CLI:**
   ```powershell
   stripe login
   ```
   - Opens browser
   - Click "Allow access"

6. **Forward webhooks to local dev:**
   ```powershell
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   **You'll see:**
   ```
   Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
   ```

   **Copy the `whsec_...` value** and add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

7. **Keep the Stripe CLI running** while developing locally.

---

### Alternative: Create Webhook via Dashboard

If you want to use Vercel preview URL instead of Stripe CLI:

1. **Endpoint URL:** `https://your-app.vercel.app/api/webhooks/stripe`

2. **Events to listen for:**
   - Click "Select events"
   - Search and select these:
     - `account.updated`
     - `account.application.deauthorized`
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Click:** `Add endpoint`

4. **Copy Signing Secret:**
   - Click on the webhook you just created
   - Click "Reveal" under "Signing secret"
   - Copy the `whsec_...` value
   - Add to `.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## Part 3: Test Stripe Connect

### Step 11: Test Account Connection Flow

Once your app is running with the keys configured, test the Connect flow:

1. **Create a test league** in your app

2. **Click "Connect Stripe"** in league settings

3. **You'll be redirected to Stripe Express onboarding**

4. **Fill in test data:**
   - Business name: `Test League Hockey`
   - Business type: Individual
   - Country: United States
   - Email: Use a test email
   - Phone: Use any 10-digit number
   - DOB: Any date (over 18)
   - SSN: Use `000000000` (test mode)
   - Address: Any US address
   - Bank account: Use test routing number `110000000`, any account number

5. **Submit the form**

6. **You'll be redirected back to your app**

7. **Check that:**
   - League's `stripe_account_id` is saved in database
   - Status shows as "active" or "pending"

---

## Part 4: Going Live (Do This Later)

When you're ready to accept real payments:

### Step 12: Activate Your Stripe Account

1. **Go to:** https://dashboard.stripe.com/account/onboarding

2. **Complete your account activation:**
   - Business details
   - Bank account for payouts
   - Identity verification
   - Tax information

### Step 13: Get LIVE Mode Keys

1. **Switch to LIVE mode** (toggle in top right)

2. **Go to:** https://dashboard.stripe.com/apikeys

3. **Copy LIVE keys:**
   - `pk_live_...` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `sk_live_...` → `STRIPE_SECRET_KEY`

4. **Update Vercel environment variables** with LIVE keys

### Step 14: Create LIVE Webhook

1. **Go to:** https://dashboard.stripe.com/webhooks

2. **Create webhook with:** `https://hockeylifehl.app/api/webhooks/stripe`

3. **Select same events** as test webhook

4. **Copy signing secret** → Update `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Part 5: Update Your .env.local

Add these lines to your `.env.local` file:

```bash
# Stripe Connect (TEST mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✅ Verification Checklist

- [ ] Stripe Connect enabled (Platform/Marketplace mode)
- [ ] Express accounts selected
- [ ] Branding enabled
- [ ] TEST mode publishable key copied
- [ ] TEST mode secret key copied
- [ ] Webhook endpoint created (Stripe CLI or dashboard)
- [ ] Webhook signing secret copied
- [ ] All keys added to .env.local
- [ ] Stripe CLI running (if using local webhooks)

---

## 🆘 Troubleshooting

### Issue: "Connect not available in your country"
**Solution:** Stripe Connect requires a US-based Stripe account. Contact Stripe support to enable.

### Issue: "Invalid API key"
**Solution:** Ensure you're using TEST keys (`pk_test_...` and `sk_test_...`) for development.

### Issue: "Webhook signature verification failed"
**Solution:**
- Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook's signing secret
- Don't use spaces or quotes in the .env.local value
- Restart your dev server after updating .env.local

### Issue: "Connected account not found"
**Solution:** You're probably using LIVE mode keys with a TEST mode `stripe_account_id`. Keep everything in TEST mode for now.

---

## 📚 Stripe Connect Resources

- **Dashboard:** https://dashboard.stripe.com/connect
- **Documentation:** https://stripe.com/docs/connect
- **Express accounts:** https://stripe.com/docs/connect/express-accounts
- **Testing:** https://stripe.com/docs/connect/testing
- **Webhook events:** https://stripe.com/docs/api/events/types

---

## Next Steps

After Stripe Connect setup:

1. ✅ Test the Connect flow with a test league
2. ✅ Verify webhook events are being received
3. ✅ Run database migrations
4. ✅ Launch Agent 2 to build the backend integration

---

**Note:** All league payments go directly to their connected Stripe account. You (the platform) never touch the money. This is safer and simpler for compliance.
