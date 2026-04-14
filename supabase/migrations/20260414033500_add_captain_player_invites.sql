BEGIN;

CREATE TABLE IF NOT EXISTS public.captain_player_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  roster_id UUID REFERENCES public.team_rosters(id) ON DELETE SET NULL,
  target_player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_name TEXT,
  share_phone TEXT,
  position TEXT,
  player_type TEXT NOT NULL DEFAULT 'regular',
  share_with_league BOOLEAN NOT NULL DEFAULT FALSE,
  brand_scope TEXT NOT NULL DEFAULT 'team',
  registration_path TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  consumed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT captain_player_invites_brand_scope_check CHECK (brand_scope IN ('team', 'league')),
  CONSTRAINT captain_player_invites_player_type_check CHECK (player_type IN ('regular', 'sub', 'part_time'))
);

CREATE INDEX IF NOT EXISTS idx_captain_player_invites_team_id ON public.captain_player_invites(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_captain_player_invites_target_player_id ON public.captain_player_invites(target_player_id);

COMMIT;
