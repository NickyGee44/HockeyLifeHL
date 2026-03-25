import { useQuery } from '@tanstack/react-query';
import type { SupabaseClientArg } from '../types';
import * as queries from '../queries';

export function useUpcomingGames(
  supabase: SupabaseClientArg,
  leagueId: string | undefined,
  limit = 5,
) {
  return useQuery({
    queryKey: ['upcoming-games', leagueId, limit],
    queryFn: () => queries.getUpcomingGames(supabase, leagueId!, limit),
    enabled: !!leagueId,
  });
}

export function useRecentGames(
  supabase: SupabaseClientArg,
  leagueId: string | undefined,
  limit = 10,
) {
  return useQuery({
    queryKey: ['recent-games', leagueId, limit],
    queryFn: () => queries.getRecentGames(supabase, leagueId!, limit),
    enabled: !!leagueId,
  });
}

export function useGamePreview(supabase: SupabaseClientArg, gameId: string | undefined) {
  return useQuery({
    queryKey: ['game-preview', gameId],
    queryFn: () => queries.getGamePreview(supabase, gameId!),
    enabled: !!gameId,
  });
}

export function useSchedule(
  supabase: SupabaseClientArg,
  leagueId: string | undefined,
  seasonId?: string,
  options?: { divisionId?: string; limit?: number },
) {
  return useQuery({
    queryKey: ['schedule', leagueId, seasonId, options?.divisionId],
    queryFn: () => queries.getSchedule(supabase, leagueId!, seasonId, options),
    enabled: !!leagueId,
  });
}

export function usePlayerUpcomingGames(
  supabase: SupabaseClientArg,
  userId: string | undefined,
  limit = 20,
) {
  return useQuery({
    queryKey: ['player-upcoming-games', userId, limit],
    queryFn: () => queries.getPlayerUpcomingGames(supabase, userId!, limit),
    enabled: !!userId,
  });
}

export function usePlayerRecentGames(
  supabase: SupabaseClientArg,
  userId: string | undefined,
  limit = 20,
) {
  return useQuery({
    queryKey: ['player-recent-games', userId, limit],
    queryFn: () => queries.getPlayerRecentGames(supabase, userId!, limit),
    enabled: !!userId,
  });
}
