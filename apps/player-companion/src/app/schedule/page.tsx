'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { format, isSameMonth, parseISO } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import {
  getUpcomingGames,
  getRecentGames,
  saveGames,
  isCacheValid,
  type Game,
} from '@/lib/offline/db';
import { downloadICalFile } from '@/lib/hooks/useICalExport';
import { GameCard, DateGroupHeader } from '@/components/schedule/GameCard';
import { MonthSelector } from '@/components/schedule/MonthSelector';
import { ListSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';

export default function SchedulePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [teamName, setTeamName] = useState('My Team');
  const [seasons, setSeasons] = useState<{ id: string; name: string }[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');

  const loadGames = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
      if (!forceRefresh) {
        const [upcoming, recent] = await Promise.all([
          getUpcomingGames(50),
          getRecentGames(20),
        ]);

        const allGames = [...recent, ...upcoming].sort(
          (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        );

        if (allGames.length > 0) {
          setGames(allGames);
        }

        const cacheValid = await isCacheValid('games');
        if (cacheValid) {
          setIsLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get player's team
      const { data: rosterData } = await supabase
        .from('team_rosters')
        .select(`
          team_id,
          teams(id, name, league_id)
        `)
        .eq('player_id', user.id)
        .eq('status', 'active')
        .single();

      if (rosterData?.teams) {
        const team = rosterData.teams as any;
        setTeamName(team.name);

        // Fetch available seasons for this league
        const { data: seasonsData } = await supabase
          .from('seasons')
          .select('id, name')
          .eq('league_id', team.league_id)
          .in('status', ['active', 'completed', 'archived'])
          .order('start_date', { ascending: false });

        if (seasonsData && seasonsData.length > 0) {
          setSeasons(seasonsData);
          if (!selectedSeasonId) {
            setSelectedSeasonId(seasonsData[0].id);
          }
        }

        // Fetch games for this team, filtered by season
        let gamesQuery = supabase
          .from('games')
          .select('*')
          .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
          .order('scheduled_at', { ascending: true });

        const activeSeasonId = selectedSeasonId || seasonsData?.[0]?.id;
        if (activeSeasonId) {
          gamesQuery = gamesQuery.eq('season_id', activeSeasonId);
        }

        const { data: gamesData } = await gamesQuery;

        if (gamesData && gamesData.length > 0) {
          // Get team names
          const teamIds = [
            ...new Set(gamesData.flatMap((g) => [g.home_team_id, g.away_team_id])),
          ];
          const { data: teamsData } = await supabase
            .from('teams')
            .select('id, name')
            .in('id', teamIds);

          const teamNameMap = new Map(teamsData?.map((t) => [t.id, t.name]) || []);

          const fetchedGames: Game[] = gamesData.map((g) => ({
            id: g.id,
            league_id: g.league_id,
            season_id: g.season_id,
            home_team_id: g.home_team_id,
            away_team_id: g.away_team_id,
            home_team_name: teamNameMap.get(g.home_team_id) || 'Home Team',
            away_team_name: teamNameMap.get(g.away_team_id) || 'Away Team',
            scheduled_at: g.scheduled_at,
            status: g.status,
            venue: g.venue,
            rink: g.rink,
            home_score: g.home_score,
            away_score: g.away_score,
            is_home: g.home_team_id === team.id,
            updated_at: new Date().toISOString(),
          }));

          await saveGames(fetchedGames);
          setGames(fetchedGames);
        }
      }
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedSeasonId]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setIsLoading(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadGames(true);
  };

  const handleExportCalendar = () => {
    if (games.length > 0) {
      downloadICalFile(games, teamName);
    }
  };

  // Filter games by selected month
  const filteredGames = useMemo(() => {
    return games.filter((game) =>
      isSameMonth(parseISO(game.scheduled_at), selectedMonth)
    );
  }, [games, selectedMonth]);

  // Group games by date
  const groupedGames = useMemo(() => {
    const groups: { date: string; games: Game[] }[] = [];

    filteredGames.forEach((game) => {
      const dateKey = format(parseISO(game.scheduled_at), 'yyyy-MM-dd');
      const existingGroup = groups.find((g) => g.date === dateKey);

      if (existingGroup) {
        existingGroup.games.push(game);
      } else {
        groups.push({ date: dateKey, games: [game] });
      }
    });

    return groups;
  }, [filteredGames]);

  return (
    <div className="px-4 pt-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between py-4 bg-neutral-950/95 backdrop-blur-lg -mx-4 px-4 border-b border-gold-500/20">
        <h1 className="text-xl font-bold text-white">Schedule</h1>
        <div className="flex items-center gap-2">
          {seasons.length > 0 && (
            <select
              value={selectedSeasonId}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium',
                'bg-neutral-850 border border-gold-500/20 text-white',
                'focus:outline-none focus:ring-2 focus:ring-gold-500/50'
              )}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleExportCalendar}
            disabled={games.length === 0}
            className={cn(
              'p-2 rounded-full bg-neutral-850 border border-gold-500/20',
              'text-gold-500 active:scale-95 transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Export to Calendar"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'p-2 rounded-full bg-neutral-850 border border-gold-500/20',
              'active:scale-95 transition-all',
              isRefreshing && 'opacity-50'
            )}
          >
            <RefreshCw
              className={cn('w-5 h-5 text-gold-500', isRefreshing && 'animate-spin')}
            />
          </button>
        </div>
      </header>

      {/* Month Selector */}
      <div className="py-4">
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Games List */}
      <div className="pb-8">
        {isLoading ? (
          <ListSkeleton count={5} />
        ) : groupedGames.length === 0 ? (
          <EmptyState type="games" />
        ) : (
          <div className="space-y-3">
            {groupedGames.map((group) => (
              <div key={group.date}>
                <DateGroupHeader date={group.date} />
                <div className="space-y-3 mt-3">
                  {group.games.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
