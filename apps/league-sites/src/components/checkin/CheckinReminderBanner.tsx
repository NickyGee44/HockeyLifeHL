'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useUser } from '@/hooks/useUser';

type CheckinStatus = 'confirmed' | 'tentative' | 'out' | 'no_response';

interface CheckinReminderBannerProps {
  leagueId: string;
  leagueSlug: string;
  seasonId: string | null;
}

interface RelevantGameRow {
  id: string;
  scheduled_at: string;
  status: string;
}

function normalizeStatus(value: string | null | undefined): CheckinStatus {
  if (value === 'confirmed' || value === 'tentative' || value === 'out') {
    return value;
  }
  return 'no_response';
}

function selectNextGame(games: RelevantGameRow[]) {
  const now = Date.now();
  const inProgress = games.find((game) => game.status === 'in_progress');
  if (inProgress) return inProgress;

  const upcoming = games.find((game) => new Date(game.scheduled_at).getTime() >= now);
  if (upcoming) return upcoming;

  return games[0] ?? null;
}

function getTeamColor(value: string | null | undefined) {
  if (!value) return '#2563eb';
  const trimmed = value.trim().replace(/^#/, '');
  return /^[0-9a-f]{3,8}$/i.test(trimmed) ? `#${trimmed}` : '#2563eb';
}

export function CheckinReminderBanner({ leagueId, leagueSlug, seasonId }: CheckinReminderBannerProps) {
  const { user, isLoading: userLoading } = useUser();
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(leagueId, seasonId);
  const [nextGame, setNextGame] = useState<RelevantGameRow | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus>('no_response');
  const [isLoading, setIsLoading] = useState(true);

  const team = currentTeam?.team ?? null;
  const teamId = currentTeam?.team_id ?? null;
  const teamSlug = team?.slug ?? null;
  const teamColor = useMemo(() => getTeamColor(team?.primary_color), [team?.primary_color]);

  const loadCheckinState = useCallback(async () => {
    if (!user || !teamId || !teamSlug) {
      setNextGame(null);
      setCheckinStatus('no_response');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    let gamesQuery = supabase
      .from('games')
      .select('id, scheduled_at, status')
      .eq('league_id', leagueId)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
      .limit(12);

    if (seasonId) {
      gamesQuery = gamesQuery.eq('season_id', seasonId);
    }

    const { data: gamesData, error: gamesError } = await gamesQuery;

    if (gamesError) {
      console.error('Failed to load next game for check-in banner:', gamesError);
      setNextGame(null);
      setCheckinStatus('no_response');
      setIsLoading(false);
      return;
    }

    const resolvedGame = selectNextGame((gamesData || []) as RelevantGameRow[]);
    setNextGame(resolvedGame);

    if (!resolvedGame) {
      setCheckinStatus('no_response');
      setIsLoading(false);
      return;
    }

    const { data: checkinData, error: checkinError } = await supabase
      .from('game_checkins')
      .select('status')
      .eq('game_id', resolvedGame.id)
      .eq('team_id', teamId)
      .eq('player_id', user.id)
      .maybeSingle();

    if (checkinError) {
      console.error('Failed to load player check-in status:', checkinError);
    }

    setCheckinStatus(normalizeStatus(checkinData?.status));
    setIsLoading(false);
  }, [leagueId, seasonId, teamId, teamSlug, user]);

  useEffect(() => {
    if (userLoading || profileLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loadCheckinState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCheckinState, profileLoading, userLoading]);

  useEffect(() => {
    const handleCheckinUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ gameId?: string; playerId?: string; status?: string }>).detail;
      if (!detail || detail.gameId !== nextGame?.id || detail.playerId !== user?.id) {
        return;
      }

      setCheckinStatus(normalizeStatus(detail.status));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCheckinState();
      }
    };

    window.addEventListener('team-checkin-updated', handleCheckinUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('team-checkin-updated', handleCheckinUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadCheckinState, nextGame?.id, user?.id]);

  if (
    userLoading ||
    profileLoading ||
    isLoading ||
    !user ||
    !teamId ||
    !teamSlug ||
    !nextGame ||
    checkinStatus !== 'no_response'
  ) {
    return null;
  }

  return (
    <div
      className="league-site-chrome relative z-30 border-b px-4 py-3 backdrop-blur-xl"
      style={{
        borderColor: `${teamColor}55`,
        background:
          `linear-gradient(135deg, ${teamColor}35 0%, rgba(255,255,255,0.12) 48%, rgba(15,23,42,0.32) 100%)`,
        boxShadow: `0 18px 44px ${teamColor}26`,
      }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/20 text-white shadow-lg"
            style={{ boxShadow: `0 0 28px ${teamColor}55` }}
          >
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="truncate text-sm font-semibold text-white md:text-base">Check in for your Game!</p>
        </div>

        <Link
          href={`/${leagueSlug}/teams/${teamSlug}#next-game`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/35 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          Check in
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
