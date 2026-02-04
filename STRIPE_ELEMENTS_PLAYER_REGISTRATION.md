# Stripe Elements Integration for Player Registration Payments

**Implementation Date:** 2026-02-04
**Status:** Complete

## Overview

This document describes the integration of Stripe Elements into the player registration payment flow. The implementation replaces the placeholder payment form with a real Stripe CardElement that securely collects payment information and processes transactions through Stripe Connect.

## Architecture

### Component Structure

```
apps/league-builder/src/
├── components/
│   └── payments/
│       ├── StripeProvider.tsx          # NEW - Wraps components with Stripe Elements context
│       └── index.ts                    # UPDATED - Exports StripeProvider
├── components/player-registration/
│   └── steps/
│       └── step-6-payment.tsx         # UPDATED - Integrated CardElement
└── app/
    └── register/
        └── [leagueSlug]/
            └── page.tsx                # UPDATED - Wrapped with StripeProvider
```

### Payment Flow

```
1. Player reaches payment step (Step 6)
   │
   ├──> StripeProvider initializes Stripe.js with publishable key
   │
2. Step6Payment component mounts
   │
   ├──> Creates PaymentIntent via createRegistrationPaymentIntent()
   │    │
   │    ├──> Fetches league's Stripe Connect account
   │    ├──> Validates account is active
   │    ├──> Creates PaymentIntent with application fee
   │    └──> Returns client_secret
   │
3. CardElement renders with client_secret
   │
   ├──> Player enters card details
   ├──> Real-time validation
   └──> Card complete state tracked
   │
4. Player clicks "Pay" button
   │
   ├──> stripe.confirmCardPayment(client_secret, card)
   │    │
   │    ├──> Stripe processes payment
   │    ├──> 3D Secure if required
   │    └──> Returns PaymentIntent status
   │
5. Payment succeeds
   │
   ├──> Form updated with payment_intent_id
   ├──> payment_status set to 'completed'
   ├──> amount_cents recorded
   └──> Success state displayed
   │
6. Player continues to confirmation step
   │
   └──> Registration submitted with payment proof
```

## Implementation Details

### 1. StripeProvider Component

**File:** `apps/league-builder/src/components/payments/StripeProvider.tsx`

**Purpose:** Wraps child components with Stripe Elements context, initializing Stripe.js with the publishable key.

**Features:**
- Lazy initialization of Stripe.js
- Dark theme optimized for the application
- Custom styling to match design system
- Loading and error states
- Environment variable validation

**Styling Configuration:**
```typescript
appearance: {
  theme: 'night',
  variables: {
    colorPrimary: '#10b981',      // Rink green
    colorBackground: '#1f2937',   // Dark gray
    colorText: '#f3f4f6',         // Light gray
    colorDanger: '#ef4444',       // Red
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '8px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#111827',
      border: '1px solid #374151',
      padding: '12px',
    },
    '.Input:focus': {
      border: '1px solid #10b981',
      boxShadow: '0 0 0 1px #10b981',
    },
    '.Label': {
      color: '#9ca3af',
      fontSize: '14px',
      fontWeight: '500',
    },
  },
}
```

### 2. Updated Payment Step Component

**File:** `apps/league-builder/src/components/player-registration/steps/step-6-payment.tsx`

**Key Changes:**

#### Added Imports
```typescript
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeCardElementChangeEvent } from '@stripe/stripe-js';
```

#### New State Management
```typescript
const stripe = useStripe();
const elements = useElements();
const [cardComplete, setCardComplete] = React.useState(false);
const [clientSecret, setClientSecret] = React.useState<string | null>(null);
```

#### PaymentIntent Creation
```typescript
React.useEffect(() => {
  if (!clientSecret && registrationFee > 0) {
    createPaymentIntent();
  }
}, []);

const createPaymentIntent = async () => {
  const result = await createRegistrationPaymentIntent(
    leagueId,
    seasonId,
    registrationFee
  );

  if (result.success) {
    setClientSecret(result.data?.clientSecret || null);
  }
};
```

#### Real Payment Processing
```typescript
const handlePayment = async () => {
  const cardElement = elements.getElement(CardElement);

  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
    },
  });

  if (paymentIntent?.status === 'succeeded') {
    setValue('payment_intent_id', paymentIntent.id);
    setValue('payment_status', 'completed');
    setValue('amount_cents', registrationFee);
    setPaymentSuccess(true);
  }
};
```

