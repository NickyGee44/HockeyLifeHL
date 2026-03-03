-- Auto-Pick Monitor Cron
-- Calls the auto-pick-monitor edge function every minute to process expired pick timers.
-- The edge function calls get_expired_draft_picks() and auto_pick_player() for each.
-- Minimum pg_cron granularity is 1 minute; pick timers are 90s+ so worst-case latency is ~60s.

SELECT cron.schedule(
  'auto-pick-monitor',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ntplczcmhvfkijjxavdl.supabase.co/functions/v1/auto-pick-monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
