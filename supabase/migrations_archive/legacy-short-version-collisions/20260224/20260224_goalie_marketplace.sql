-- ==============================================================================
-- Goalie Marketplace: Goalie Pool + Sub Requests
-- ==============================================================================

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.goalie_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  skill_level public.skill_level_enum DEFAULT 'intermediate',
  availability JSONB NOT NULL DEFAULT '{}'::jsonb,
  has_full_gear BOOLEAN NOT NULL DEFAULT true,
  rate_per_game DECIMAL(8,2) NOT NULL DEFAULT 0,
  preferred_arenas TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted', 'pending')),
  verification_token UUID NOT NULL DEFAULT gen_random_uuid(),
  registered_via TEXT NOT NULL DEFAULT 'manual' CHECK (registered_via IN ('manual', 'self_registration', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, email)
);

CREATE TABLE IF NOT EXISTS public.goalie_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  skill_level_needed public.skill_level_enum DEFAULT 'intermediate',
  compensation TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled', 'expired')),
  filled_by UUID REFERENCES public.goalie_pool(id),
  filled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.goalie_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goalie_id UUID NOT NULL REFERENCES public.goalie_pool(id) ON DELETE CASCADE,
  rated_by UUID NOT NULL REFERENCES public.profiles(id),
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags TEXT[] NOT NULL DEFAULT '{}',
  private_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (goalie_id, rated_by, game_id)
);

CREATE TABLE IF NOT EXISTS public.goalie_request_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.goalie_requests(id) ON DELETE CASCADE,
  goalie_id UUID NOT NULL REFERENCES public.goalie_pool(id) ON DELETE CASCADE,
  accept_token UUID NOT NULL DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'accepted', 'declined', 'expired')),
  UNIQUE (request_id, goalie_id)
);

-- Keep updated_at current
DROP TRIGGER IF EXISTS set_goalie_pool_updated_at ON public.goalie_pool;
CREATE TRIGGER set_goalie_pool_updated_at
  BEFORE UPDATE ON public.goalie_pool
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_goalie_pool_league ON public.goalie_pool(league_id);
CREATE INDEX IF NOT EXISTS idx_goalie_pool_status ON public.goalie_pool(league_id, status);
CREATE INDEX IF NOT EXISTS idx_goalie_requests_game ON public.goalie_requests(game_id);
CREATE INDEX IF NOT EXISTS idx_goalie_requests_status ON public.goalie_requests(league_id, status);
CREATE INDEX IF NOT EXISTS idx_goalie_ratings_goalie ON public.goalie_ratings(goalie_id);
CREATE INDEX IF NOT EXISTS idx_goalie_notifications_token ON public.goalie_request_notifications(accept_token);

-- 3) RLS
ALTER TABLE public.goalie_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goalie_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goalie_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goalie_request_notifications ENABLE ROW LEVEL SECURITY;

-- Goalie pool SELECT: league members/admins/owners can view
CREATE POLICY "goalie_pool_select_league_members"
  ON public.goalie_pool
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = goalie_pool.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = goalie_pool.league_id
        AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
    )
  );

-- Goalie pool write: league admins/owners
CREATE POLICY "goalie_pool_write_admins"
  ON public.goalie_pool
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = goalie_pool.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = goalie_pool.league_id
        AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = goalie_pool.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = goalie_pool.league_id
        AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
    )
  );

-- Public self-registration to goalie pool
CREATE POLICY "goalie_pool_insert_self_registration"
  ON public.goalie_pool
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (registered_via = 'self_registration');

-- Requests SELECT: league members can view
CREATE POLICY "goalie_requests_select_league_members"
  ON public.goalie_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = goalie_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

-- Requests write: captain who requested OR league admins/owners
CREATE POLICY "goalie_requests_write_captain_or_admin"
  ON public.goalie_requests
  FOR ALL
  TO authenticated
  USING (
    goalie_requests.requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = goalie_requests.team_id
        AND t.captain_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = goalie_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = goalie_requests.league_id
        AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
    )
  )
  WITH CHECK (
    goalie_requests.requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = goalie_requests.team_id
        AND t.captain_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = goalie_requests.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = goalie_requests.league_id
        AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
    )
  );

-- Ratings SELECT: captains/admins/owners and rating author
CREATE POLICY "goalie_ratings_select_captains"
  ON public.goalie_ratings
  FOR SELECT
  TO authenticated
  USING (
    goalie_ratings.rated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.league_id = goalie_ratings.league_id
        AND t.captain_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = goalie_ratings.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = goalie_ratings.league_id
        AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
    )
  );

-- Ratings insert: captain/admin/owner and must be self as rated_by
CREATE POLICY "goalie_ratings_insert_captains"
  ON public.goalie_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    goalie_ratings.rated_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.league_id = goalie_ratings.league_id
          AND t.captain_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.league_memberships lm
        WHERE lm.league_id = goalie_ratings.league_id
          AND lm.user_id = auth.uid()
          AND lm.status = 'active'
          AND lm.role IN ('owner', 'admin')
      )
      OR EXISTS (
        SELECT 1 FROM public.leagues l
        WHERE l.id = goalie_ratings.league_id
          AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
      )
    )
  );

-- Notifications SELECT for league members/admins (internal tracking)
CREATE POLICY "goalie_notifications_select_league_members"
  ON public.goalie_request_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.goalie_requests gr
      JOIN public.league_memberships lm ON lm.league_id = gr.league_id
      WHERE gr.id = goalie_request_notifications.request_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.goalie_requests gr
      JOIN public.teams t ON t.id = gr.team_id
      WHERE gr.id = goalie_request_notifications.request_id
        AND t.captain_id = auth.uid()
    )
  );

-- Notifications write for league admins/owners/captains
CREATE POLICY "goalie_notifications_write_internal"
  ON public.goalie_request_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.goalie_requests gr
      JOIN public.league_memberships lm ON lm.league_id = gr.league_id
      WHERE gr.id = goalie_request_notifications.request_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.goalie_requests gr
      JOIN public.teams t ON t.id = gr.team_id
      WHERE gr.id = goalie_request_notifications.request_id
        AND t.captain_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.goalie_requests gr
      JOIN public.league_memberships lm ON lm.league_id = gr.league_id
      WHERE gr.id = goalie_request_notifications.request_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.goalie_requests gr
      JOIN public.teams t ON t.id = gr.team_id
      WHERE gr.id = goalie_request_notifications.request_id
        AND t.captain_id = auth.uid()
    )
  );
