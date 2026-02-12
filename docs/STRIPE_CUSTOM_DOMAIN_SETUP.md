# Stripe Custom Domain Setup

**Custom Payment Domain**: `pay.beerleaguehockey.ca`
**Date Configured**: 2026-02-11

## Configuration Steps

### 1. Stripe Dashboard Setup
The custom domain must be configured in your Stripe Dashboard:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Settings** → **Branding** → **Custom domain**
3. Add domain: `pay.beerleaguehockey.ca`
4. Add the required DNS records (provided by Stripe)

### 2. DNS Configuration
Add the following DNS records to your domain provider:

**CNAME Record** (provided by Stripe):
```
Type: CNAME
Name: pay
Value: [Stripe will provide this value]
TTL: 3600
```

**Note**: DNS propagation may take up to 48 hours.

### 3. Stripe Verification
Once DNS is configured, return to Stripe Dashboard to verify the domain.
Stripe will automatically use this domain for all Checkout sessions once verified.

## How It Works

### Automatic Domain Usage
Once configured in Stripe, all Checkout sessions and payment links will automatically use `pay.beerleaguehockey.ca` instead of `checkout.stripe.com`.

**No code changes required** - Stripe handles this automatically based on your account settings.

### URLs Affected
- Checkout sessions: `https://pay.beerleaguehockey.ca/c/pay/...`
- Payment links: `https://pay.beerleaguehockey.ca/b/...`
- Customer portal: `https://pay.beerleaguehockey.ca/p/...`

## Verification

### Test the Custom Domain
1. Create a test Checkout session via the application
2. Verify the URL uses `pay.beerleaguehockey.ca`
3. Complete a test payment to ensure everything works

### Stripe Dashboard Check
1. Go to Stripe Dashboard → Settings → Branding
2. Verify "Custom domain" shows `pay.beerleaguehockey.ca` with status "Active"
3. Check that SSL certificate is valid

## Security

### SSL/TLS
- Stripe automatically provisions and renews SSL certificates
- All traffic is encrypted via HTTPS
- No additional SSL configuration needed on your end

### Domain Ownership
- Stripe verifies domain ownership via DNS
- Only you can configure this domain in your Stripe account
- Cannot be used by other Stripe accounts

## Branding Benefits

✅ **Professional**: Custom domain matches your brand
✅ **Trust**: Customers see your domain, not checkout.stripe.com
✅ **Consistency**: Seamless payment experience
✅ **White-label**: Fully branded checkout flow

## Environment Variables

No new environment variables are required. The custom domain is configured entirely in the Stripe Dashboard and works automatically with existing integration.

### Existing Configuration
```bash
# From .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Monitoring

### Check Payment URLs
Monitor your payment logs to ensure custom domain is being used:

```typescript
// In your payment success handler
console.log('Checkout session URL:', session.url);
// Should show: https://pay.beerleaguehockey.ca/c/pay/...
```

### Stripe Webhook Events
Webhooks will still come from Stripe's infrastructure but will reference your custom domain in event data.

## Troubleshooting

### Domain Not Working
1. **Check DNS**: Verify CNAME record is correct
2. **Wait for DNS**: DNS propagation can take up to 48 hours
3. **Verify in Stripe**: Ensure domain shows as "Active"
4. **Check SSL**: Certificate should be auto-provisioned

### Still Seeing checkout.stripe.com
1. **Clear cache**: Clear browser cache and cookies
2. **Check account**: Ensure correct Stripe account is being used
3. **Verify configuration**: Re-check Stripe Dashboard settings

### Contact Stripe Support
If issues persist, contact Stripe Support with:
- Account ID: [Your account ID]
- Domain: pay.beerleaguehockey.ca
- Error messages or screenshots

## Production vs Development

### Development (Test Mode)
- Uses test API keys
- Custom domain works with test mode
- Test payments only

### Production (Live Mode)
- Uses live API keys
- Same custom domain applies to both test and live modes
- Real payments

**Note**: Configure custom domain in **both** test and live modes in Stripe Dashboard for consistency.

## Additional Resources

- [Stripe Custom Domains Documentation](https://stripe.com/docs/payments/checkout/custom-domains)
- [Stripe Branding Settings](https://dashboard.stripe.com/settings/branding)
- [DNS Configuration Help](https://stripe.com/docs/payments/checkout/custom-domains#dns-records)

---

**Status**: ✅ Domain documented
**Configured by**: Schema Fix Swarm
**Date**: 2026-02-11
