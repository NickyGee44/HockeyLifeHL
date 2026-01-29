/**
 * Notifications System
 *
 * Purpose: Event-driven notification system for automated emails/SMS
 * Use Cases:
 * - Game rescheduled → notify team captains
 * - Game cancelled → notify team captains
 * - Score submitted → notify captains for verification
 * - Payment due → notify players
 * - Invoice overdue → notify team captains
 *
 * Features:
 * - Multi-channel (email, SMS, push)
 * - Template-based content
 * - Retry logic support
 * - Delivery status tracking
 * - Related entity tracking (game_id, invoice_id, etc.)
 * - Full audit trail
 *
 * Integration:
 * - Domain events emit from API endpoints
 * - Notification service subscribes to events
 * - Async queue processes notifications (Resend for email, Twilio for SMS)
 *
 * BMHL Requirements:
 * - Rescheduling 35 games → 70 captain notifications
 * - Admin can view "who was notified" per game
 * - Admin can manually resend failed notifications
 */

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Recipient
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL, -- game_rescheduled, game_cancelled, score_submitted, payment_due, etc.
  channel TEXT NOT NULL, -- email, sms, push

  -- Content
  subject TEXT,
  body TEXT NOT NULL,
  template_id TEXT, -- For template-based notifications (e.g., "game_rescheduled_v1")
  template_data JSONB, -- Variables for template rendering (e.g., {game_id, old_time, new_time})

  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, sent, failed, bounced
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Related entities (for filtering and display)
  related_entity_type TEXT, -- game, invoice, team, player, etc.
  related_entity_id UUID,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id), -- Admin who triggered manual resend (null for auto)

  -- Constraints
  CONSTRAINT valid_channel CHECK (channel IN ('email', 'sms', 'push')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'bounced'))
);

-- Indexes for common queries
CREATE INDEX idx_notifications_league_id ON notifications(league_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status) WHERE status = 'pending';
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

-- Comment
COMMENT ON TABLE notifications IS 'Event-driven notification queue for emails, SMS, and push notifications';
COMMENT ON COLUMN notifications.template_id IS 'Template identifier for content rendering (e.g., game_rescheduled_v1)';
COMMENT ON COLUMN notifications.template_data IS 'JSON variables for template interpolation (e.g., {game_id, old_time, new_time})';
COMMENT ON COLUMN notifications.retry_count IS 'Number of delivery attempts (for retry logic)';

-- =====================================================
-- 2. NOTIFICATION TEMPLATES TABLE
-- =====================================================

/**
 * Notification Templates
 *
 * Purpose: Reusable email/SMS templates with variable interpolation
 * Benefits:
 * - Consistent messaging across platform
 * - Easy A/B testing (v1, v2 templates)
 * - Per-tenant customization
 * - Non-technical users can edit content
 *
 * Example:
 * template_id: "game_rescheduled_v1"
 * subject: "Game Rescheduled: {{home_team}} vs {{away_team}}"
 * body: "Your game on {{old_date}} has been rescheduled to {{new_date}}..."
 */

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE, -- NULL = platform-wide template

  -- Template identity
  template_id TEXT NOT NULL, -- Unique identifier (e.g., "game_rescheduled_v1")
  name TEXT NOT NULL, -- Human-readable name
  description TEXT,

  -- Template content
  channel TEXT NOT NULL, -- email, sms, push
  subject TEXT, -- For email (supports {{variable}} interpolation)
  body TEXT NOT NULL, -- Supports {{variable}} interpolation
  html_body TEXT, -- For rich email (optional)

  -- Template variables schema (for validation)
  required_variables TEXT[], -- e.g., ['game_id', 'home_team', 'away_team', 'new_date']

  -- Status
  active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT valid_template_channel CHECK (channel IN ('email', 'sms', 'push')),
  UNIQUE(league_id, template_id, channel) -- One template per channel per tenant
);

-- Indexes
CREATE INDEX idx_notification_templates_league_id ON notification_templates(league_id);
CREATE INDEX idx_notification_templates_template_id ON notification_templates(template_id);
CREATE INDEX idx_notification_templates_active ON notification_templates(active) WHERE active = TRUE;

-- Comment
COMMENT ON TABLE notification_templates IS 'Reusable notification templates with variable interpolation';
COMMENT ON COLUMN notification_templates.template_id IS 'Unique identifier for template (e.g., game_rescheduled_v1)';
COMMENT ON COLUMN notification_templates.required_variables IS 'List of required variables for template rendering';

