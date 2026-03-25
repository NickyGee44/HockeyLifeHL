-- User Sessions Table
-- Tracks concurrent user sessions for security monitoring and management
-- Enables features like "Sign out other devices" and session limits

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Ensure session tokens are unique
  CONSTRAINT unique_session_token UNIQUE (session_token)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);

-- Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own sessions (for "sign out other devices")
CREATE POLICY "Users can delete their own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Only the system can insert sessions (via service role)
-- No INSERT policy means users can't create sessions directly
-- Sessions should only be created through authenticated server actions

-- Function to automatically update last_active timestamp
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_active on any UPDATE
CREATE TRIGGER update_user_sessions_last_active
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_active();

-- Function to cleanup expired sessions (can be called by cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users for cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions() TO authenticated;

-- Comment on table for documentation
COMMENT ON TABLE user_sessions IS 'Tracks concurrent user sessions for security monitoring and session management';
COMMENT ON COLUMN user_sessions.session_token IS 'Unique token identifying this session (typically JWT token ID or session ID)';
COMMENT ON COLUMN user_sessions.ip_address IS 'IP address of the session for security monitoring';
COMMENT ON COLUMN user_sessions.user_agent IS 'Browser/device user agent for identifying devices';
COMMENT ON COLUMN user_sessions.last_active IS 'Automatically updated timestamp of last activity';
COMMENT ON COLUMN user_sessions.expires_at IS 'When this session expires (typically 14 days from creation)';
