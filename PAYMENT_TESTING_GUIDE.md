# Payment Testing Guide - Player Registration

Quick reference for testing the Stripe Elements player registration payment flow.

## Prerequisites

1. **Environment Setup:**
   ```bash
   # .env.local
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   STRIPE_SECRET_KEY=sk_test_xxx
   ```

2. **League Setup:**
   - League must have completed Stripe Connect onboarding
   - `leagues.stripe_account_id` must be set
   - `leagues.stripe_account_status` must be 'active'

3. **Dev Server Running:**
   ```bash
   cd apps/league-builder
   pnpm dev
   ```

## Test Flow

### 1. Navigate to Registration

```
URL: http://localhost:3000/register/{league-slug}?step=6
```

Replace `{league-slug}` with actual league slug.

### 2. Verify Payment Form Loads

**Expected:**
- ✅ Stripe card element renders
- ✅ "Payment Details" header visible
- ✅ Registration fee amount displayed
- ✅ Pay button is disabled initially

**If form doesn't load:**
- Check browser console for errors
- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Check network tab for blocked requests

### 3. Test Successful Payment

**Test Card:** `4242 4242 4242 4242`

**Steps:**
1. Enter card number: `4242 4242 4242 4242`
2. Enter expiry: `12/34` (any future date)
3. Enter CVC: `123` (any 3 digits)
4. Enter ZIP: `12345` (any 5 digits)
5. Click "Pay" button

**Expected Results:**
- ✅ Button shows "Processing Payment..."
- ✅ Card input disabled during processing
- ✅ Success message appears
- ✅ Green checkmark icon displayed
- ✅ Amount charged shown
- ✅ "Continue" button enabled

### 4. Test Card Requiring 3D Secure

**Test Card:** `4000 0025 0000 3155`

**Steps:**
1. Enter card details as above
2. Click "Pay" button
3. **3D Secure modal will appear**
4. Click "Complete authentication" in modal

**Expected Results:**
- ✅ 3DS modal opens automatically
- ✅ After completing, payment succeeds
- ✅ Success state displayed

### 5. Test Declined Cards

#### Insufficient Funds
**Test Card:** `4000 0000 0000 9995`

**Expected:**
- ❌ Error: "Your card has insufficient funds"
- ❌ Red error alert displayed
- ✅ Card input re-enabled
- ✅ Can retry with different card

#### Generic Decline
**Test Card:** `4000 0000 0000 0002`

**Expected:**
- ❌ Error: "Your card was declined"
- ❌ Error message displayed
- ✅ Can retry payment

### 6. Test Form Validation

#### Incomplete Card Number
**Test:**
1. Enter partial card: `4242 4242`
2. Try to click Pay button

**Expected:**
- ✅ Pay button remains disabled
- ✅ No error until user leaves field

#### Invalid Card Number
**Test:**
1. Enter invalid card: `1234 5678 9012 3456`
2. Tab to next field

**Expected:**
- ❌ "Your card number is invalid" error
- ✅ Pay button disabled

#### Expired Card
**Test Card:** `4000 0000 0000 0069`

**Expected:**
- ❌ Payment declined
- ❌ Error message displayed

### 7. Verify Database Updates

**After Successful Payment:**

```sql
-- Check registration submission
SELECT
  id,
  stripe_payment_intent_id,
  payment_status,
  amount_paid_cents
FROM registration_submissions
WHERE player_id = {your_user_id};

-- Check payment tracking
SELECT
  id,
  stripe_payment_intent_id,
  amount_cents,
  status,
  metadata
FROM stripe_connect_payments
WHERE metadata->>'type' = 'registration';
```

**Expected:**
- ✅ `stripe_payment_intent_id` = `pi_xxx`
- ✅ `payment_status` = 'completed'
- ✅ `amount_paid_cents` = registration fee

### 8. Test Webhook Processing

**Trigger Webhook:**
```bash
# Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe/player-payments

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded
```

**Expected:**
- ✅ Webhook received successfully
- ✅ Payment record updated
- ✅ 200 OK response

## Test Card Reference

| Card Number          | Result                         | Use Case                    |
|---------------------|--------------------------------|-----------------------------|
| 4242 4242 4242 4242 | Success                        | Happy path testing          |
| 4000 0025 0000 3155 | Success (requires 3DS)         | 3D Secure flow              |
| 4000 0000 0000 9995 | Decline (insufficient funds)   | Error handling              |
| 4000 0000 0000 0002 | Decline (generic)              | Error handling              |
| 4000 0000 0000 0069 | Decline (expired)              | Validation testing          |
| 4000 0000 0000 0127 | Decline (incorrect CVC)        | CVC validation              |

