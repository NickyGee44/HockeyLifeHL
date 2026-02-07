# Stripe Payments Audit

Run a focused audit on all payment and billing code:

1. **Webhook Handler Review**
   - Find all Stripe webhook handlers: search for `webhook` in API routes
   - Verify each handler checks `stripe.webhooks.constructEvent` for signature verification
   - Check for idempotency: handlers should guard against duplicate event processing
   - Verify error responses use correct HTTP status codes (200 for processed, 400 for bad signature)

2. **Stripe Connect Validation**
   - Search for `stripe.accounts` and `stripe.transfers` usage
   - Verify platform fee calculations match the 2.99% model
   - Check that connected account IDs are validated before operations
   - Verify OAuth flow for Connect onboarding is secure

3. **PCI Compliance Scan**
   - Search for patterns that might store raw card data: `card_number`, `cvv`, `cvc`, `expiry`
   - Verify Stripe Elements or Checkout is used for card collection (never raw inputs)
   - Check that no payment tokens are logged or stored in plain text
   - Scan server actions for any payment data passing through server unnecessarily

4. **Payment Flow Integrity**
   - Trace the registration payment flow end-to-end
   - Verify amounts are calculated server-side (not trusting client-sent amounts)
   - Check for proper error handling: failed payments, declined cards, network errors
   - Verify payment status is synced to database after Stripe confirmation

5. **Chargeback & Refund Handling**
   - Check for `charge.dispute` webhook handler
   - Verify chargeback email alerts are configured (per recent commit c28d334)
   - Check refund flow handles partial refunds correctly
   - Verify refund status is reflected in the UI

6. **Environment & Keys**
   - Verify Stripe keys are loaded from environment variables only
   - Check that test vs live mode is handled correctly
   - Verify no Stripe secret keys appear in client-side code
   - Scan for hardcoded `sk_test_` or `sk_live_` patterns

7. **Report**
   - Output findings with severity: CRITICAL, HIGH, MEDIUM, LOW
   - Provide file:line references for each issue
   - Include remediation steps for any findings
