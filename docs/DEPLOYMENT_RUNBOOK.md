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

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 - Critical | Site down, payments broken, data loss | Immediate (< 15 min) | Vercel deploy failure, Supabase outage, Stripe webhook loop, database corruption |
| P2 - High | Major feature broken for all users | 30 minutes | Login broken, schedule page errors, payment dashboard blank |
| P3 - Medium | Feature broken for some users | 4 hours | Scorekeeper offline sync fails, email notifications delayed |
| P4 - Low | Cosmetic / non-blocking | Next business day | Styling glitch, minor i18n issue |

### P1 — Site Down / Full Outage

```
1. CHECK STATUS PAGES (1 min)
   - Vercel: https://www.vercel-status.com
   - Supabase: https://status.supabase.com
   - Stripe: https://status.stripe.com
   - Resend: https://status.resend.com

2. IS IT A BAD DEPLOY? (2 min)
   → Yes: Run `vercel rollback` immediately
   → Verify site loads after rollback (~60s)

3. IS IT SUPABASE? (2 min)
   → Check Supabase Dashboard → Logs → Postgres for errors
   → Check if connection pool is exhausted (Settings → Database → Connection count)
   → If RLS is blocking: DO NOT disable RLS — fix the policy
   → If migrations broke something: Create reverse migration, apply via Dashboard SQL editor

4. IS IT STRIPE? (2 min)
   → Check Stripe Dashboard → Developers → Webhooks → Recent deliveries
   → Look for 5xx errors or signature mismatches
   → If webhook secret rotated: Update in Vercel env vars → Redeploy

5. COMMUNICATE (5 min)
   → Email affected league admins if outage > 15 min
   → Use Resend dashboard for manual sends if app email is down

6. DOCUMENT (after resolution)
   → What broke, when, how long, root cause, fix, prevention
```

### P1 — Payments Not Processing

```
1. CHECK STRIPE DASHBOARD → Payments → look for failures
2. CHECK webhook delivery: Dashboard → Developers → Webhooks → Events
3. VERIFY env vars match:
   - STRIPE_SECRET_KEY (starts with sk_live_ for production)
   - STRIPE_WEBHOOK_SECRET_ORGANIZATIONS
   - STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET
4. TEST with: stripe trigger checkout.session.completed
5. If Connect account issue: Dashboard → Connect → Accounts → check status
6. NEVER retry failed payments automatically — let users retry via "Pay Now"
```

### P1 — Database Emergency

```
1. Supabase has automatic daily backups (check Dashboard → Database → Backups)
2. Point-in-time recovery available on Pro plan
3. DO NOT run destructive queries without backup confirmation
4. If you need to run emergency SQL:
   - Use Supabase Dashboard SQL Editor (not CLI in production)
   - Always BEGIN/ROLLBACK first to test
   - Screenshot the query and result for incident log
5. If RLS policy is too restrictive: Fix the policy, don't bypass RLS
6. If connection pool exhausted: Check for long-running queries:
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;
```

### Application Rollback Quick Reference

| Scenario | Command | Recovery Time |
|----------|---------|---------------|
| Bad deploy | `vercel rollback` | ~60 seconds |
| Specific version | `vercel rollback [deployment-url]` | ~60 seconds |
| Bad migration (additive) | Leave in place, fix in code | Immediate |
| Bad migration (destructive) | Restore from Supabase backup | 5-30 minutes |
| Stripe webhook loop | Disable webhook in Stripe Dashboard | Immediate |
| Email blast gone wrong | Pause in Resend Dashboard | Immediate |

### Post-Incident Template

```markdown
## Incident Report — [DATE]

**Severity:** P1/P2/P3
**Duration:** [start time] — [end time] ([X] minutes)
**Impact:** [What users experienced]
**Root Cause:** [What went wrong]
**Fix:** [What was done to resolve]
**Prevention:** [What changes prevent recurrence]
**Action Items:**
- [ ] [Specific follow-up task]
```

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

| Role | Contact | When to Reach |
|------|---------|---------------|
| Platform Owner | Nick Grossi (update with email/phone) | P1/P2 incidents, production deploys |
| Stripe Support | https://support.stripe.com | Payment processing issues |
| Supabase Support | https://supabase.com/support | Database/auth outages |
| Vercel Support | https://vercel.com/support | Deploy failures, edge network issues |
| Resend Support | https://resend.com/support | Email delivery failures |
| Domain Registrar | (update with provider) | DNS / custom domain issues |

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
