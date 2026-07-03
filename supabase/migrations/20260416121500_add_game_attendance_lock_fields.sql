ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS home_attendance_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS away_attendance_locked_at timestamptz;

COMMENT ON COLUMN public.games.home_attendance_locked_at IS 'Timestamp when the home captain locked pre-game attendance for scorekeeping';
COMMENT ON COLUMN public.games.away_attendance_locked_at IS 'Timestamp when the away captain locked pre-game attendance for scorekeeping';
