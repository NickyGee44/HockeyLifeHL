-- Add explicit metadata for captain-led self-scoring sessions.

ALTER TABLE public.scorekeeper_sessions
ADD COLUMN IF NOT EXISTS session_origin text NOT NULL DEFAULT 'assigned_scorekeeper',
ADD COLUMN IF NOT EXISTS initiating_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS initiating_team_type text,
ADD COLUMN IF NOT EXISTS initiating_captain_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scorekeeper_sessions_session_origin_check'
  ) THEN
    ALTER TABLE public.scorekeeper_sessions
      ADD CONSTRAINT scorekeeper_sessions_session_origin_check
      CHECK (session_origin IN ('assigned_scorekeeper', 'captain_self_score'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scorekeeper_sessions_initiating_team_type_check'
  ) THEN
    ALTER TABLE public.scorekeeper_sessions
      ADD CONSTRAINT scorekeeper_sessions_initiating_team_type_check
      CHECK (initiating_team_type IS NULL OR initiating_team_type IN ('home', 'away'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scorekeeper_sessions_origin
  ON public.scorekeeper_sessions(session_origin);

CREATE INDEX IF NOT EXISTS idx_scorekeeper_sessions_initiating_team
  ON public.scorekeeper_sessions(initiating_team_id);
