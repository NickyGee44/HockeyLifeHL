import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClientArg } from '../types';
import * as queries from '../queries';

export function usePlayerProfile(supabase: SupabaseClientArg, playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-profile', playerId],
    queryFn: () => queries.getPlayerProfile(supabase, playerId!),
    enabled: !!playerId,
  });
}

export function useCurrentPlayer(supabase: SupabaseClientArg, userId: string | undefined) {
  return useQuery({
    queryKey: ['current-player', userId],
    queryFn: () => queries.getCurrentPlayerProfile(supabase, userId!),
    enabled: !!userId,
  });
}

export function useUpdateProfile(supabase: SupabaseClientArg, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: { full_name?: string; avatar_url?: string; position?: string }) =>
      queries.updatePlayerProfile(supabase, userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-player', userId] });
      queryClient.invalidateQueries({ queryKey: ['player-profile', userId] });
    },
  });
}
