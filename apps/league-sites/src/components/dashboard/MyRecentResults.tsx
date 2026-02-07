'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, ChevronRight } from 'lucide-react';

interface RecentGame {
  id: string;
  scheduled_at: string;
  home_score: number | null;
  away_score: number | null;
  home_team_id: string;
  away_team_id: string;
  home_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  } | null;
  away_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  } | null;
}

interface MyRecentResultsProps {
  teamId?: string;
  leagueSlug: string;
}

export function MyRecentResults({ teamId, leagueSlug }: MyRecentResultsProps) {
  const [games, setGames] = useState<RecentGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false);
      return;
    }

    const fetchGames = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          scheduled_at,
          home_score,
          away_score,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url),
          away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .in('status', ['completed'])
        .order('scheduled_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        // Transform nested arrays to single objects and map logo_url to logo
        const transformedGames = data.map((game: any) => {
          const rawHomeTeam = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team;
          const rawAwayTeam = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team;
          return {
            ...game,
            home_team: rawHomeTeam ? { ...rawHomeTeam, logo: rawHomeTeam.logo_url } : null,
            away_team: rawAwayTeam ? { ...rawAwayTeam, logo: rawAwayTeam.logo_url } : null,
          };
        });
        setGames(transformedGames);
      }
      setIsLoading(false);
    };

    fetchGames();
  }, [teamId]);

  const getResult = (game: RecentGame) => {
    const isHome = game.home_team_id === teamId;
    const myScore = isHome ? game.home_score : game.away_score;
    const theirScore = isHome ? game.away_score : game.home_score;

    if (myScore === null || theirScore === null) return null;

    if (myScore > theirScore) return 'W';
    if (myScore < theirScore) return 'L';
    return 'T';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (!teamId) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[var(--league-primary)]" />
          Recent Results
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
          Join a team to see your game results
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[var(--league-primary)]" />
          Recent Results
        </h3>
        <Link
          href={`/${leagueSlug}/scores`}
          className="text-sm text-[var(--league-primary)] hover:underline flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-[var(--color-surface-hover)] rounded-lg" />
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No completed games yet
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {games.map((game) => {
            const isHome = game.home_team_id === teamId;
            const opponent = isHome ? game.away_team : game.home_team;
            const result = getResult(game);
            const myScore = isHome ? game.home_score : game.away_score;
            const theirScore = isHome ? game.away_score : game.home_score;

            return (
              <Link
                key={game.id}
                href={`/${leagueSlug}/games/${game.id}`}
                className="flex items-center gap-3 p-4 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                {/* Result Badge */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    result === 'W'
                      ? 'bg-green-500/20 text-green-400'
                      : result === 'L'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {result || '-'}
                </div>

                {/* Opponent */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {opponent?.logo ? (
                    <Image
                      src={opponent.logo}
                      alt={opponent.name}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-[var(--color-surface-hover)] rounded flex items-center justify-center text-xs font-bold text-[var(--color-text-secondary)]">
                      {opponent?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {isHome ? 'vs' : '@'}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {opponent?.name || 'TBD'}
                  </span>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <span className="text-lg font-bold text-[var(--color-text-primary)]">
                    {myScore}-{theirScore}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)] ml-2">
                    {formatDate(game.scheduled_at)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
