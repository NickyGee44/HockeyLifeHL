import { useQuery } from '@tanstack/react-query';
import type { SupabaseClientArg } from '../types';
import * as queries from '../queries';

export function usePlayerLeagues(supabase: SupabaseClientArg, userId: string | undefined) {
  return useQuery({
    queryKey: ['player-leagues', userId],
    queryFn: () => queries.getPlayerLeagues(supabase, userId!),
    enabled: !!userId,
  });
}

export function useLeague(supabase: SupabaseClientArg, leagueId: string | undefined) {
  return useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => queries.getLeagueById(supabase, leagueId!),
    enabled: !!leagueId,
  });
}

export function useSeasons(supabase: SupabaseClientArg, leagueId: string | undefined) {
  return useQuery({
    queryKey: ['seasons', leagueId],
    queryFn: () => queries.getSeasons(supabase, leagueId!),
    enabled: !!leagueId,
  });
}

export function useCurrentSeason(supabase: SupabaseClientArg, leagueId: string | undefined) {
  return useQuery({
    queryKey: ['current-season', leagueId],
    queryFn: () => queries.getCurrentSeason(supabase, leagueId!),
    enabled: !!leagueId,
  });
}

export function useDivisions(supabase: SupabaseClientArg, leagueId: string | undefined) {
  return useQuery({
    queryKey: ['divisions', leagueId],
    queryFn: () => queries.getDivisions(supabase, leagueId!),
    enabled: !!leagueId,
  });
}

export function useLeagueStats(supabase: SupabaseClientArg, leagueId: string | undefined) {
  return useQuery({
    queryKey: ['league-stats', leagueId],
    queryFn: () => queries.getLeagueStats(supabase, leagueId!),
    enabled: !!leagueId,
  });
}