**For all cards:**
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

## Common Issues

### Issue: "Payment system not configured"

**Solution:**
1. Check `.env.local` has `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. Restart dev server: `pnpm dev`
3. Clear browser cache

### Issue: "League payment account is not fully set up"

**Solution:**
1. Navigate to league settings
2. Complete Stripe Connect onboarding
3. Verify account status is 'active'
4. Check `leagues.stripe_account_id` is set

### Issue: CardElement not rendering

**Solution:**
1. Check browser console for errors
2. Verify Stripe.js loaded: Check network tab for `https://js.stripe.com/v3/`
3. Check for ad blockers or security extensions
4. Try incognito mode

### Issue: Payment succeeds but webhook doesn't fire

**Solution:**
1. Check Stripe CLI is running: `stripe listen`
2. Verify webhook endpoint is correct
3. Check webhook secret matches `.env.local`
4. Review Stripe dashboard webhook logs

### Issue: 3D Secure popup blocked

**Solution:**
1. Allow popups for localhost
2. Test in different browser
3. Use card without 3DS: `4242 4242 4242 4242`

## Automated Test Script

```javascript
// test-payment-flow.js
const { test, expect } = require('@playwright/test');

test('Complete registration payment flow', async ({ page }) => {
  // Navigate to payment step
  await page.goto('http://localhost:3000/register/test-league?step=6');

  // Wait for card element
  await page.waitForSelector('iframe[name^="__privateStripeFrame"]');

  // Fill card details (simplified - actual implementation needs iframe handling)
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
  await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
  await stripeFrame.locator('input[name="exp-date"]').fill('1234');
  await stripeFrame.locator('input[name="cvc"]').fill('123');
  await stripeFrame.locator('input[name="postal"]').fill('12345');

  // Click pay button
  await page.click('button:has-text("Pay")');

  // Wait for success
  await expect(page.locator('text=Payment Successful')).toBeVisible();

  // Verify continue button enabled
  await expect(page.locator('button:has-text("Continue")')).toBeEnabled();
});
```

## Manual Testing Checklist

### Pre-Payment
- [ ] Form loads without errors
- [ ] Card element renders properly
- [ ] Amount displays correctly
- [ ] Pay button initially disabled

### Card Input
- [ ] Can enter card number
- [ ] Can enter expiry date
- [ ] Can enter CVC
- [ ] Can enter ZIP code
- [ ] Real-time validation works
- [ ] Error messages display correctly

### Payment Processing
- [ ] Pay button enables when card complete
- [ ] Button shows loading state
- [ ] Form disabled during processing
- [ ] No duplicate payment submissions

### Success State
- [ ] Success message displays
- [ ] Amount shown correctly
- [ ] Continue button enabled
- [ ] Can proceed to next step

### Error Handling
- [ ] Declined cards show error
- [ ] Invalid cards show error
- [ ] Network errors handled
- [ ] Can retry after error

### Integration
- [ ] PaymentIntent created correctly
- [ ] Payment saved to database
- [ ] Webhook updates record
- [ ] Form state updated

## Performance Testing

### Load Time
- Initial render: < 2 seconds
- Stripe.js load: < 1 second
- PaymentIntent creation: < 500ms

### Payment Processing
- Average time: 2-4 seconds
- With 3DS: 5-10 seconds
- Timeout: 30 seconds

## Security Testing

### Verify PCI Compliance
- [ ] No card data in network requests (except to Stripe)
- [ ] No card data in database
- [ ] No card data in logs
- [ ] HTTPS enforced in production

### Verify Stripe Connect
- [ ] Payment goes to league's account
- [ ] Application fee calculated correctly
- [ ] Metadata includes proper tracking info

## Reporting Issues

When reporting payment issues, include:
1. Test card used
2. Browser and version
3. Console errors (screenshot)
4. Network tab (filtered to stripe.com)
5. Steps to reproduce
6. Expected vs actual result

## Resources

- [Stripe Test Cards](https://docs.stripe.com/testing)
- [Stripe Elements Docs](https://docs.stripe.com/payments/elements)
- [Stripe CLI](https://docs.stripe.com/stripe-cli)
- [Implementation Guide](./STRIPE_ELEMENTS_PLAYER_REGISTRATION.md)
