'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';

interface UpcomingGame {
  id: string;
  scheduled_at: string;
  venue: string | null;
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

interface MyUpcomingGamesProps {
  teamId?: string;
  leagueSlug: string;
}

export function MyUpcomingGames({ teamId, leagueSlug }: MyUpcomingGamesProps) {
  const [games, setGames] = useState<UpcomingGame[]>([]);
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
          venue,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(id, name, slug, logo),
          away_team:teams!games_away_team_id_fkey(id, name, slug, logo)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (!error && data) {
        // Transform nested arrays to single objects
        const transformedGames = data.map((game: any) => ({
          ...game,
          home_team: Array.isArray(game.home_team) ? game.home_team[0] : game.home_team,
          away_team: Array.isArray(game.away_team) ? game.away_team[0] : game.away_team,
        }));
        setGames(transformedGames);
      }
      setIsLoading(false);
    };

    fetchGames();
  }, [teamId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!teamId) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
          Upcoming Games
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
          Join a team to see your upcoming games
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
          Upcoming Games
        </h3>
        <Link
          href={`/${leagueSlug}/schedule`}
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
              <div className="h-16 bg-[var(--color-surface-hover)] rounded-lg" />
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No upcoming games scheduled
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {games.map((game) => {
            const isHome = game.home_team_id === teamId;
            const opponent = isHome ? game.away_team : game.home_team;

            return (
              <Link
                key={game.id}
                href={`/${leagueSlug}/games/${game.id}`}
                className="block p-4 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Opponent Logo */}
                  {opponent?.logo ? (
                    <Image
                      src={opponent.logo}
                      alt={opponent.name}
                      width={40}
                      height={40}
                      className="rounded-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[var(--color-surface-hover)] rounded-lg flex items-center justify-center text-lg font-bold text-[var(--color-text-secondary)]">
                      {opponent?.name?.charAt(0) || '?'}
                    </div>
                  )}

                  {/* Game Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase">
                        {isHome ? 'vs' : '@'}
                      </span>
                      <span className="font-medium text-[var(--color-text-primary)] truncate">
                        {opponent?.name || 'TBD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(game.scheduled_at)}
                      </span>
                      {game.venue && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{game.venue}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date Badge */}
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block px-2 py-1 bg-[var(--color-surface-hover)] rounded text-xs font-medium text-[var(--color-text-secondary)]">
                      {formatDate(game.scheduled_at)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
