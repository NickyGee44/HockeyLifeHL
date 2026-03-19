-- Weekly Wrap Cron: schedule AI weekly wrap generation every Monday at 6am UTC
-- Uses pg_cron + pg_net to call the generate-ai-article edge function

-- Schedule weekly wrap generation: Monday 6am UTC
SELECT cron.schedule(
  'weekly-ai-wrap',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://ntplczcmhvfkijjxavdl.supabase.co/functions/v1/generate-ai-article',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{"action":"weekly_wrap_all"}'::jsonb
  );
  $$
);
