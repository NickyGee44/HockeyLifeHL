-- Web push subscriptions and delivery dedupe for league-sites.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.teams.push_enabled IS
  'Captain-owned team-level switch for web push reminders. Disabled suppresses sends without deleting subscriptions.';

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  expiration_time timestamptz,
  user_agent text,
  disabled_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON public.push_subscriptions(user_id)
  WHERE disabled_at IS NULL;

CREATE TABLE IF NOT EXISTS public.notification_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT notification_send_log_type_check CHECK (
    notification_type IN ('sunday_checkin_t4d', 'game_reminder_t4h', 'game_recap')
  ),
  CONSTRAINT notification_send_log_dedupe UNIQUE (notification_type, game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_send_log_game_type
  ON public.notification_send_log(game_id, notification_type);

CREATE OR REPLACE FUNCTION public.touch_push_subscriptions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER touch_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_push_subscriptions_updated_at();

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_send_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_own"
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update_own"
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_send_log_select_own" ON public.notification_send_log;
CREATE POLICY "notification_send_log_select_own"
  ON public.notification_send_log
  FOR SELECT
  USING (auth.uid() = user_id);
