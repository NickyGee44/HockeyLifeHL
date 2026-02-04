# Stripe Elements Payment Flow - Visual Diagrams

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js Page: register/[leagueSlug]/page.tsx          │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  StripeProvider                                   │ │
│  │  - Loads Stripe.js                                │ │
│  │  - Creates Elements context                       │ │
│  │  - Configures dark theme                          │ │
│  │                                                    │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │  RegistrationWizardContainer                │ │ │
│  │  │  - Form state management                    │ │ │
│  │  │  - Navigation between steps                 │ │ │
│  │  │  - Auto-save drafts                         │ │ │
│  │  │                                              │ │ │
│  │  │  ┌───────────────────────────────────────┐ │ │ │
│  │  │  │  Step6Payment                         │ │ │ │
│  │  │  │  - useStripe() hook                   │ │ │ │
│  │  │  │  - useElements() hook                 │ │ │ │
│  │  │  │  - Creates PaymentIntent              │ │ │ │
│  │  │  │                                        │ │ │ │
│  │  │  │  ┌─────────────────────────────────┐ │ │ │ │
│  │  │  │  │  CardElement                    │ │ │ │ │
│  │  │  │  │  - Secure iframe from Stripe    │ │ │ │ │
│  │  │  │  │  - Real-time validation         │ │ │ │ │
│  │  │  │  │  - PCI compliant                │ │ │ │ │
│  │  │  │  └─────────────────────────────────┘ │ │ │ │
│  │  │  └───────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Payment Flow Sequence

```
Player                 Browser              Next.js Server        Stripe API
  │                       │                        │                  │
  │   Navigate to         │                        │                  │
  │   Payment Step        │                        │                  │
  ├──────────────────────>│                        │                  │
  │                       │                        │                  │
  │                       │  Load Stripe.js        │                  │
  │                       ├───────────────────────────────────────────>│
  │                       │<───────────────────────────────────────────┤
  │                       │  Stripe.js Loaded      │                  │
  │                       │                        │                  │
  │                       │  Create PaymentIntent  │                  │
  │                       ├───────────────────────>│                  │
  │                       │                        │                  │
  │                       │                        │  Validate League │
  │                       │                        │  Stripe Account  │
  │                       │                        │                  │
  │                       │                        │  Create          │
  │                       │                        │  PaymentIntent   │
  │                       │                        ├─────────────────>│
  │                       │                        │<─────────────────┤
  │                       │                        │  Return          │
  │                       │                        │  client_secret   │
  │                       │<───────────────────────┤                  │
  │                       │  client_secret         │                  │
  │                       │                        │                  │
  │   See Card Form       │                        │                  │
  │<──────────────────────┤                        │                  │
  │                       │                        │                  │
  │   Enter Card Details  │                        │                  │
  ├──────────────────────>│                        │                  │
  │                       │  (Real-time validation)│                  │
  │                       │                        │                  │
  │   Click "Pay"         │                        │                  │
  ├──────────────────────>│                        │                  │
  │                       │                        │                  │
  │                       │  confirmCardPayment()  │                  │
  │                       │  with client_secret    │                  │
  │                       ├───────────────────────────────────────────>│
  │                       │                        │                  │
  │                       │                        │     [3D Secure]  │
  │   3DS Modal (if req)  │<───────────────────────────────────────────┤
  │<──────────────────────┤                        │                  │
  │                       │                        │                  │
  │   Complete 3DS Auth   │                        │                  │
  ├──────────────────────>│───────────────────────────────────────────>│
  │                       │                        │                  │
  │                       │<───────────────────────────────────────────┤
  │                       │  Payment Succeeded     │                  │
  │                       │                        │                  │
  │   Success Message     │                        │    Webhook       │
  │<──────────────────────┤                        │<─────────────────┤
  │                       │                        │    payment_      │
  │                       │                        │    intent.       │
  │                       │                        │    succeeded     │
  │                       │                        │                  │
  │                       │                        │  Update DB       │
  │                       │                        │  payment_status  │
  │                       │                        │                  │
  │   Continue to         │                        │                  │
  │   Confirmation        │                        │                  │
  ├──────────────────────>│                        │                  │
```

## State Machine

