import { useQuery } from '@tanstack/react-query';
import type { SupabaseClientArg } from '../types';
import * as queries from '../queries';

export function useStatsLeaders(
  supabase: SupabaseClientArg,
  leagueId: string | undefined,
  seasonId?: string,
  options?: { limit?: number; divisionId?: string },
) {
  return useQuery({
    queryKey: ['stats-leaders', leagueId, seasonId, options?.divisionId],
    queryFn: () => queries.getStatsLeaders(supabase, leagueId!, seasonId, options),
    enabled: !!leagueId,
  });
}

export function useGoalieLeaders(
  supabase: SupabaseClientArg,
  leagueId: string | undefined,
  seasonId?: string,
) {
  return useQuery({
    queryKey: ['goalie-leaders', leagueId, seasonId],
    queryFn: () => queries.getGoalieLeaders(supabase, leagueId!, seasonId),
    enabled: !!leagueId,
  });
}

export function usePlayerCareerStats(supabase: SupabaseClientArg, playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-career-stats', playerId],
    queryFn: () => queries.getPlayerCareerStats(supabase, playerId!),
    enabled: !!playerId,
  });
}

export function usePlayerGameLog(
  supabase: SupabaseClientArg,
  playerId: string | undefined,
  seasonId?: string,
) {
  return useQuery({
    queryKey: ['player-game-log', playerId, seasonId],
    queryFn: () => queries.getPlayerGameLog(supabase, playerId!, seasonId),
    enabled: !!playerId,
  });
}

export function usePlayerBadges(supabase: SupabaseClientArg, playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-badges', playerId],
    queryFn: () => queries.getPlayerBadges(supabase, playerId!),
    enabled: !!playerId,
  });
}
