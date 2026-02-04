'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { createClient } from '@/lib/supabase/client';
import {
  getNextGame,
  getStats,
  getProfile,
  saveGames,
  saveStats,
  saveProfile,
  isCacheValid,
  type Game,
  type PlayerStats,
  type PlayerProfile,
} from '@/lib/offline/db';
import { CountdownCard } from '@/components/home/CountdownCard';
import { QuickActions } from '@/components/home/QuickActions';
import { RecentStats } from '@/components/home/RecentStats';
import { CountdownSkeleton } from '@/components/shared/Skeleton';

export default function HomePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [nextGame, setNextGame] = useState<Game | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first for offline support
      if (!forceRefresh) {
        const [cachedProfile, cachedGame, cachedStats] = await Promise.all([
          getProfile(),
          getNextGame(),
          getStats(),
        ]);

        if (cachedProfile) setProfile(cachedProfile);
        if (cachedGame) setNextGame(cachedGame);
        if (cachedStats) setStats(cachedStats);

        // Check if cache is still valid
        const gamesValid = await isCacheValid('games');
        const statsValid = await isCacheValid('stats');
        if (gamesValid && statsValid && cachedProfile) {
          setIsLoading(false);
          return;
        }
      }

      // Fetch fresh data from Supabase
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        const playerProfile: PlayerProfile = {
          id: profileData.id,
          email: profileData.email || user.email || '',
          full_name: profileData.full_name || '',
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString(),
        };
        await saveProfile(playerProfile);
        setProfile(playerProfile);
      }

      // Get player's team
      const { data: rosterData } = await supabase
        .from('team_rosters')
        .select(`
          team_id,
          jersey_number,
          position,
          teams(id, name, league_id)
        `)
        .eq('player_id', user.id)
        .eq('status', 'active')
        .single();

      if (rosterData?.teams) {
        const team = rosterData.teams as any;

        // Fetch upcoming games for this team
        const { data: gamesData } = await supabase
          .from('games')
          .select('*')
          .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(10);

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

          const games: Game[] = gamesData.map((g) => ({
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

          await saveGames(games);
          setNextGame(games[0] || null);
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
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
  };

  return (
    <div className="px-4 pt-safe">
      {/* Header */}
      <header className="flex items-center justify-between py-4">
        <div>
          <p className="text-neutral-500 text-sm">Welcome back</p>
          <h1 className="text-xl font-bold text-white">
            {profile?.full_name?.split(' ')[0] || 'Player'}
          </h1>
        </div>
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
      </header>

      {/* Content */}
      <div className="space-y-6 pb-8">
        {/* Next Game Countdown */}
        <section>
          {isLoading ? (
            <CountdownSkeleton />
          ) : (
            <CountdownCard game={nextGame} />
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <QuickActions />
        </section>

        {/* Recent Stats */}
        <section>
          {isLoading ? (
            <div className="rounded-xl bg-neutral-850 border border-gold-500/20 p-4">
              <div className="animate-shimmer h-20" />
            </div>
          ) : (
            <RecentStats stats={stats} />
          )}
        </section>
      </div>
    </div>
  );
}