```
┌─────────────┐
│   INITIAL   │
│  (Loading)  │
└──────┬──────┘
       │
       │ PaymentIntent Created
       │ client_secret received
       ▼
┌─────────────┐
│    READY    │
│ (Card Input)│
└──────┬──────┘
       │
       │ Card Complete
       │ Pay Button Enabled
       ▼
┌─────────────┐
│  PROCESSING │
│  (Loading)  │
└──────┬──────┘
       │
       ├───────────────────┬────────────────┐
       │                   │                │
       │ Success           │ Error          │ Requires Action
       ▼                   ▼                ▼
┌─────────────┐     ┌─────────────┐  ┌─────────────┐
│   SUCCESS   │     │    ERROR    │  │   3D SECURE │
│ (Completed) │     │ (Can Retry) │  │   (Modal)   │
└─────────────┘     └─────────────┘  └──────┬──────┘
                                             │
                                             ├──────────┬──────────┐
                                             │          │          │
                                             │ Success  │ Failed   │ Cancelled
                                             ▼          ▼          ▼
                                      ┌─────────────┐ ┌─────────────┐
                                      │   SUCCESS   │ │    ERROR    │
                                      │ (Completed) │ │ (Can Retry) │
                                      └─────────────┘ └─────────────┘
```

## Data Flow

```
┌────────────────────────────────────────────────────────────────┐
│                        Client Side                             │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Form State (react-hook-form)                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  league_id: string                                │   │  │
│  │  │  season_id: string                                │   │  │
│  │  │  payment_status: 'pending' | 'completed'          │   │  │
│  │  │  payment_intent_id: string | null                 │   │  │
│  │  │  amount_cents: number                             │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           │ Submit Form                        │
│                           ▼                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                        Server Side                             │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Server Action: submitPlayerRegistration()             │  │
│  │  1. Validate authentication                            │  │
│  │  2. Save waiver signature                              │  │
│  │  3. Update player profile                              │  │
│  │  4. Create/update registration_submissions             │  │
│  │  5. Store user consents                                │  │
│  │  6. Send notification emails                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Database: registration_submissions                     │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  id: uuid                                         │   │  │
│  │  │  player_id: uuid                                  │   │  │
│  │  │  league_id: uuid                                  │   │  │
│  │  │  season_id: uuid                                  │   │  │
│  │  │  stripe_payment_intent_id: text                   │   │  │
│  │  │  payment_status: text ('completed')               │   │  │
│  │  │  amount_paid_cents: integer                       │   │  │
│  │  │  submitted_at: timestamp                          │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Database: stripe_connect_payments                      │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  id: uuid                                         │   │  │
│  │  │  league_id: uuid                                  │   │  │
│  │  │  stripe_payment_intent_id: text                   │   │  │
│  │  │  amount_cents: integer                            │   │  │
│  │  │  application_fee_cents: integer                   │   │  │
│  │  │  status: text ('succeeded')                       │   │  │
│  │  │  metadata: jsonb                                  │   │  │
│  │  │    ┌─────────────────────────────────────────┐   │   │  │
│  │  │    │  type: 'registration'                   │   │   │  │
│  │  │    │  registration_id: uuid                  │   │   │  │
│  │  │    │  player_id: uuid                        │   │   │  │
│  │  │    └─────────────────────────────────────────┘   │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌───────────────────────────────────────────────────────────┐
│                    Error Scenarios                        │
└───────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Client Error │    │ Payment Error │    │ Server Error  │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ • Stripe.js   │    │ • Card        │    │ • Auth        │
│   not loaded  │    │   declined    │    │   failed      │
│ • Invalid     │    │ • Insufficient│    │ • League      │
│   publishable │    │   funds       │    │   not found   │
│   key         │    │ • Invalid CVC │    │ • Database    │
│ • Card input  │    │ • Expired     │    │   error       │
│   incomplete  │    │   card        │    │ • Network     │
│               │    │ • 3DS failed  │    │   timeout     │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                   ┌───────────────────┐
                   │  Error Handling   │
                   │                   │
                   │  1. Display error │
                   │     message       │
                   │  2. Log error     │
                   │  3. Re-enable     │
                   │     form          │
                   │  4. Allow retry   │
                   └───────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Layers                        │
└─────────────────────────────────────────────────────────────┘

Layer 1: Authentication
─────────────────────────
│ User must be logged in to access registration
│ Supabase Auth session validation
│ Player ID tied to authenticated user
└─────────────────────────────────────────────────────────────

Layer 2: Authorization
──────────────────────
│ Player can only pay for their own registration
│ League ownership verified via Stripe Connect
│ Payment amount validated server-side
└─────────────────────────────────────────────────────────────

Layer 3: PCI Compliance
───────────────────────
│ Card data never touches our servers
│ Stripe.js loaded from secure CDN
│ CardElement runs in secure iframe
│ Only tokenized payment methods stored
└─────────────────────────────────────────────────────────────

Layer 4: Payment Security
─────────────────────────
│ PaymentIntent created server-side only
│ client_secret required for confirmation
│ Stripe Connect account validated
│ Application fee calculated server-side
└─────────────────────────────────────────────────────────────

Layer 5: Database Security
──────────────────────────
│ RLS policies on registration_submissions
│ Only payment_intent_id stored (no card data)
│ Payment status auditable
│ Metadata includes tracking info
└─────────────────────────────────────────────────────────────

Layer 6: Webhook Security
─────────────────────────
│ Signature verification required
│ Idempotency handling
│ Event replay protection
│ Secure endpoint
└─────────────────────────────────────────────────────────────
```