-- =====================================================
-- 3. ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Notifications policies

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- League admins can view all notifications for their league
CREATE POLICY "League admins can view all notifications"
  ON notifications
  FOR SELECT
  USING (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Service role can insert/update (for notification service)
CREATE POLICY "Service can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (TRUE); -- Service role bypasses RLS

CREATE POLICY "Service can update notifications"
  ON notifications
  FOR UPDATE
  USING (TRUE); -- Service role bypasses RLS

-- League admins can manually create notifications (for resend)
CREATE POLICY "League admins can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Notification Templates policies

-- Everyone can view active templates for their league
CREATE POLICY "Users can view active templates"
  ON notification_templates
  FOR SELECT
  USING (
    active = TRUE
    AND (
      league_id IS NULL -- Platform-wide template
      OR league_id IN (
        SELECT league_id
        FROM league_memberships
        WHERE user_id = auth.uid()
      )
    )
  );

-- League admins can manage templates
CREATE POLICY "League admins can manage templates"
  ON notification_templates
  FOR ALL
  USING (
    league_id IN (
      SELECT league_id
      FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 4. DEFAULT TEMPLATES
-- =====================================================

/**
 * Seed default notification templates
 *
 * These are platform-wide templates (league_id = NULL)
 * Tenants can override by creating their own version
 */

-- Game Rescheduled Template (Email)
INSERT INTO notification_templates (
  league_id,
  template_id,
  name,
  description,
  channel,
  subject,
  body,
  required_variables
) VALUES (
  NULL, -- Platform-wide
  'game_rescheduled_v1',
  'Game Rescheduled (Email)',
  'Notification sent to team captains when a game is rescheduled',
  'email',
  'Game Rescheduled: {{home_team}} vs {{away_team}}',
  E'Hi {{captain_name}},\n\nYour game has been rescheduled:\n\n**Original Date:** {{old_date}}\n**New Date:** {{new_date}}\n\n**Game Details:**\n- Home: {{home_team}}\n- Away: {{away_team}}\n- Venue: {{venue_name}}\n- Division: {{division_name}}\n\n**Reason:** {{reschedule_reason}}\n\nPlease ensure your team is aware of the new date and time.\n\nIf you have any questions, contact your league administrator.\n\nThanks,\n{{league_name}}',
  ARRAY['captain_name', 'home_team', 'away_team', 'old_date', 'new_date', 'venue_name', 'division_name', 'reschedule_reason', 'league_name']
);

-- Game Cancelled Template (Email)
INSERT INTO notification_templates (
  league_id,
  template_id,
  name,
  description,
  channel,
  subject,
  body,
  required_variables
) VALUES (
  NULL,
  'game_cancelled_v1',
  'Game Cancelled (Email)',
  'Notification sent to team captains when a game is cancelled',
  'email',
  'Game Cancelled: {{home_team}} vs {{away_team}}',
  E'Hi {{captain_name}},\n\nYour game on {{scheduled_date}} has been cancelled.\n\n**Game Details:**\n- Home: {{home_team}}\n- Away: {{away_team}}\n- Venue: {{venue_name}}\n- Division: {{division_name}}\n\n**Reason:** {{cancellation_reason}}\n\n{{#if will_reschedule}}\nThis game will be rescheduled. You will receive another notification once a new date is confirmed.\n{{/if}}\n\nIf you have any questions, contact your league administrator.\n\nThanks,\n{{league_name}}',
  ARRAY['captain_name', 'home_team', 'away_team', 'scheduled_date', 'venue_name', 'division_name', 'cancellation_reason', 'will_reschedule', 'league_name']
);

-- Score Verification Template (Email)
INSERT INTO notification_templates (
  league_id,
  template_id,
  name,
  description,
  channel,
  subject,
  body,
  required_variables
) VALUES (
  NULL,
  'score_verification_v1',
  'Score Verification Request (Email)',
  'Notification sent to team captains to verify game scores',
  'email',
  'Verify Game Score: {{home_team}} vs {{away_team}}',
  E'Hi {{captain_name}},\n\nThe score for your game has been submitted by the scorekeeper:\n\n**Final Score:**\n- {{home_team}}: {{home_score}}\n- {{away_team}}: {{away_score}}\n\n**Game Date:** {{game_date}}\n**Venue:** {{venue_name}}\n\nPlease verify this score by clicking the link below:\n\n{{verification_link}}\n\nThis link expires in 48 hours.\n\nIf you have any concerns about the score, contact your league administrator.\n\nThanks,\n{{league_name}}',
  ARRAY['captain_name', 'home_team', 'away_team', 'home_score', 'away_score', 'game_date', 'venue_name', 'verification_link', 'league_name']
);

-- Payment Due Template (Email)
INSERT INTO notification_templates (
  league_id,
  template_id,
  name,
  description,
  channel,
  subject,
  body,
  required_variables
) VALUES (
  NULL,
  'payment_due_v1',
  'Payment Due Reminder (Email)',
  'Notification sent to players/captains about outstanding payments',
  'email',
  'Payment Due: {{amount}} - {{league_name}}',
  E'Hi {{recipient_name}},\n\nThis is a reminder that you have an outstanding payment:\n\n**Amount Due:** {{amount}}\n**Due Date:** {{due_date}}\n**Description:** {{description}}\n\n{{#if overdue}}\n⚠️ **This payment is {{days_overdue}} days overdue.**\n{{/if}}\n\nTo pay online, click the link below:\n\n{{payment_link}}\n\nIf you have already paid, please disregard this message.\n\nIf you have any questions, contact your league administrator.\n\nThanks,\n{{league_name}}',
  ARRAY['recipient_name', 'amount', 'due_date', 'description', 'overdue', 'days_overdue', 'payment_link', 'league_name']
);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

/**
 * Function: get_captain_user_ids_for_game
 *
 * Purpose: Get user IDs of both team captains for a game
 * Used by notification service to determine recipients
 *
 * Returns: Array of user_id UUIDs
 */
CREATE OR REPLACE FUNCTION get_captain_user_ids_for_game(p_game_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_captain_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT lm.user_id)
  INTO v_captain_ids
  FROM games g
  INNER JOIN teams t ON t.id IN (g.home_team_id, g.away_team_id)
  INNER JOIN league_memberships lm ON lm.league_id = t.league_id
    AND lm.team_id = t.id
    AND lm.role = 'captain'
  WHERE g.id = p_game_id;

  RETURN COALESCE(v_captain_ids, ARRAY[]::UUID[]);
END;
$$;

COMMENT ON FUNCTION get_captain_user_ids_for_game IS 'Returns user IDs of both team captains for a given game';

/**
 * Function: get_player_user_ids_for_team
 *
 * Purpose: Get user IDs of all players on a team
 * Used for team-wide notifications
 *
 * Returns: Array of user_id UUIDs
 */
CREATE OR REPLACE FUNCTION get_player_user_ids_for_team(p_team_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT lm.user_id)
  INTO v_player_ids
  FROM league_memberships lm
  WHERE lm.team_id = p_team_id
    AND lm.role = 'player';

  RETURN COALESCE(v_player_ids, ARRAY[]::UUID[]);
END;
$$;

COMMENT ON FUNCTION get_player_user_ids_for_team IS 'Returns user IDs of all players for a given team';

-- =====================================================
-- 6. AUDIT TRAIL
-- =====================================================

-- Log notification sends to audit_logs table
CREATE OR REPLACE FUNCTION log_notification_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
    INSERT INTO audit_logs (
      league_id,
      action,
      entity_type,
      entity_id,
      changes,
      user_id
    ) VALUES (
      NEW.league_id,
      'notification_sent',
      'notification',
      NEW.id,
      jsonb_build_object(
        'type', NEW.type,
        'channel', NEW.channel,
        'recipient_user_id', NEW.user_id,
        'related_entity_type', NEW.related_entity_type,
        'related_entity_id', NEW.related_entity_id
      ),
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_notification_sent
  AFTER UPDATE ON notifications
  FOR EACH ROW
  WHEN (NEW.status = 'sent' AND OLD.status != 'sent')
  EXECUTE FUNCTION log_notification_sent();

COMMENT ON FUNCTION log_notification_sent IS 'Audit trigger: logs when notification is successfully sent';

-- =====================================================
-- 7. ANALYTICS VIEWS
-- =====================================================

/**
 * View: notification_stats_by_league
 *
 * Purpose: Admin dashboard showing notification delivery metrics
 */
CREATE OR REPLACE VIEW notification_stats_by_league AS
SELECT
  league_id,
  COUNT(*) AS total_notifications,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / NULLIF(COUNT(*), 0), 2) AS success_rate,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) FILTER (WHERE status = 'sent') AS avg_delivery_time_seconds
FROM notifications
GROUP BY league_id;

COMMENT ON VIEW notification_stats_by_league IS 'Aggregated notification delivery metrics per league';

-- =====================================================
-- 8. GRANTS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT ON notification_templates TO authenticated;
GRANT SELECT ON notification_stats_by_league TO authenticated;

-- Grant insert/update to service role (for notification processing)
GRANT INSERT, UPDATE ON notifications TO service_role;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
