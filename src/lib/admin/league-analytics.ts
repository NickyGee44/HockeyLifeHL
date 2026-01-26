"use server";

import { createClient } from "@/lib/supabase/server";

export type LeagueAnalytics = {
  users: {
    total: number;
    active_30d: number;
    new_30d: number;
    by_role: {
      owners: number;
      admins: number;
      captains: number;
      scorekeepers: number;
      players: number;
    };
  };
  teams: {
    total: number;
    active: number;
  };
  games: {
    total: number;
    completed: number;
    scheduled: number;
    this_season: number;
    completion_rate: number;
  };
  activity: {
    last_game: string | null;
    last_login: string | null;
    games_per_week: number;
    health_score: number; // 0-100
  };
  growth: {
    users_trend: Array<{ date: string; count: number }>;
    games_trend: Array<{ date: string; count: number }>;
  };
};

export type AnalyticsResult = {
  error?: string;
  analytics?: LeagueAnalytics;
};

/**
 * League Analytics Server Actions
 *
 * Provides detailed analytics for individual leagues
 * Used in admin league details pages
 */

/**
 * Get comprehensive analytics for a league
 */
export async function getLeagueAnalytics(leagueId: string): Promise<AnalyticsResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    // === USER METRICS ===

    // Total users
    const { count: totalUsers } = await supabase
      .from('league_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'active');

    // New users in last 30 days
    const { count: newUsers } = await supabase
      .from('league_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .gte('created_at', thirtyDaysAgoISO);

    // Users by role
    const { data: usersByRole } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', leagueId)
      .eq('status', 'active');

    const roleCount = {
      owners: 0,
      admins: 0,
      captains: 0,
      scorekeepers: 0,
      players: 0,
    };

    (usersByRole || []).forEach((membership) => {
      const role = membership.role as keyof typeof roleCount;
      if (role in roleCount) {
        roleCount[role]++;
      }
    });

    // === TEAM METRICS ===

    const { count: totalTeams } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    // Active teams (teams with active rosters in current season)
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('league_id', leagueId)
      .in('status', ['active', 'playoffs'])
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    let activeTeams = 0;
    if (activeSeason) {
      const { count } = await supabase
        .from('rosters')
        .select('team_id', { count: 'exact', head: true })
        .eq('season_id', activeSeason.id);
      activeTeams = count || 0;
    }

    // === GAME METRICS ===

    const { count: totalGames } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    const { count: completedGames } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'completed');

    const { count: scheduledGames } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'scheduled');

    let thisSeasonGames = 0;
    if (activeSeason) {
      const { count } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('season_id', activeSeason.id);
      thisSeasonGames = count || 0;
    }

    const completionRate = totalGames && totalGames > 0
      ? Math.round((completedGames || 0) / totalGames * 100)
      : 0;

    // === ACTIVITY METRICS ===

    // Last game played
    const { data: lastGame } = await supabase
      .from('games')
      .select('scheduled_at')
      .eq('league_id', leagueId)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .single();

    // Games in last 7 days
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: gamesLast7Days } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'completed')
      .gte('scheduled_at', sevenDaysAgo.toISOString());

    const gamesPerWeek = gamesLast7Days || 0;

    // Calculate health score (0-100)
    // Factors: active users, recent games, completion rate
    let healthScore = 0;
    if (totalUsers && totalUsers > 0) healthScore += 30;
    if (totalTeams && totalTeams >= 4) healthScore += 20;
    if (gamesPerWeek >= 2) healthScore += 25;
    if (completionRate >= 80) healthScore += 25;

    // === GROWTH TRENDS ===

    // User growth over last 30 days (weekly buckets)
    const usersTrend: Array<{ date: string; count: number }> = [];
    for (let i = 4; i >= 0; i--) {
      const bucketEnd = new Date(now);
      bucketEnd.setDate(bucketEnd.getDate() - (i * 7));
      const bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketStart.getDate() - 7);

      const { count } = await supabase
        .from('league_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('status', 'active')
        .lte('created_at', bucketEnd.toISOString());

      usersTrend.push({
        date: bucketEnd.toISOString().split('T')[0],
        count: count || 0,
      });
    }

    // Games trend over last 30 days (weekly buckets)
    const gamesTrend: Array<{ date: string; count: number }> = [];
    for (let i = 4; i >= 0; i--) {
      const bucketEnd = new Date(now);
      bucketEnd.setDate(bucketEnd.getDate() - (i * 7));
      const bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketStart.getDate() - 7);

      const { count } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('status', 'completed')
        .gte('scheduled_at', bucketStart.toISOString())
        .lte('scheduled_at', bucketEnd.toISOString());

      gamesTrend.push({
        date: bucketEnd.toISOString().split('T')[0],
        count: count || 0,
      });
    }

    const analytics: LeagueAnalytics = {
      users: {
        total: totalUsers || 0,
        active_30d: totalUsers || 0, // Simplified - all active memberships
        new_30d: newUsers || 0,
        by_role: roleCount,
      },
      teams: {
        total: totalTeams || 0,
        active: activeTeams,
      },
      games: {
        total: totalGames || 0,
        completed: completedGames || 0,
        scheduled: scheduledGames || 0,
        this_season: thisSeasonGames,
        completion_rate: completionRate,
      },
      activity: {
        last_game: lastGame?.scheduled_at || null,
        last_login: null, // Would need login tracking
        games_per_week: gamesPerWeek,
        health_score: healthScore,
      },
      growth: {
        users_trend: usersTrend,
        games_trend: gamesTrend,
      },
    };

    return { analytics };
  } catch (error: any) {
    console.error('Error in getLeagueAnalytics:', error);
    return { error: error.message || 'Failed to fetch league analytics' };
  }
}

/**
 * Get platform-wide analytics
 * Summary across all leagues
 */
export async function getPlatformAnalytics(): Promise<{
  error?: string;
  analytics?: {
    total_leagues: number;
    active_leagues: number;
    total_users: number;
    total_games: number;
    leagues_by_status: {
      active: number;
      suspended: number;
      archived: number;
    };
  };
}> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Total leagues
    const { count: totalLeagues } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true });

    // Active leagues
    const { count: activeLeagues } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Leagues by status
    const { data: leaguesByStatus } = await supabase
      .from('leagues')
      .select('status');

    const statusCount = {
      active: 0,
      suspended: 0,
      archived: 0,
    };

    (leaguesByStatus || []).forEach((league) => {
      const status = league.status as keyof typeof statusCount;
      if (status in statusCount) {
        statusCount[status]++;
      }
    });

    // Total users across all leagues
    const { count: totalUsers } = await supabase
      .from('league_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Total games across all leagues
    const { count: totalGames } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true });

    return {
      analytics: {
        total_leagues: totalLeagues || 0,
        active_leagues: activeLeagues || 0,
        total_users: totalUsers || 0,
        total_games: totalGames || 0,
        leagues_by_status: statusCount,
      },
    };
  } catch (error: any) {
    console.error('Error in getPlatformAnalytics:', error);
    return { error: error.message || 'Failed to fetch platform analytics' };
  }
}
