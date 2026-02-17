# Notification Infrastructure

Architecture overview for the email/notification system in HockeyLifeHL.

## Two Parallel Email Systems

The platform has two independent email systems that coexist:

### 1. Direct Send System (`lib/email/`)

Transactional emails sent immediately by server-side code (Stripe webhooks, registration flows).

| File | Emails |
|------|--------|
| `payment-emails.ts` | Payment receipts, refund confirmations, chargeback alerts |
| `registration-emails.ts` | Registration confirmation, approval/rejection |
| `team-request-emails.ts` | Join request submitted/approved/denied |
| `scorekeeper-emails.ts` | Assignment notifications |
| `subscription-emails.ts` | Subscription created/cancelled/updated |

**When to use**: For emails that must send immediately in response to a webhook or user action (Stripe webhooks have a 30s timeout).

### 2. Queue-Based System (`lib/notifications/`)

Server Actions that create records in the `notifications` DB table. A cron-triggered Edge Function processes the queue.

| File | Purpose |
|------|---------|
| `actions.ts` | Server Actions: `sendLeagueAnnouncement()`, `sendGameReminderNotification()`, `sendRosterChangeNotification()`, `sendSuspensionNotification()` |
| `email-service.ts` | Low-level `sendEmail()` / `sendBatchEmails()` via Resend |
| `templates/*.ts` | 19 TypeScript email templates (cyan `#22D3EE` brand) |

**When to use**: For batch notifications, announcements, reminders, and anything that benefits from retry logic and delivery tracking.

### Queue Worker: `dispatch-notifications` Edge Function

Located at `supabase/functions/dispatch-notifications/index.ts`.

**Flow**:
1. DB triggers insert rows into `notifications` table with `status: 'pending'`
2. Vercel Cron fires every 5 min → `GET /api/cron/process-notifications`
3. Cron route calls Edge Function with `action: 'process_pending'`
4. Edge Function calls `claim_pending_notifications()` RPC (uses `FOR UPDATE SKIP LOCKED` for idempotency)
5. For each notification: fetch user profile, check preferences, render template, send via Resend
6. On success: `mark_notification_sent()` with Resend message ID
7. On failure: `mark_notification_failed()` with exponential backoff retry

**Actions**:
- `process_pending` — claim and send pending notifications
- `process_retry` — claim and retry failed notifications past their `next_retry_at`
- `queue_invoice_reminders` — call `queue_invoice_due_reminders()` DB function

**Auth**: Requires `Authorization: Bearer <SERVICE_ROLE_KEY>` or `X-Cron-Secret` header.

## Template Mapping

The Edge Function has its own inline email templates (gold `#D4AF37` brand) separate from the TypeScript templates in `lib/notifications/templates/` (cyan `#22D3EE` brand).

| Edge Function `template_id` | TypeScript Template |
|---|---|
| `game_rescheduled_v1` | `getScheduleChangeEmail({ changeType: 'rescheduled' })` |
| `game_cancelled_v1` | `getScheduleChangeEmail({ changeType: 'cancelled' })` |
| `registration_confirmed_v1` | `getRegistrationCompleteEmail()` |
| `draft_pick_v1` | (no equivalent) |
| `invoice_due_reminder_v1` | (no equivalent) |
| `payment_due_v1` | (no equivalent) |
| `score_verification_v1` | (no equivalent) |

The inline templates are used by the queue worker; the TypeScript templates are used by direct Server Action sends. This divergence is architecturally intentional — Edge Functions (Deno) cannot import Next.js modules.

## Cron Jobs

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/process-notifications` | `*/5 * * * *` | Process pending + retry notifications |
| `/api/cron/queue-invoice-reminders` | `0 9 * * *` | Queue invoice due reminders |

Config: `apps/league-builder/vercel.json`

## Database Tables

- `notifications` — Queue table with `status` lifecycle: `pending` → `processing` → `sent`/`failed`/`cancelled`
- `notification_delivery_log` — Per-attempt delivery records (provider, duration, error)
- `user_notification_preferences` — Per-user opt-in/out by type (game updates, billing, registration, draft)

## Known Gaps

- **Brand color divergence**: Edge Function uses gold (`#D4AF37`), TypeScript templates use cyan (`#22D3EE`)
- **No SMS provider**: Database schema supports `channel: 'sms'` but no SMS service is integrated
- **No server-side push delivery**: In-app push notifications have no delivery mechanism (only database-stored)
- **No per-league sender domain**: All emails come from `noreply@beerleaguehockey.ca` (custom sender domains planned)
- **Template unification**: Edge Function inline templates and TypeScript templates should eventually share a common rendering layer
- **URL references**: Some Edge Function templates still use `beerleaguehockey.ca/dashboard` — these should be dynamic per-league subdomain URLs
