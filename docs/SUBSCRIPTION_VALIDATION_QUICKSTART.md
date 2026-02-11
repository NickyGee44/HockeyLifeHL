# Subscription Validation - Quick Start

**60-Second Guide to Validating Organization Subscriptions**

---

## 1. Install Dependencies (2 min)

```bash
cd apps/league-builder
pnpm install
```

This installs `jest`, `ts-jest`, and `@types/jest` for testing.

---

## 2. Run Automated Tests (1 min)

```bash
pnpm test
```

**Expected:** All tests pass (green checkmarks)

**If tests fail:** Check error messages and fix issues

---

## 3. Validate Environment (30 sec)

```bash
npx tsx scripts/validate-stripe-env.ts
```

**Expected:** `✅ ALL CHECKS PASSED`

**If checks fail:** Update `.env.local` with missing variables

---

## 4. Validate Database Schema (1 min)

1. Open Supabase SQL Editor
2. Copy contents of `scripts/validate-subscription-schema.sql`
3. Execute query
4. Verify last query shows `✅ VALIDATION PASSED`

**If validation fails:** Run missing migrations

---

## 5. Manual Webhook Testing (10 min)

### Setup Stripe CLI

```bash
# Install Stripe CLI (Windows)
scoop install stripe

# Or macOS
brew install stripe/stripe-cli/stripe

# Login
stripe login
```

### Test Webhooks

```bash
# Terminal 1: Start dev server
pnpm dev:builder

# Terminal 2: Forward webhooks
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks/subscriptions

# Copy webhook secret (whsec_...) and add to .env.local
# STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_...

# Terminal 3: Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

### Verify Results

```sql
-- Check events logged
SELECT event_type, created_at
FROM organization_subscription_events
ORDER BY created_at DESC
LIMIT 5;

-- Check organization updated
SELECT subscription_tier, subscription_status
FROM organizations
WHERE stripe_subscription_id IS NOT NULL
LIMIT 1;
```

**Expected:** Events logged, organization updated

---

## 6. Pre-Deployment Checklist (2 min)

- [ ] All automated tests pass
- [ ] Environment validation passes
- [ ] Database schema validation passes
- [ ] Manual webhook tests successful
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] No ESLint errors (`pnpm lint`)
- [ ] All changes committed to git
- [ ] No secrets in git history

---

## 7. Deploy to Preview (5 min)

```bash
# Commit changes
git add .
git commit -m "feat: organization subscription system with validation suite"
git push origin main
```

Vercel auto-deploys to preview environment.

### Configure Stripe Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://<preview-url>.vercel.app/api/stripe/webhooks/subscriptions`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_method.attached`
4. Copy webhook signing secret
5. Add to Vercel environment variables:
   - `STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_...`
6. Redeploy preview

---

## 8. Production Deployment

**Only after preview validation complete!**

```bash
# Merge to production
git checkout production
git merge main
git push origin production
```

Configure production webhooks with live mode endpoint.

---

## Common Issues

### Tests Fail

**Issue:** `Cannot find module 'jest'`

**Fix:** Run `pnpm install` in `apps/league-builder`

### Environment Validation Fails

**Issue:** `❌ STRIPE_SECRET_KEY`

**Fix:** Add to `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### Webhooks Not Received

**Issue:** No webhook events in logs

**Fix:**
1. Check Stripe CLI is running: `stripe listen --forward-to ...`
2. Check dev server is running: `pnpm dev:builder`
3. Verify webhook secret in `.env.local`
4. Restart dev server after updating env vars

### Database Validation Fails

**Issue:** Missing tables or functions

**Fix:** Run migrations in `supabase/migrations/` directory

---

## Full Documentation

For detailed information, see:

- **Validation Report:** `docs/ORGANIZATION_SUBSCRIPTIONS_VALIDATION_REPORT.md`
- **Stripe CLI Guide:** `docs/STRIPE_CLI_TESTING_GUIDE.md`
- **Validation Summary:** `docs/VALIDATION_SUMMARY.md`
- **Test README:** `apps/league-builder/src/lib/stripe/__tests__/README.md`

---

## Support

If stuck, check:
1. Error logs in terminal
2. Supabase logs in dashboard
3. Stripe webhook logs in dashboard
4. Troubleshooting sections in full documentation

---

**Total Time:** ~20 minutes from zero to deployed preview

**Last Updated:** 2026-02-11
