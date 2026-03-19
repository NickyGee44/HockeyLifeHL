-- Canonicalized from legacy short migration version 20260301.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- Add reminder_sent_at to games table for idempotent 24h game reminder emails
ALTER TABLE games ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN games.reminder_sent_at IS
  'Timestamp when the 24-hour game reminder email was sent. NULL = not yet sent. Used by the send-game-reminders cron to prevent duplicate emails.';