#### CardElement Integration
```typescript
<CardElement
  options={{
    style: {
      base: {
        fontSize: '16px',
        color: '#f3f4f6',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: false,
  }}
  onChange={handleCardChange}
/>
```

### 3. Updated Registration Page

**File:** `apps/league-builder/src/app/register/[leagueSlug]/page.tsx`

**Key Changes:**

```typescript
import { StripeProvider } from '@/components/payments/StripeProvider';

// Get Stripe publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

return (
  <StripeProvider publishableKey={stripePublishableKey}>
    <RegistrationWizardContainer>
      {/* Steps */}
    </RegistrationWizardContainer>
  </StripeProvider>
);
```

## Dependencies

### NPM Packages
```json
{
  "@stripe/react-stripe-js": "^3.10.0",
  "@stripe/stripe-js": "^8.7.0"
}
```

Installed via:
```bash
pnpm add @stripe/react-stripe-js @stripe/stripe-js --filter @hockey-life/league-builder
```

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
```

## Security Considerations

### PCI Compliance
- Card data never touches our servers
- Stripe.js handles all card input
- CardElement is PCI DSS compliant
- No card data stored in database

### Payment Intent Security
- PaymentIntent created server-side only
- client_secret required for payment confirmation
- League's Stripe Connect account validated before creation
- Application fee calculated server-side

### Authentication
- User must be authenticated to access registration
- PaymentIntent metadata includes player_id
- League ownership validated via Stripe Connect account

## Testing

### Test Cards

Use Stripe test cards for testing:

| Card Number          | Description                    |
|---------------------|--------------------------------|
| 4242 4242 4242 4242 | Successful payment             |
| 4000 0025 0000 3155 | Requires 3D Secure             |
| 4000 0000 0000 9995 | Declined (insufficient funds)  |
| 4000 0000 0000 0002 | Declined (card declined)       |

**Test Data:**
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

### Testing Checklist

- [ ] Card input renders correctly
- [ ] Real-time validation works
- [ ] Payment processes successfully with test card
- [ ] Error messages display for invalid cards
- [ ] Loading states show during processing
- [ ] Success state displays after payment
- [ ] Payment data saved to form state
- [ ] Webhook updates payment record
- [ ] Registration submission includes payment proof

## Webhook Integration

The payment is tracked via the existing Stripe webhook handler:

**File:** `apps/league-builder/src/app/api/webhooks/stripe/player-payments/route.ts`

**Events Handled:**
- `payment_intent.succeeded` - Updates registration payment status
- `payment_intent.payment_failed` - Marks payment as failed

## Database Schema

Payment data stored in `registration_submissions` table:

```sql
-- Payment fields
stripe_payment_intent_id  TEXT       -- PaymentIntent ID
payment_status           TEXT       -- 'pending', 'completed', 'failed'
amount_paid_cents        INTEGER    -- Amount in cents
```

Also tracked in `stripe_connect_payments` table for league accounting.

## User Experience

### Loading States

1. **Initial Load:**
   - Shows "Loading payment form..." while creating PaymentIntent
   - Spinner animation

2. **Processing Payment:**
   - Button shows "Processing Payment..." with spinner
   - Button disabled during processing
   - Card input disabled

3. **Success State:**
   - Green checkmark icon
   - "Payment Successful" message
   - Amount charged displayed
   - Continue button enabled

4. **Error State:**
   - Red alert icon
   - Error message from Stripe
   - Card input re-enabled
   - Retry button enabled

### Validation

- Real-time card validation as user types
- Complete/incomplete state tracking
- Pay button disabled until card complete
- Postal code required
- Error messages displayed inline

## Future Enhancements

### Potential Improvements

1. **Payment Methods:**
   - Add support for Apple Pay
   - Add support for Google Pay
   - Support ACH/bank transfers

2. **Payment Plans:**
   - Implement installment payments
   - Add deposit + balance option
   - Support payment schedules

3. **Coupons & Discounts:**
   - Apply promo codes
   - Early bird discounts
   - Referral credits

4. **Receipts:**
   - Automatic email receipts
   - PDF invoice generation
   - Tax documentation

5. **Refunds:**
   - Self-service refund requests
   - Partial refund support
   - Refund status tracking

## Troubleshooting

### Common Issues

**1. "Payment system not configured" error**
- Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set in `.env.local`
- Verify key starts with `pk_test_` or `pk_live_`
- Restart dev server after changing env vars

**2. "League payment account is not fully set up"**
- League must complete Stripe Connect onboarding
- Check `leagues.stripe_account_status` is 'active'
- Verify `leagues.stripe_account_id` is set

**3. Payment fails with "This league has not set up payment processing yet"**
- League has no `stripe_account_id` in database
- Admin must complete payment setup in settings

**4. CardElement not rendering**
- Check browser console for errors
- Verify Stripe.js loaded successfully
- Check network tab for blocked requests

**5. 3D Secure popup blocked**
- Ensure pop-ups are allowed for the domain
- Test with different card (some don't require 3DS)

## API Reference

### Server Actions

#### `createRegistrationPaymentIntent()`

Creates a PaymentIntent for registration payment.

```typescript
async function createRegistrationPaymentIntent(
  leagueId: string,
  seasonId: string,
  amountCents: number
): Promise<{
  success: boolean;
  data?: {
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
  };
  error?: string;
}>
```

**Process:**
1. Validates user authentication
2. Fetches league's Stripe Connect account
3. Validates account is active and has charges enabled
4. Retrieves user profile for receipt email
5. Creates PaymentIntent via `createPaymentIntent()` from stripe-connect library
6. Returns client_secret for confirming payment

**Error Handling:**
- Returns error if user not authenticated
- Returns error if league not found
- Returns error if league has no Stripe account
- Returns error if league account not active

### Client Hooks

#### `useStripe()`

Access Stripe instance from Elements context.

```typescript
const stripe = useStripe();
```

#### `useElements()`

Access Elements instance for retrieving CardElement.

```typescript
const elements = useElements();
const cardElement = elements.getElement(CardElement);
```

## Monitoring

### Key Metrics to Track

1. **Conversion Rate:**
   - Players reaching payment step
   - Players completing payment
   - Payment abandonment rate

2. **Payment Success Rate:**
   - Successful payments / total attempts
   - Failure reasons (declined, errors, etc.)

3. **Processing Time:**
   - Time from "Pay" click to success
   - Average time on payment step

4. **Revenue:**
   - Total registration fees collected
   - Application fees earned
   - Average transaction size

### Logging

Payment events logged include:
- PaymentIntent creation
- Payment confirmation attempts
- Payment successes
- Payment failures with error details

Check Supabase logs:
```bash
claude "check supabase logs for payment errors"
```

## Compliance

### Data Retention

- Card data: Never stored (PCI compliant)
- PaymentIntent ID: Stored in database
- Payment amount: Stored in cents
- Payment status: Tracked in real-time

### Privacy

- No sensitive card data in logs
- Player consent required for payment processing
- GDPR compliant data handling
- Data deletion on account removal

## Changelog

### v1.0.0 - 2026-02-04

**Added:**
- StripeProvider component for Elements context
- Real CardElement integration in step-6-payment
- PaymentIntent creation on component mount
- Real-time card validation
- Payment confirmation with Stripe
- Success/error state handling
- Dark theme styling for card input
- Loading states during processing

**Updated:**
- Registration page wrapped with StripeProvider
- Payment component imports Stripe hooks
- Payment handling logic uses real Stripe API
- Button states based on card completion

**Dependencies:**
- Added @stripe/react-stripe-js ^3.10.0
- Added @stripe/stripe-js ^8.7.0

## Support

For issues or questions:

1. Check this documentation
2. Review Stripe Elements docs: https://docs.stripe.com/payments/elements
3. Check Stripe Connect docs: https://docs.stripe.com/connect
4. Contact development team

## References

- [Stripe Elements Documentation](https://docs.stripe.com/payments/elements)
- [Stripe Connect Documentation](https://docs.stripe.com/connect)
- [React Stripe.js Documentation](https://docs.stripe.com/stripe-js/react)
- [Stripe Test Cards](https://docs.stripe.com/testing)
- [PCI Compliance Guide](https://docs.stripe.com/security/guide)
