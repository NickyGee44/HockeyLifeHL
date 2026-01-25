# 💳 Stripe Setup Guide for HockeyLifeHL

**Purpose:** Configure Stripe payment processing for league payments
**Model:** League owner provides their own Stripe API keys
**Date:** January 2026

---

## 📋 **Overview**

HockeyLifeHL integrates with Stripe to allow league owners to collect payments from players. Each league owner sets up their own Stripe account and provides the API keys to the platform.

**Payment Flow:**
1. League owner creates Stripe account
2. Owner provides API keys to platform admin
3. Platform admin configures keys in environment variables
4. Players can pay via Stripe checkout
5. Money goes directly to league owner's Stripe account

---

## 🎯 **For League Owners: Getting Your Stripe Keys**

### **Step 1: Create Stripe Account**

1. Go to [stripe.com](https://stripe.com)
2. Click "Start Now" or "Sign Up"
3. Complete registration:
   - Business email
   - Business name (e.g., "HockeyLifeHL")
   - Country (Canada or USA)

4. Verify email address

---

### **Step 2: Complete Business Profile**

1. Login to Stripe Dashboard
2. Complete business profile:
   - Business type (Individual or Company)
   - Business description: "Recreational hockey league"
   - Tax ID (if applicable)
   - Bank account details (for payouts)

**Important:** You must complete this to receive payments!

---

### **Step 3: Get Your API Keys**

1. In Stripe Dashboard, click **Developers** → **API Keys**

2. You'll see two types of keys:
   - **Test keys** (for testing) - start with `sk_test_`
   - **Live keys** (for production) - start with `sk_live_`

3. **For Testing (Development):**
   Copy these keys:
   ```
   Publishable key: pk_test_...
   Secret key: sk_test_...
   ```

4. **For Production (Live Payments):**
   - Activate your account (complete business profile)
   - Copy these keys:
   ```
   Publishable key: pk_live_...
   Secret key: sk_live_...
   ```

**⚠️ Security:** Never share your secret key publicly!

---

### **Step 4: Create Webhook Secret**

Webhooks notify your platform when payments succeed/fail.

1. In Stripe Dashboard, click **Developers** → **Webhooks**
2. Click **Add Endpoint**
3. Enter endpoint URL:
   - **Development:** `https://your-dev-url.com/api/webhooks/stripe`
   - **Production:** `https://hockeylifehl.com/api/webhooks/stripe`

4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`

5. Click **Add Endpoint**

6. Copy the **Signing Secret**: `whsec_...`

---

### **Step 5: Provide Keys to Platform Admin**

Send these keys securely (via encrypted email or password manager):

```
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```

**⚠️ Security Tips:**
- Use encrypted email or password manager (1Password, LastPass)
- Never send via plain text SMS or messaging apps
- Rotate keys if compromised
- Use test keys for development, live keys for production

---

## 🔧 **For Platform Admins: Configuring Stripe**

### **Step 1: Add Environment Variables**

Add the keys provided by the league owner to your environment:

**Local Development (`.env.local`):**
```env
# Stripe Keys (from league owner)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Production (Vercel/Hosting Platform):**
1. Go to project settings
2. Navigate to Environment Variables
3. Add the same variables as above
4. **Use live keys for production!**

---

### **Step 2: Verify Stripe Integration**

1. Start dev server: `npm run dev`
2. Login as league owner
3. Navigate to **Admin → Payments**
4. Click **Add Payment** → **Pay with Stripe**
5. Use Stripe test card:
   ```
   Card: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```

6. Submit payment
7. Verify payment appears in:
   - Platform payment list
   - Stripe Dashboard → Payments

**✅ Success:** If payment shows in both places, integration works!

---

### **Step 3: Test Webhooks**

1. Make a test payment (as above)
2. Check application logs for webhook receipt:
   ```
   Stripe webhook received: checkout.session.completed
   Payment confirmed for player: [player-id]
   ```

3. Verify in Stripe Dashboard:
   - **Developers → Webhooks**
   - Click your endpoint
   - Check "Recent Deliveries"
   - Should see successful deliveries

**⚠️ If Webhooks Fail:**
- Check endpoint URL is correct
- Verify webhook secret matches
- Check application logs for errors
- Test webhook with Stripe CLI

---

## 💰 **Payment Amounts & Pricing**

### **Recommended Season Fees:**

| League Type | Suggested Fee | Notes |
|-------------|--------------|--------|
| Recreational | $200-$400 | Per player, per season |
| Competitive | $400-$800 | Includes playoffs |
| Drop-in | $20-$40 | Per game |

**Configure in Platform:**
1. Admin → Seasons → Create/Edit Season
2. Set "Season Fee" amount
3. This becomes default for Stripe checkout

---

## 🔄 **Payment Workflows**

### **Workflow 1: Stripe Checkout (Recommended)**

**Flow:**
1. Player clicks "Pay Now" in their dashboard
2. Redirected to Stripe Checkout page
3. Enters card details
4. Payment processed by Stripe
5. Webhook confirms payment
6. Player marked as paid in database

**Advantages:**
- ✅ PCI compliant (you don't handle cards)
- ✅ Secure
- ✅ Automatic receipt emails
- ✅ Mobile-friendly

---

### **Workflow 2: Manual Payment Entry**

**Flow:**
1. Player pays owner via cash/e-transfer
2. Owner logs into Admin → Payments
3. Clicks "Add Payment"
4. Selects player, amount, method
5. Saves payment record

**Advantages:**
- ✅ Works for non-card payments
- ✅ Flexible
- ✅ No Stripe fees

**Use Cases:**
- Cash payments at games
- E-transfer payments
- Check payments

---

## 💵 **Stripe Fees**

**Standard Pricing:**
- **2.9% + $0.30** per successful card charge

**Example:**
- Season fee: $300
- Stripe fee: $300 × 0.029 + $0.30 = **$9.00**
- League receives: **$291.00**

**Tips to Minimize Fees:**
1. Encourage larger payments (season vs. per-game)
2. Offer discounts for e-transfer/cash
3. Pass fees to players (add $10 Stripe fee to checkout)

---

## 🔐 **Security Best Practices**

### **For League Owners:**

1. **Never share secret keys publicly**
   - Don't commit to Git
   - Don't paste in public Slack/Discord
   - Don't email without encryption

2. **Use test keys for development**
   - Only use live keys in production
   - Test thoroughly before going live

3. **Rotate keys if compromised**
   - Stripe Dashboard → Developers → API Keys → Roll Secret Key

4. **Enable 2FA on Stripe account**
   - Stripe Dashboard → Settings → Team & Security

5. **Monitor payments regularly**
   - Check Stripe Dashboard weekly
   - Verify payments match platform records

---

### **For Platform Admins:**

1. **Secure environment variables**
   - Never commit `.env.local` to Git
   - Use `.gitignore` to exclude `.env*`
   - Use hosting platform's secret management

2. **Verify webhook signatures**
   - Code already validates `STRIPE_WEBHOOK_SECRET`
   - Don't disable signature verification

3. **Use HTTPS in production**
   - Stripe requires HTTPS for webhooks
   - Vercel/Netlify provide free SSL

4. **Log payment events**
   - Already implemented in codebase
   - Monitor logs for suspicious activity

---

## 🧪 **Testing Checklist**

### **Test Card Numbers (Provided by Stripe)**

| Card Number | Type | Result |
|-------------|------|--------|
| 4242 4242 4242 4242 | Visa | Success |
| 4000 0000 0000 0002 | Visa | Decline |
| 4000 0000 0000 9995 | Visa | Insufficient funds |
| 5555 5555 5555 4444 | Mastercard | Success |
| 3782 822463 10005 | Amex | Success |

**All test cards:**
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

---

### **Test Scenarios**

**✅ Test 1: Successful Payment**
1. Player selects "Pay with Stripe"
2. Uses test card 4242...
3. Payment succeeds
4. Player marked as paid
5. Receipt email sent

**✅ Test 2: Failed Payment**
1. Player uses declined card 4000 0000 0000 0002
2. Payment fails
3. Error shown to player
4. Player not marked as paid

**✅ Test 3: Webhook Handling**
1. Make payment
2. Check logs for webhook receipt
3. Verify payment status updated
4. Verify Stripe Dashboard shows payment

**✅ Test 4: Refund**
1. Issue refund in Stripe Dashboard
2. Verify webhook updates payment status
3. Verify player shows "refunded" status

---

## 🚀 **Go Live Checklist**

When ready to accept real payments:

### **For League Owner:**
- [ ] Stripe account fully verified
- [ ] Bank account connected for payouts
- [ ] Business profile completed
- [ ] Provided **live** API keys to admin
- [ ] Tested with test keys first

### **For Platform Admin:**
- [ ] Updated environment variables with **live** keys
- [ ] Verified webhook endpoint uses HTTPS
- [ ] Tested full payment flow on staging
- [ ] Monitored first few test payments
- [ ] Documented payment workflow for users

---

## 📊 **Monitoring & Reconciliation**

### **Daily:**
- Check payment dashboard for new payments
- Verify all Stripe payments appear in platform

### **Weekly:**
- Reconcile Stripe Dashboard with platform database
- Review any failed payments
- Issue refunds if needed

### **Monthly:**
- Review payout reports in Stripe
- Verify funds deposited to bank account
- Generate financial reports for league

---

## 🆘 **Troubleshooting**

### **Problem: Payments Not Appearing in Platform**

**Causes:**
- Webhook not configured
- Webhook secret mismatch
- Application not receiving webhook

**Fix:**
1. Check Stripe Dashboard → Webhooks → Recent Deliveries
2. Verify webhook endpoint is correct
3. Check application logs for webhook errors
4. Test webhook with Stripe CLI

---

### **Problem: "Invalid API Key" Error**

**Causes:**
- Wrong API key (test vs. live)
- Typo in environment variable
- Key was rolled/revoked

**Fix:**
1. Verify environment variable is set
2. Check if using correct key (test/live)
3. Roll key in Stripe Dashboard if needed
4. Update environment variable

---

### **Problem: Webhook Signature Verification Failed**

**Causes:**
- Wrong webhook secret
- Endpoint URL mismatch

**Fix:**
1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Check endpoint URL in Stripe Dashboard
3. Re-create webhook endpoint if needed

---

## 📞 **Support**

### **Stripe Support:**
- Dashboard: [stripe.com/docs](https://stripe.com/docs)
- Email: support@stripe.com
- Live chat: Available in Stripe Dashboard

### **Platform Support:**
- Email: support@hockeylifehl.com
- Documentation: This guide

---

## 🎉 **You're Ready!**

With Stripe configured, you can now:
- ✅ Accept online payments from players
- ✅ Track payment history
- ✅ Issue refunds
- ✅ Generate financial reports
- ✅ Automate payment reminders

**Next Steps:**
1. Test with test keys
2. Verify webhooks work
3. Switch to live keys
4. Accept first payment!

---

**END OF GUIDE**

*Last Updated: January 2026*
