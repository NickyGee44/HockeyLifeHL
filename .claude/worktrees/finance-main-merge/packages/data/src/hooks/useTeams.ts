import { useQuery } from '@tanstack/react-query';
import type { SupabaseClientArg } from '../types';
import * as queries from '../queries';

export function useTeams(supabase: SupabaseClientArg, leagueId: string | undefined) {
  return useQuery({
    queryKey: ['teams', leagueId],
    queryFn: () => queries.getTeams(supabase, leagueId!),
    enabled: !!leagueId,
  });
}

export function useTeam(supabase: SupabaseClientArg, teamId: string | undefined) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => queries.getTeamById(supabase, teamId!),
    enabled: !!teamId,
  });
}

export function useTeamRoster(
  supabase: SupabaseClientArg,
  teamId: string | undefined,
  seasonId?: string,
) {
  return useQuery({
    queryKey: ['team-roster', teamId, seasonId],
    queryFn: () => queries.getTeamRoster(supabase, teamId!, seasonId),
    enabled: !!teamId,
  });
}

export function useStandings(
  supabase: SupabaseClientArg,
  leagueId: string | undefined,
  seasonId?: string,
  divisionId?: string,
) {
  return useQuery({
    queryKey: ['standings', leagueId, seasonId, divisionId],
    queryFn: () => queries.getStandings(supabase, leagueId!, seasonId, divisionId),
    enabled: !!leagueId,
  });
}

export function usePlayerTeams(supabase: SupabaseClientArg, userId: string | undefined) {
  return useQuery({
    queryKey: ['player-teams', userId],
    queryFn: () => queries.getPlayerTeams(supabase, userId!),
    enabled: !!userId,
  });
}
