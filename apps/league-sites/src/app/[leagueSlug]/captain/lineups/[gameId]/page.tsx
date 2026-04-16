'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { useLeague } from '@/hooks/useLeague';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { CaptainGameDayPage } from '@/components/captain/CaptainGameDayPage';

export default function CaptainLineupPage({
  params,
}: {
  params: Promise<{ leagueSlug: string; gameId: string }>;
}) {
  const { leagueSlug, gameId } = use(params);
  const { league } = useLeague();
  const { teams, currentTeam, isLoading: profileLoading } = usePlayerProfile(league?.id);
  const [gameTeamIds, setGameTeamIds] = useState<{ homeTeamId: string; awayTeamId: string } | null>(null);
  const [gameLookupLoading, setGameLookupLoading] = useState(true);
  const [gameLookupError, setGameLookupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGameTeams() {
      if (!league?.id || !gameId) {
        setGameLookupLoading(false);
        return;
      }

      setGameLookupLoading(true);
      setGameLookupError(null);

      const supabase = createClient();
      const { data, error } = await supabase
        .from('games')
        .select('home_team_id, away_team_id, league_id')
        .eq('id', gameId)
        .eq('league_id', league.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setGameLookupError(error.message);
        setGameTeamIds(null);
        setGameLookupLoading(false);
        return;
      }

      if (!data) {
        setGameLookupError('Game not found');
        setGameTeamIds(null);
        setGameLookupLoading(false);
        return;
      }

      setGameTeamIds({
        homeTeamId: data.home_team_id,
        awayTeamId: data.away_team_id,
      });
      setGameLookupLoading(false);
    }

    loadGameTeams();
    return () => {
      cancelled = true;
    };
  }, [gameId, league?.id]);

  const requestedGameTeam = useMemo(() => {
    const captainTeams = teams.filter((team) => team.is_captain || team.is_alternate);

    if (gameTeamIds) {
      const matchedTeam = captainTeams.find(
        (team) => team.team_id === gameTeamIds.homeTeamId || team.team_id === gameTeamIds.awayTeamId,
      );
      if (matchedTeam) {
        return matchedTeam;
      }
    }

    const matchingCurrentTeam = captainTeams.find((team) => team.team_id === currentTeam?.team_id);
    if (matchingCurrentTeam) {
      return matchingCurrentTeam;
    }

    return captainTeams[0] ?? null;
  }, [currentTeam?.team_id, gameTeamIds, teams]);

  const canManage = !!(requestedGameTeam?.is_captain || requestedGameTeam?.is_alternate);

  if (profileLoading || gameLookupLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading Game Day...</p>
        </div>
      </div>
    );
  }

  if (gameLookupError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-2xl font-black text-white">Could not load Game Day</h1>
          <p className="mt-3 text-sm leading-6 text-amber-100/85">{gameLookupError}</p>
          <Link
            href={`/${leagueSlug}/captain`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to captain dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!requestedGameTeam?.team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-2xl font-black text-white">No team found</h1>
          <p className="mt-3 text-sm leading-6 text-amber-100/85">You need a captain team tied to this game before you can access Game Day.</p>
          <Link
            href={`/${leagueSlug}/captain`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to captain dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 text-center">
          <Shield className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 text-2xl font-black text-white">Captain access required</h1>
          <p className="mt-3 text-sm leading-6 text-amber-100/85">Only captains and alternate captains can manage Game Day.</p>
          <Link
            href={`/${leagueSlug}/captain`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to captain dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CaptainGameDayPage
      leagueSlug={leagueSlug}
      requestedGameId={gameId}
      teamId={requestedGameTeam.team_id}
      canManage={canManage}
    />
  );
}
