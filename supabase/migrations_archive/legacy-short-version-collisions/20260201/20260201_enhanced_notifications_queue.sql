/**
 * Enhanced Notification Queue System
 *
 * Purpose: Event-driven email notification with queue processing,
 *          retry logic with exponential backoff, and user preferences
 *
 * Features:
 * - Queue with priority and scheduled delivery
 * - Exponential backoff retry (2^n * 60 seconds, max 8 retries = ~4 hours)
 * - User notification preferences
 * - Database triggers for automatic notifications
 * - Provider integration tracking (Resend)
 *
 * Triggers:
 * - Game rescheduled -> notify both team captains
 * - Game cancelled -> notify all affected players
 * - Registration confirmed -> welcome email with receipt
 * - Draft pick made -> notify player with team assignment
 * - Invoice due -> billing reminder 7 days before
 */

-- =====================================================
-- 1. ENHANCE NOTIFICATIONS TABLE WITH QUEUE FEATURES
-- =====================================================

-- Add queue processing columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 8;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_response JSONB;

-- Add constraints
ALTER TABLE notifications ADD CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 10);

-- Update status constraint to include 'processing'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE notifications ADD CONSTRAINT valid_status
  CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'bounced', 'cancelled'));

-- Create index for queue processing (NOW() filtered at query time, not in index predicate)
CREATE INDEX IF NOT EXISTS idx_notifications_queue_pending
  ON notifications(priority DESC, scheduled_at NULLS FIRST, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notifications_queue_retry
  ON notifications(next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;

-- Comments
COMMENT ON COLUMN notifications.priority IS 'Queue priority 1-10, higher = more urgent (10=critical, 5=normal, 1=low)';
COMMENT ON COLUMN notifications.scheduled_at IS 'When to send (NULL = immediately)';
COMMENT ON COLUMN notifications.next_retry_at IS 'When to retry failed notification (exponential backoff)';
COMMENT ON COLUMN notifications.provider_message_id IS 'External provider message ID (e.g., Resend message ID)';
COMMENT ON COLUMN notifications.provider_response IS 'Full response from email provider for debugging';

-- =====================================================
-- 2. USER NOTIFICATION PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Email preferences (granular opt-in/out)
  email_enabled BOOLEAN DEFAULT TRUE,
  email_game_updates BOOLEAN DEFAULT TRUE,       -- game reschedule, cancel
  email_registration BOOLEAN DEFAULT TRUE,       -- registration confirmations
  email_draft BOOLEAN DEFAULT TRUE,              -- draft picks, team assignments
  email_billing BOOLEAN DEFAULT TRUE,            -- invoices, payment reminders
  email_marketing BOOLEAN DEFAULT FALSE,         -- promotional emails (opt-in)

  -- SMS preferences
  sms_enabled BOOLEAN DEFAULT FALSE,             -- opt-in only
  sms_game_updates BOOLEAN DEFAULT FALSE,
  sms_urgent_only BOOLEAN DEFAULT TRUE,          -- only critical notifications
  phone_number TEXT,                             -- for SMS delivery

  -- Push preferences
  push_enabled BOOLEAN DEFAULT TRUE,

  -- Quiet hours (no notifications during this window)
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,                        -- e.g., 22:00
  quiet_hours_end TIME,                          -- e.g., 08:00
  timezone TEXT DEFAULT 'America/Toronto',

  -- Unsubscribe tokens (for one-click unsubscribe in emails)
  unsubscribe_token UUID DEFAULT gen_random_uuid(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_user_notification_prefs_user ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_prefs_unsubscribe ON user_notification_preferences(unsubscribe_token);

-- RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON user_notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Auto-create preferences on profile creation
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Updated_at trigger
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_notification_preferences IS 'User preferences for notification channels and types';

-- =====================================================
-- 3. NOTIFICATION DELIVERY LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,

  -- Delivery attempt info
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,                          -- success, failed, bounced

  -- Provider details
  provider TEXT NOT NULL DEFAULT 'resend',       -- resend, twilio, firebase
  provider_message_id TEXT,
  provider_response JSONB,

  -- Error details
  error_code TEXT,
  error_message TEXT,

  -- Timing
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER,                           -- how long the API call took

  CONSTRAINT valid_delivery_status CHECK (status IN ('success', 'failed', 'bounced'))
);

-- Indexes
CREATE INDEX idx_notification_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX idx_notification_delivery_log_status ON notification_delivery_log(status);

-- RLS
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- League admins can view delivery logs
CREATE POLICY "League admins can view delivery logs"
  ON notification_delivery_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      INNER JOIN league_memberships lm ON lm.league_id = n.league_id
      WHERE n.id = notification_delivery_log.notification_id
      AND lm.user_id = auth.uid()
      AND lm.role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE notification_delivery_log IS 'Audit trail of all notification delivery attempts';

-- =====================================================
-- 4. QUEUE PROCESSING FUNCTIONS
-- =====================================================

/**
 * Function: claim_pending_notifications
 *
 * Purpose: Atomically claim batch of pending notifications for processing
 * Used by Edge Function worker to avoid duplicate sends
 *
 * Returns: Array of notification IDs claimed for processing
 */
CREATE OR REPLACE FUNCTION claim_pending_notifications(
  p_batch_size INTEGER DEFAULT 10,
  p_worker_id TEXT DEFAULT NULL
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed_ids UUID[];
BEGIN
  -- Claim pending notifications atomically using array_agg
  WITH claimable AS (
    SELECT id FROM public.notifications
    WHERE status = 'pending'
      AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    ORDER BY priority DESC, scheduled_at NULLS FIRST, created_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.notifications n
    SET
      status = 'processing',
      processing_started_at = NOW()
    FROM claimable c
    WHERE n.id = c.id
    RETURNING n.id
  )
  SELECT ARRAY_AGG(id) INTO v_claimed_ids FROM updated;

  RETURN COALESCE(v_claimed_ids, ARRAY[]::UUID[]);
END;
$$;

/**
 * Function: claim_retry_notifications
 *
 * Purpose: Claim failed notifications ready for retry
 */
CREATE OR REPLACE FUNCTION claim_retry_notifications(
  p_batch_size INTEGER DEFAULT 5
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed_ids UUID[];
BEGIN
  WITH retryable AS (
    SELECT id FROM public.notifications
    WHERE status = 'failed'
      AND retry_count < max_retries
      AND next_retry_at IS NOT NULL
      AND next_retry_at <= NOW()
    ORDER BY next_retry_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.notifications n
    SET
      status = 'processing',
      processing_started_at = NOW()
    FROM retryable r
    WHERE n.id = r.id
    RETURNING n.id
  )
  SELECT ARRAY_AGG(id) INTO v_claimed_ids FROM updated;

  RETURN COALESCE(v_claimed_ids, ARRAY[]::UUID[]);
END;
$$;

/**
 * Function: mark_notification_sent
 *
 * Purpose: Mark notification as successfully sent
 */
CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_notification_id UUID,
  p_provider_message_id TEXT DEFAULT NULL,
  p_provider_response JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.notifications
  SET
    status = 'sent',
    sent_at = NOW(),
    provider_message_id = p_provider_message_id,
    provider_response = p_provider_response
  WHERE id = p_notification_id
    AND status = 'processing';

  RETURN FOUND;
END;
$$;

/**
 * Function: mark_notification_failed
 *
 * Purpose: Mark notification as failed with exponential backoff retry
 * Backoff formula: 2^retry_count * 60 seconds
 *   Retry 1: 2 min, Retry 2: 4 min, Retry 3: 8 min, ...
 *   Max retry 8: ~4 hours
 */
CREATE OR REPLACE FUNCTION mark_notification_failed(
  p_notification_id UUID,
  p_error_message TEXT,
  p_provider_response JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Get current retry count
  SELECT retry_count, max_retries
  INTO v_retry_count, v_max_retries
  FROM public.notifications
  WHERE id = p_notification_id;

  -- Calculate next retry with exponential backoff
  v_retry_count := v_retry_count + 1;

  IF v_retry_count < v_max_retries THEN
    -- Exponential backoff: 2^n * 60 seconds
    v_next_retry := NOW() + (POWER(2, v_retry_count) * INTERVAL '60 seconds');
  ELSE
    v_next_retry := NULL; -- No more retries
  END IF;

  UPDATE public.notifications
  SET
    status = 'failed',
    failed_at = NOW(),
    failure_reason = p_error_message,
    retry_count = v_retry_count,
    next_retry_at = v_next_retry,
    provider_response = p_provider_response
  WHERE id = p_notification_id
    AND status = 'processing';

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION claim_pending_notifications IS 'Atomically claim batch of notifications for processing';
COMMENT ON FUNCTION claim_retry_notifications IS 'Claim failed notifications ready for retry';
COMMENT ON FUNCTION mark_notification_sent IS 'Mark notification as successfully delivered';
COMMENT ON FUNCTION mark_notification_failed IS 'Mark notification as failed with exponential backoff';

-- =====================================================
-- 5. EVENT TRIGGER: GAME RESCHEDULED
-- =====================================================

/**
 * Trigger: Queue notifications when game is rescheduled
 * Notifies both team captains
 */
CREATE OR REPLACE FUNCTION notify_game_rescheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_captain_ids UUID[];
  v_captain_id UUID;
  v_home_team RECORD;
  v_away_team RECORD;
  v_league RECORD;
  v_venue RECORD;
BEGIN
  -- Only trigger on schedule changes
  IF OLD.scheduled_at = NEW.scheduled_at THEN
    RETURN NEW;
  END IF;

  -- Get team details
  SELECT name, id INTO v_home_team FROM public.teams WHERE id = NEW.home_team_id;
  SELECT name, id INTO v_away_team FROM public.teams WHERE id = NEW.away_team_id;

  -- Get league name
  SELECT name INTO v_league FROM public.leagues WHERE id = NEW.league_id;

  -- Get venue name
  SELECT name INTO v_venue FROM public.venues WHERE id = NEW.venue_id;

  -- Get captain user IDs
  v_captain_ids := public.get_captain_user_ids_for_game(NEW.id);

  -- Create notification for each captain
  FOREACH v_captain_id IN ARRAY v_captain_ids
  LOOP
    INSERT INTO public.notifications (
      league_id,
      user_id,
      type,
      channel,
      subject,
      body,
      template_id,
      template_data,
      related_entity_type,
      related_entity_id,
      priority
    ) VALUES (
      NEW.league_id,
      v_captain_id,
      'game_rescheduled',
      'email',
      format('Game Rescheduled: %s vs %s', v_home_team.name, v_away_team.name),
      '', -- Body will be rendered from template
      'game_rescheduled_v1',
      jsonb_build_object(
        'home_team', v_home_team.name,
        'away_team', v_away_team.name,
        'old_date', to_char(OLD.scheduled_at AT TIME ZONE 'America/Toronto', 'Day, Month DD, YYYY at HH:MI AM'),
        'new_date', to_char(NEW.scheduled_at AT TIME ZONE 'America/Toronto', 'Day, Month DD, YYYY at HH:MI AM'),
        'venue_name', COALESCE(v_venue.name, 'TBD'),
        'league_name', v_league.name,
        'game_id', NEW.id
      ),
      'game',
      NEW.id,
      8 -- High priority
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_game_rescheduled
  AFTER UPDATE ON games
  FOR EACH ROW
  WHEN (OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at)
  EXECUTE FUNCTION notify_game_rescheduled();

-- =====================================================
-- 6. EVENT TRIGGER: GAME CANCELLED
-- =====================================================

/**
 * Trigger: Queue notifications when game is cancelled
 * Notifies all players on both teams
 */
CREATE OR REPLACE FUNCTION notify_game_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_player_ids UUID[];
  v_player_id UUID;
  v_home_team RECORD;
  v_away_team RECORD;
  v_league RECORD;
BEGIN
  -- Only trigger when status changes to cancelled
  IF NEW.status != 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Get team details
  SELECT name INTO v_home_team FROM public.teams WHERE id = NEW.home_team_id;
  SELECT name INTO v_away_team FROM public.teams WHERE id = NEW.away_team_id;

  -- Get league name
  SELECT name INTO v_league FROM public.leagues WHERE id = NEW.league_id;

  -- Get all player IDs from both teams
  v_player_ids := ARRAY(
    SELECT DISTINCT lm.user_id
    FROM public.league_memberships lm
    WHERE lm.team_id IN (NEW.home_team_id, NEW.away_team_id)
      AND lm.role IN ('player', 'captain')
  );

  -- Create notification for each player
  FOREACH v_player_id IN ARRAY v_player_ids
  LOOP
    INSERT INTO public.notifications (
      league_id,
      user_id,
      type,
      channel,
      subject,
      body,
      template_id,
      template_data,
      related_entity_type,
      related_entity_id,
      priority
    ) VALUES (
      NEW.league_id,
      v_player_id,
      'game_cancelled',
      'email',
      format('Game Cancelled: %s vs %s', v_home_team.name, v_away_team.name),
      '',
      'game_cancelled_v1',
      jsonb_build_object(
        'home_team', v_home_team.name,
        'away_team', v_away_team.name,
        'scheduled_date', to_char(NEW.scheduled_at AT TIME ZONE 'America/Toronto', 'Day, Month DD, YYYY at HH:MI AM'),
        'cancellation_reason', COALESCE(NEW.notes, 'No reason provided'),
        'league_name', v_league.name,
        'game_id', NEW.id
      ),
      'game',
      NEW.id,
      9 -- Very high priority
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_game_cancelled
  AFTER UPDATE ON games
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
  EXECUTE FUNCTION notify_game_cancelled();

-- =====================================================
-- 7. EVENT TRIGGER: DRAFT PICK MADE
-- =====================================================

/**
 * Trigger: Notify player when they are drafted to a team
 */
CREATE OR REPLACE FUNCTION notify_draft_pick()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_player_user_id UUID;
  v_team RECORD;
  v_league RECORD;
  v_draft RECORD;
  v_player_name TEXT;
BEGIN
  -- Get the player's user_id from their profile
  SELECT user_id, first_name || ' ' || last_name AS full_name
  INTO v_player_user_id, v_player_name
  FROM public.profiles
  WHERE id = NEW.player_id;

  IF v_player_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get team info
  SELECT t.name, t.id, t.league_id INTO v_team
  FROM public.teams t
  WHERE t.id = NEW.team_id;

  -- Get league info
  SELECT name INTO v_league FROM public.leagues WHERE id = v_team.league_id;

  -- Get draft info
  SELECT d.name INTO v_draft FROM public.drafts d WHERE d.id = NEW.draft_id;

  -- Create notification
  INSERT INTO public.notifications (
    league_id,
    user_id,
    type,
    channel,
    subject,
    body,
    template_id,
    template_data,
    related_entity_type,
    related_entity_id,
    priority
  ) VALUES (
    v_team.league_id,
    v_player_user_id,
    'draft_pick',
    'email',
    format('Welcome to %s!', v_team.name),
    '',
    'draft_pick_v1',
    jsonb_build_object(
      'player_name', v_player_name,
      'team_name', v_team.name,
      'draft_name', COALESCE(v_draft.name, 'Team Draft'),
      'pick_number', NEW.pick_number,
      'round_number', NEW.round_number,
      'league_name', v_league.name
    ),
    'draft_pick',
    NEW.id,
    7 -- High priority
  );

  RETURN NEW;
END;
$$;

-- Create trigger if draft_picks table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'draft_picks' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS trigger_draft_pick ON draft_picks;
    CREATE TRIGGER trigger_draft_pick
      AFTER INSERT ON draft_picks
      FOR EACH ROW
      EXECUTE FUNCTION notify_draft_pick();
  END IF;
END $$;

-- =====================================================
-- 8. ADDITIONAL TEMPLATES
-- =====================================================

-- Registration Confirmed Template
INSERT INTO notification_templates (
  league_id,
  template_id,
  name,
  description,
  channel,
  subject,
  body,
  html_body,
  required_variables
) VALUES (
  NULL,
  'registration_confirmed_v1',
  'Registration Confirmed (Email)',
  'Welcome email with receipt sent after successful registration',
  'email',
  'Welcome to {{league_name}}!',
  E'Hi {{player_name}},\n\nYour registration for {{season_name}} has been confirmed!\n\n**Registration Details:**\n- Season: {{season_name}}\n- Amount Paid: {{amount_paid}}\n- Transaction ID: {{transaction_id}}\n\nWhat''s Next:\n1. Wait for the draft or team assignment\n2. Check your schedule once teams are finalized\n3. Get ready to play!\n\nIf you have any questions, contact your league administrator.\n\nSee you on the ice!\n{{league_name}}',
  NULL,
  ARRAY['player_name', 'season_name', 'amount_paid', 'transaction_id', 'league_name']
) ON CONFLICT (league_id, template_id, channel) DO NOTHING;

-- Draft Pick Template
INSERT INTO notification_templates (
  league_id,
  template_id,
  name,
  description,
  channel,
  subject,
  body,
  html_body,
  required_variables
) VALUES (
  NULL,
  'draft_pick_v1',
  'Draft Pick Notification (Email)',
  'Notification sent when player is drafted to a team',
  'email',
  'Welcome to {{team_name}}!',
  E'Hi {{player_name}},\n\nCongratulations! You have been drafted to **{{team_name}}**!\n\n**Draft Details:**\n- Draft: {{draft_name}}\n- Round: {{round_number}}\n- Pick: #{{pick_number}}\n\nYour team captain will reach out with more information about practice schedules and game times.\n\nGood luck this season!\n{{league_name}}',
  NULL,
  ARRAY['player_name', 'team_name', 'draft_name', 'round_number', 'pick_number', 'league_name']
) ON CONFLICT (league_id, template_id, channel) DO NOTHING;

-- Invoice Due Reminder Template
INSERT INTO notification_templates (
  league_id,
  template_id,
  name,
  description,
  channel,
  subject,
  body,
  html_body,
  required_variables
) VALUES (
  NULL,
  'invoice_due_reminder_v1',
  'Invoice Due Reminder (Email)',
  'Billing reminder sent 7 days before invoice due date',
  'email',
  'Payment Reminder: {{amount}} due in {{days_until_due}} days',
  E'Hi {{recipient_name}},\n\nThis is a friendly reminder that you have an upcoming payment:\n\n**Invoice Details:**\n- Amount Due: {{amount}}\n- Due Date: {{due_date}}\n- Description: {{description}}\n\nTo pay now, click here:\n{{payment_link}}\n\nIf you have already paid, please disregard this message.\n\nQuestions? Contact your league administrator.\n\nThanks,\n{{league_name}}',
  NULL,
  ARRAY['recipient_name', 'amount', 'due_date', 'days_until_due', 'description', 'payment_link', 'league_name']
) ON CONFLICT (league_id, template_id, channel) DO NOTHING;

-- =====================================================
-- 9. SCHEDULED JOB: INVOICE REMINDERS
-- =====================================================

/**
 * Function: queue_invoice_due_reminders
 *
 * Purpose: Queue notifications for invoices due in 7 days
 * Should be called by cron job daily
 */
CREATE OR REPLACE FUNCTION queue_invoice_due_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER := 0;
  v_invoice RECORD;
BEGIN
  -- Find invoices due in 7 days that haven't been reminded yet
  FOR v_invoice IN
    SELECT
      i.id,
      i.league_id,
      i.user_id,
      i.amount,
      i.due_date,
      i.description,
      l.name AS league_name,
      p.first_name || ' ' || p.last_name AS recipient_name
    FROM public.invoices i
    INNER JOIN public.leagues l ON l.id = i.league_id
    INNER JOIN public.profiles p ON p.id = i.user_id
    WHERE i.status = 'pending'
      AND i.due_date BETWEEN NOW() + INTERVAL '6 days' AND NOW() + INTERVAL '8 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_entity_type = 'invoice'
          AND n.related_entity_id = i.id
          AND n.type = 'invoice_due_reminder'
          AND n.created_at > NOW() - INTERVAL '7 days'
      )
  LOOP
    INSERT INTO public.notifications (
      league_id,
      user_id,
      type,
      channel,
      subject,
      body,
      template_id,
      template_data,
      related_entity_type,
      related_entity_id,
      priority
    ) VALUES (
      v_invoice.league_id,
      v_invoice.user_id,
      'invoice_due_reminder',
      'email',
      format('Payment Reminder: %s due in 7 days', v_invoice.amount::TEXT),
      '',
      'invoice_due_reminder_v1',
      jsonb_build_object(
        'recipient_name', v_invoice.recipient_name,
        'amount', v_invoice.amount::TEXT,
        'due_date', to_char(v_invoice.due_date, 'Month DD, YYYY'),
        'days_until_due', '7',
        'description', COALESCE(v_invoice.description, 'League fees'),
        'payment_link', format('https://hockeylifehl.com/pay/%s', v_invoice.id),
        'league_name', v_invoice.league_name
      ),
      'invoice',
      v_invoice.id,
      6 -- Normal-high priority
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION queue_invoice_due_reminders IS 'Queue invoice reminder notifications (call daily via cron)';

-- =====================================================
-- 10. GRANTS
-- =====================================================

GRANT SELECT, UPDATE ON user_notification_preferences TO authenticated;
GRANT SELECT ON notification_delivery_log TO authenticated;

-- Service role for queue processing
GRANT EXECUTE ON FUNCTION claim_pending_notifications TO service_role;
GRANT EXECUTE ON FUNCTION claim_retry_notifications TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_sent TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_failed TO service_role;
GRANT EXECUTE ON FUNCTION queue_invoice_due_reminders TO service_role;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
