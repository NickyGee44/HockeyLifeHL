import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClientArg } from '../types';
import * as queries from '../queries';

export function useMyJoinRequests(
  supabase: SupabaseClientArg,
  userId: string | undefined,
  leagueId: string | undefined,
) {
  return useQuery({
    queryKey: ['my-join-requests', userId, leagueId],
    queryFn: () => queries.getMyJoinRequests(supabase, userId!, leagueId!),
    enabled: !!userId && !!leagueId,
  });
}

export function useTeamsForJoin(
  supabase: SupabaseClientArg,
  leagueId: string | undefined,
) {
  return useQuery({
    queryKey: ['teams-for-join', leagueId],
    queryFn: () => queries.getTeamsForJoin(supabase, leagueId!),
    enabled: !!leagueId,
  });
}

export function useSubmitJoinRequest(
  supabase: SupabaseClientArg,
  userId: string,
  leagueId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { teamId: string; seasonId: string; message?: string }) =>
      queries.submitJoinRequest(supabase, userId, params.teamId, leagueId, params.seasonId, params.message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-join-requests', userId, leagueId] });
    },
  });
}

export function useCancelJoinRequest(
  supabase: SupabaseClientArg,
  userId: string,
  leagueId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      queries.cancelJoinRequest(supabase, userId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-join-requests', userId, leagueId] });
    },
  });
}
