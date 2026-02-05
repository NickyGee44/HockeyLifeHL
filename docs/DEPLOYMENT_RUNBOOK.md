# Deployment Runbook - HockeyLifeHL Platform 1
**Last Updated:** February 5, 2026

---

## Quick Reference

### Deployment Commands

```bash
# Staging deployment
./scripts/deploy-staging.sh

# Production deployment
./scripts/deploy-production.sh

# Emergency rollback
vercel rollback
```

### Critical URLs

| Service | URL |
|---------|-----|
| Vercel Dashboard | https://vercel.com/dashboard |
| Stripe Dashboard | https://dashboard.stripe.com |
| Supabase Dashboard | https://app.supabase.com |

---

## Pre-Deployment Checklist

### Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (use test keys for staging, live for production)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_...
STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Database Migrations

Before deploying, ensure all migrations are applied:

```sql
-- Check applied migrations
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 10;
```

Required migrations for Platform 1:
- [x] `20260204_add_captain_access_indexes`
- [x] `20260204_add_captain_rls_policies`
- [x] `20260205_schedule_generation_functions`
- [x] `20260205_payment_atomicity_fixes`
- [x] `20260205_add_captain_token_expiry`
- [x] `20260205_add_webhook_advisory_locks`

### Stripe Webhook Configuration

Configure these webhooks in Stripe Dashboard:

**Subscription Webhooks** (endpoint: `/api/stripe/webhooks/subscriptions`)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Player Payment Webhooks** (endpoint: `/api/webhooks/stripe/player-payments`)
- `checkout.session.completed`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

**Connect Webhooks** (endpoint: `/api/stripe/webhooks/connect`)
- `account.updated`

---

## Deployment Steps

### Step 1: Staging Deployment

1. **Merge feature branch to main**
   ```bash
   git checkout main
   git merge cleanup/platform1-routing-consolidation
   git push origin main
   ```

2. **Deploy to staging**
   ```bash
   ./scripts/deploy-staging.sh
   ```

3. **Verify on staging**
   - Test authentication flows
   - Test league creation wizard
   - Test payment flows with test cards
   - Verify email notifications

### Step 2: Production Deployment

1. **Final verification on staging** - All tests pass

2. **Deploy to production**
   ```bash
   ./scripts/deploy-production.sh
   ```

3. **Post-deployment verification**
   - Check application loads
   - Verify authentication
   - Test a payment flow
   - Monitor error logs for 2 hours

---

## Monitoring

### Key Metrics to Watch

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| Error Rate | < 0.5% | > 1% |
| Response Time (p95) | < 1s | > 2s |
| Payment Success Rate | > 98% | < 95% |
| Webhook Success Rate | 100% | < 99% |

### Log Locations

- **Application Logs:** Vercel Dashboard → Project → Logs
- **Database Logs:** Supabase Dashboard → Logs → Postgres
- **Auth Logs:** Supabase Dashboard → Logs → Auth
- **Edge Function Logs:** Supabase Dashboard → Logs → Edge Functions

---

## Rollback Procedures

### Application Rollback

```bash
# Quick rollback to previous deployment
vercel rollback

# Or rollback to specific deployment
vercel rollback [deployment-url]
```

### Database Rollback

For database migrations, rollback is NOT automatic. If needed:

1. Create a new migration that reverses the changes
2. Apply via Supabase dashboard or MCP

⚠️ **Warning:** Only rollback database changes if absolutely necessary. Most migrations are additive and safe to leave in place.

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 - Critical | Site down, payments broken | Immediate |
| P2 - High | Major feature broken | 30 minutes |
| P3 - Medium | Minor feature broken | 4 hours |
| P4 - Low | Cosmetic issue | Next business day |

### P1 Response Checklist

1. [ ] Acknowledge the incident
2. [ ] Check Vercel deployment status
3. [ ] Check Supabase status
4. [ ] Check Stripe status
5. [ ] If deployment issue → Rollback
6. [ ] If database issue → Check Supabase logs
7. [ ] Communicate to users if needed
8. [ ] Document incident after resolution

---

## Security Considerations

### Pre-Deployment Security Check

- [ ] All environment variables use secrets, not plaintext
- [ ] Stripe keys match environment (test vs live)
- [ ] RLS policies are enabled on all tables
- [ ] No debug logs with PII in production
- [ ] CORS settings are restricted

### Security Advisors Check

Run before each deployment:
```bash
# Via Claude Code MCP
mcp__supabase__get_advisors(type: "security")
```

Expected result: 0 CRITICAL issues

---

## Common Issues & Solutions

### Build Fails with TypeScript Errors

```bash
# Fix type errors
pnpm typecheck

# Common fix: regenerate types
pnpm db:generate-types
```

### Webhook Signature Verification Fails

- Ensure webhook secret matches Stripe dashboard
- Check endpoint URL is correct (including trailing slash)
- Verify webhook is pointed at correct environment

### Payments Not Processing

1. Check Stripe Connect account is active
2. Verify webhook secrets are set
3. Check Stripe dashboard for blocked payments
4. Review webhook delivery logs

### Email Not Sending

1. Verify RESEND_API_KEY is set
2. Check Resend dashboard for errors
3. Verify FROM_EMAIL domain is verified
4. Check spam folder

---

## Contacts

| Role | Contact |
|------|---------|
| Technical Lead | [Your contact] |
| DevOps | [Contact info] |
| Stripe Support | https://support.stripe.com |
| Supabase Support | https://supabase.com/support |

---

## Appendix: Useful Commands

```bash
# Check deployment status
vercel ls

# View production logs
vercel logs --prod

# Check environment variables
vercel env ls

# Run database query
pnpm supabase db execute "SELECT * FROM leagues LIMIT 5"

# Generate types from database
pnpm db:generate-types

# Test webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe/player-payments
```
