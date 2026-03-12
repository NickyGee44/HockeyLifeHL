-- Track per-season team return status and owner outreach history

CREATE TABLE IF NOT EXISTS public.season_team_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  source_season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending_outreach'
    CHECK (status IN ('pending_outreach', 'contacted', 'interested', 'follow_up_needed', 'confirmed', 'declined')),
  owner_flag TEXT NOT NULL DEFAULT 'normal'
    CHECK (owner_flag IN ('normal', 'priority_follow_up', 'waitlist_watch', 'at_risk', 'ready_to_confirm')),
  captain_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  captain_name TEXT,
  captain_email TEXT,
  captain_phone TEXT,
  notes TEXT,
  internal_notes TEXT,
  declined_reason TEXT,
  last_contacted_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  declined_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_season_team_returns_league_season
  ON public.season_team_returns(league_id, season_id);

CREATE INDEX IF NOT EXISTS idx_season_team_returns_status
  ON public.season_team_returns(season_id, status);

CREATE TABLE IF NOT EXISTS public.season_team_return_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  source_season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  campaign_type TEXT NOT NULL DEFAULT 'return_invite'
    CHECK (campaign_type IN ('return_invite', 'follow_up', 'status_update')),
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  recipient_filter TEXT NOT NULL DEFAULT 'captains'
    CHECK (recipient_filter IN ('captains', 'captains_and_contacts')),
  team_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  team_count INTEGER NOT NULL DEFAULT 0,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_season_team_return_campaigns_league_season
  ON public.season_team_return_campaigns(league_id, season_id, created_at DESC);

DROP TRIGGER IF EXISTS set_season_team_returns_updated_at ON public.season_team_returns;
CREATE TRIGGER set_season_team_returns_updated_at
  BEFORE UPDATE ON public.season_team_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.season_team_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_team_return_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS season_team_returns_select_admin ON public.season_team_returns;
CREATE POLICY season_team_returns_select_admin
  ON public.season_team_returns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = season_team_returns.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS season_team_returns_modify_admin ON public.season_team_returns;
CREATE POLICY season_team_returns_modify_admin
  ON public.season_team_returns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = season_team_returns.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = season_team_returns.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS season_team_return_campaigns_select_admin ON public.season_team_return_campaigns;
CREATE POLICY season_team_return_campaigns_select_admin
  ON public.season_team_return_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = season_team_return_campaigns.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS season_team_return_campaigns_insert_admin ON public.season_team_return_campaigns;
CREATE POLICY season_team_return_campaigns_insert_admin
  ON public.season_team_return_campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = season_team_return_campaigns.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE public.season_team_returns IS 'Per-season return tracking for prior teams so leagues can run outreach and preserve waiting-player intent.';
COMMENT ON TABLE public.season_team_return_campaigns IS 'Email outreach history for season team return campaigns.';
