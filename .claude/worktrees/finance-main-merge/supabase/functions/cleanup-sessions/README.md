# Cleanup Sessions Edge Function

GDPR/CCPA Compliance function to automatically delete expired session data (IP addresses, user agents).

## Purpose

Removes session records older than their expiration date to comply with data retention policies. Session data includes PII (IP addresses, user agents) that must not be retained indefinitely.

## Deployment

```bash
# Deploy the function
supabase functions deploy cleanup-sessions

# Test the function
supabase functions invoke cleanup-sessions
```

## Scheduling

This function should run daily at 2 AM to clean up expired sessions.

### Option 1: Supabase Cron (Recommended)

Configure in Supabase Dashboard:
1. Go to Database → Cron Jobs
2. Click "Create a new cron job"
3. Name: `cleanup-sessions-daily`
4. Schedule: `0 2 * * *` (daily at 2 AM)
5. SQL Command:
   ```sql
   SELECT net.http_post(
     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-sessions',
     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
   );
   ```

### Option 2: External Cron Service

Use a service like Cron-Job.org or GitHub Actions to call the function:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-sessions \
  -H "Authorization: <YOUR_SERVICE_ROLE_KEY>"
```

## Response Format

```json
{
  "success": true,
  "cleaned": 42,
  "timestamp": "2026-01-30T02:00:00.000Z"
}
```

## Database Function

This edge function calls the `cleanup_expired_sessions()` database function, which:
- Deletes sessions where `expires_at < NOW()`
- Returns the count of deleted records
- Is defined in migration `20260128_create_user_sessions.sql`

## Monitoring

Check function logs in Supabase Dashboard:
1. Go to Edge Functions → cleanup-sessions
2. View "Invocations" tab for execution history
3. Check "Logs" tab for errors

## Retention Policy

- **Session Data:** 14 days (defined by `expires_at` in user_sessions table)
- **Cleanup Frequency:** Daily
- **PII Fields Removed:** ip_address, user_agent

## Related Files

- Database function: `supabase/migrations/20260128_create_user_sessions.sql`
- Session tracking: `src/lib/session-tracking.ts`
