'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { createClient } from '@/lib/supabase/client';
import {
  getStats,
  getGameLog,
  saveStats,
  saveGameStats,
  isCacheValid,
  type PlayerStats,
  type GameStat,
} from '@/lib/offline/db';
import { HeroStatCard } from '@/components/stats/HeroStatCard';
import { StatGridCard } from '@/components/stats/StatGridCard';
import { TrendChart } from '@/components/stats/TrendChart';
import { StatsSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';

export default function StatsPage() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [gameLog, setGameLog] = useState<GameStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string>('current');

  const loadStats = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
      if (!forceRefresh) {
        const [cachedStats, cachedGameLog] = await Promise.all([
          getStats(),
          getGameLog(20),
        ]);

        if (cachedStats) setStats(cachedStats);
        if (cachedGameLog.length > 0) setGameLog(cachedGameLog);

        const cacheValid = await isCacheValid('stats');
        if (cacheValid && cachedStats) {
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

      // Fetch player stats
      const { data: statsData } = await supabase
        .from('player_stats')
        .select('*')
        .eq('player_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (statsData) {
        const playerStats: PlayerStats = {
          id: statsData.id,
          player_id: statsData.player_id,
          season_id: statsData.season_id,
          league_id: statsData.league_id,
          games_played: statsData.games_played || 0,
          goals: statsData.goals || 0,
          assists: statsData.assists || 0,
          points: statsData.points || 0,
          penalty_minutes: statsData.penalty_minutes || 0,
          plus_minus: statsData.plus_minus || 0,
          updated_at: new Date().toISOString(),
        };
        await saveStats(playerStats);
        setStats(playerStats);
      }

      // Fetch game-by-game stats
      const { data: gameStatsData } = await supabase
        .from('game_stats')
        .select(`
          id,
          game_id,
          player_id,
          stat_type,
          value,
          games(scheduled_at, home_team_id, away_team_id, home_score, away_score)
        `)
        .eq('player_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (gameStatsData && gameStatsData.length > 0) {
        // Aggregate stats by game
        const gameMap = new Map<
          string,
          { goals: number; assists: number; pim: number; game: any }
        >();

        gameStatsData.forEach((stat: any) => {
          const existing = gameMap.get(stat.game_id) || {
            goals: 0,
            assists: 0,
            pim: 0,
            game: stat.games,
          };

          if (stat.stat_type === 'Goal') existing.goals += stat.value;
          else if (stat.stat_type === 'Assist') existing.assists += stat.value;
          else if (stat.stat_type === 'PIM') existing.pim += stat.value;

          gameMap.set(stat.game_id, existing);
        });

        const processedGameLog: GameStat[] = Array.from(gameMap.entries()).map(
          ([gameId, data]) => ({
            id: gameId,
            game_id: gameId,
            player_id: user.id,
            goals: data.goals,
            assists: data.assists,
            points: data.goals + data.assists,
            penalty_minutes: data.pim,
            game_date: data.game?.scheduled_at || new Date().toISOString(),
            opponent: 'Opponent', // Would need to fetch team names
            result: 'W' as const, // Would need to calculate
          })
        );

        await saveGameStats(processedGameLog);
        setGameLog(processedGameLog);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStats(true);
  };

  // Prepare chart data
  const chartData = gameLog.slice(0, 10).reverse().map((game, index) => ({
    game: `G${index + 1}`,
    points: game.points,
    opponent: game.opponent,
  }));

  return (
    <div className="px-4 pt-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between py-4 bg-neutral-950/95 backdrop-blur-lg -mx-4 px-4 border-b border-gold-500/20">
        <h1 className="text-xl font-bold text-white">My Stats</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              'bg-neutral-850 border border-gold-500/20 text-white',
              'focus:outline-none focus:ring-2 focus:ring-gold-500/50'
            )}
          >
            <option value="current">2025-26</option>
            <option value="previous">2024-25</option>
          </select>
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

      {/* Content */}
      <div className="py-4 pb-8 space-y-4">
        {isLoading ? (
          <StatsSkeleton />
        ) : !stats ? (
          <EmptyState type="stats" />
        ) : (
          <>
            {/* Hero Stat - Points */}
            <HeroStatCard
              value={stats.points}
              label="Season Points"
              trend={4}
              trendLabel="from last season"
            />

            {/* Stat Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatGridCard value={stats.goals} label="Goals" trend={2} />
              <StatGridCard value={stats.assists} label="Assists" trend={2} />
              <StatGridCard value={stats.games_played} label="Games" />
              <StatGridCard value={stats.penalty_minutes} label="PIM" trend={-1} />
            </div>

            {/* Points Trend Chart */}
            {chartData.length > 0 && <TrendChart data={chartData} />}

            {/* Game Log */}
            {gameLog.length > 0 && (
              <div className="rounded-xl bg-neutral-850 border border-gold-500/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gold-500/20">
                  <span className="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
                    Recent Games
                  </span>
                </div>
                <div className="divide-y divide-gold-500/10">
                  {gameLog.slice(0, 5).map((game) => (
                    <div
                      key={game.id}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          vs. {game.opponent}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {new Date(game.game_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gold-400">
                            {game.points}
                          </p>
                          <p className="text-[10px] text-neutral-500">PTS</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-white">
                            {game.goals}G {game.assists}A
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
