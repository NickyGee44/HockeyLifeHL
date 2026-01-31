# Dispatch Notifications Edge Function

Event-driven email notification dispatcher for HockeyLifeHL.

## Features

- **Queue Processing**: Claims and processes pending notifications atomically
- **Retry Logic**: Exponential backoff (2^n * 60s, max 8 retries = ~4 hours)
- **User Preferences**: Respects opt-in/opt-out settings
- **Template Rendering**: BRAND-KIT styled email templates
- **Delivery Logging**: Full audit trail of send attempts
- **Resend Integration**: Uses Resend API for reliable delivery

## Environment Variables

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your-resend-api-key
```

## API

### POST /dispatch-notifications

Process pending or retry notifications.

**Request Body:**

```json
{
  "action": "process_pending",  // or "process_retry"
  "batch_size": 10              // optional, default 10
}
```

**Response:**

```json
{
  "message": "Processed 5 notifications, 0 failed",
  "processed": 5,
  "failed": 0,
  "results": [
    { "id": "uuid", "status": "sent" },
    { "id": "uuid", "status": "cancelled_opted_out" }
  ]
}
```

## Notification Types

| Type | Template ID | Trigger |
|------|-------------|---------|
| Game Rescheduled | `game_rescheduled_v1` | Game scheduled_at changes |
| Game Cancelled | `game_cancelled_v1` | Game status = cancelled |
| Registration Confirmed | `registration_confirmed_v1` | Manual/webhook |
| Draft Pick | `draft_pick_v1` | Row inserted into draft_picks |
| Invoice Due | `invoice_due_reminder_v1` | Cron: 7 days before due |
| Payment Due | `payment_due_v1` | Manual/invoice system |
| Score Verification | `score_verification_v1` | Scorekeeper submits |

## Cron Schedule

Configure in Supabase Dashboard or via cron job:

```bash
# Process pending notifications every minute
*/1 * * * * curl -X POST https://your-project.supabase.co/functions/v1/dispatch-notifications \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "process_pending", "batch_size": 20}'

# Process retries every 5 minutes
*/5 * * * * curl -X POST https://your-project.supabase.co/functions/v1/dispatch-notifications \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "process_retry", "batch_size": 10}'

# Queue invoice reminders daily at 9 AM
0 9 * * * psql $DATABASE_URL -c "SELECT queue_invoice_due_reminders();"
```

## Email Templates

All templates follow BRAND-KIT.md styling:

- **Primary Gold**: #D4AF37
- **Background**: #0a0a0a (dark) / #111111 (card)
- **Typography**: System fonts with fallbacks
- **Mobile Responsive**: Fluid layout, touch-friendly buttons

## Deployment

```bash
supabase functions deploy dispatch-notifications
```

## Testing

```bash
# Test pending processing
curl -X POST http://localhost:54321/functions/v1/dispatch-notifications \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "process_pending", "batch_size": 5}'
```
