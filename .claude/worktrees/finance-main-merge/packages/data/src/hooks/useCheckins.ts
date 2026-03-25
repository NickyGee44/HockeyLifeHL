import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClientArg, CheckinStatus } from '../types';
import * as queries from '../queries';

export function useMyCheckins(
  supabase: SupabaseClientArg,
  userId: string | undefined,
  teamId: string | undefined,
) {
  return useQuery({
    queryKey: ['my-checkins', userId, teamId],
    queryFn: () => queries.getMyCheckins(supabase, userId!, teamId!),
    enabled: !!userId && !!teamId,
  });
}

export function useGameCheckins(
  supabase: SupabaseClientArg,
  gameId: string | undefined,
  teamId: string | undefined,
) {
  return useQuery({
    queryKey: ['game-checkins', gameId, teamId],
    queryFn: () => queries.getGameCheckins(supabase, gameId!, teamId!),
    enabled: !!gameId && !!teamId,
  });
}

export function useCheckinSummaries(
  supabase: SupabaseClientArg,
  teamId: string | undefined,
  gameIds: string[],
) {
  return useQuery({
    queryKey: ['checkin-summaries', teamId, gameIds],
    queryFn: () => queries.getCheckinSummaries(supabase, teamId!, gameIds),
    enabled: !!teamId && gameIds.length > 0,
  });
}

export function useUpdateCheckin(
  supabase: SupabaseClientArg,
  userId: string,
  gameId: string,
  teamId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ status, note }: { status: CheckinStatus; note?: string }) =>
      queries.updateGameCheckin(supabase, userId, gameId, teamId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-checkins', userId, teamId] });
      queryClient.invalidateQueries({ queryKey: ['game-checkins', gameId, teamId] });
      queryClient.invalidateQueries({ queryKey: ['checkin-summaries', teamId] });
    },
  });
}
