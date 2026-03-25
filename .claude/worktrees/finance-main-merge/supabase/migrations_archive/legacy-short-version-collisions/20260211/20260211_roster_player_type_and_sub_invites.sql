-- Add player_type to team_rosters
ALTER TABLE team_rosters ADD COLUMN IF NOT EXISTS player_type text NOT NULL DEFAULT 'regular'
  CHECK (player_type IN ('regular', 'sub', 'part_time'));

-- Sub invitations table
CREATE TABLE IF NOT EXISTS sub_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  invited_by uuid NOT NULL REFERENCES profiles(id),
  invited_player_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message text,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (game_id, invited_player_id)
);

ALTER TABLE sub_invitations ENABLE ROW LEVEL SECURITY;

-- Captains can manage invitations for their teams
CREATE POLICY "captains_manage_invites" ON sub_invitations FOR ALL USING (
  team_id IN (
    SELECT team_id FROM team_rosters
    WHERE player_id = auth.uid()
    AND leadership_role IN ('captain', 'alternate_captain')
    AND status = 'active'
  )
);

-- Players can view and respond to their own invitations
CREATE POLICY "players_view_own_invites" ON sub_invitations FOR SELECT
  USING (invited_player_id = auth.uid());

CREATE POLICY "players_respond_own_invites" ON sub_invitations FOR UPDATE
  USING (invited_player_id = auth.uid())
  WITH CHECK (invited_player_id = auth.uid());

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sub_invitations_game_team ON sub_invitations(game_id, team_id);
CREATE INDEX IF NOT EXISTS idx_sub_invitations_player ON sub_invitations(invited_player_id, status);
CREATE INDEX IF NOT EXISTS idx_team_rosters_player_type ON team_rosters(team_id, player_type) WHERE status = 'active';