## Money Flow

```
Player's Bank                                League's Bank
┌──────────┐                                ┌──────────┐
│   Card   │                                │ Account  │
└─────┬────┘                                └────▲─────┘
      │                                          │
      │ $50.00                                   │ $48.50
      │ (Registration Fee)                       │ (After Fee)
      ▼                                          │
┌─────────────────┐                              │
│  Stripe Payment │                              │
│   Intent        │                              │
│                 │                              │
│  Total: $50.00  │                              │
└────────┬────────┘                              │
         │                                       │
         ├──────────────┬────────────────────────┘
         │              │
         │ $48.50       │ $1.50
         │ (97%)        │ (3% Application Fee)
         ▼              ▼
┌────────────────┐  ┌─────────────────┐
│ League Connect │  │  Platform Fee   │
│    Account     │  │    Account      │
└────────────────┘  └─────────────────┘
         │
         │ Payout (Daily/Weekly)
         ▼
┌─────────────────┐
│  League Bank    │
│    Account      │
└─────────────────┘

Notes:
- Stripe processing fees (~2.9% + $0.30) deducted automatically
- Application fee configurable in database
- League receives net amount after all fees
- Payouts follow Stripe Connect schedule
```

## Testing Flow

```
┌────────────────────────────────────────────────────────────┐
│                    Testing Workflow                        │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  Start Dev Server│
                   └────────┬─────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Navigate to Payment Step     │
            │  /register/test-league?step=6 │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Verify Form Loads            │
            │  • CardElement visible        │
            │  • Amount displayed           │
            │  • Pay button disabled        │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Enter Test Card              │
            │  4242 4242 4242 4242          │
            │  12/34 | 123 | 12345          │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Click Pay Button             │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Verify Processing State      │
            │  • Button shows loading       │
            │  • Form disabled              │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Verify Success State         │
            │  • Success message            │
            │  • Amount displayed           │
            │  • Continue enabled           │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Verify Database Update       │
            │  • payment_status completed   │
            │  • payment_intent_id set      │
            │  • amount_paid_cents recorded │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Test Complete ✓              │
            └───────────────────────────────┘
```

## Legend

```
┌─────────────────────────────────────────────────────────┐
│  Symbol       Meaning                                   │
├─────────────────────────────────────────────────────────┤
│  ┌─────┐      Component or Module                      │
│  │     │                                                │
│  └─────┘                                                │
│                                                         │
│    │         Data Flow or Sequence                     │
│    ▼                                                    │
│                                                         │
│    ├──>      Decision Point or Branch                  │
│                                                         │
│  ═══════     Secure Connection (HTTPS)                 │
│                                                         │
│  ───────     Standard Connection                       │
│                                                         │
│    [  ]      External Service                          │
│                                                         │
│  • Bullet    List Item or Feature                      │
└─────────────────────────────────────────────────────────┘
```

---

**Note:** These diagrams are ASCII-based for easy viewing in any text editor. For presentation purposes, consider converting to Mermaid.js or a visual diagramming tool.
