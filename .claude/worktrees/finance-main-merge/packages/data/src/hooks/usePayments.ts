import { useQuery } from '@tanstack/react-query';
import type { SupabaseClientArg } from '../types';
import * as queries from '../queries';

export function usePaymentHistory(supabase: SupabaseClientArg, playerId: string | undefined) {
  return useQuery({
    queryKey: ['payment-history', playerId],
    queryFn: () => queries.getPaymentHistory(supabase, playerId!),
    enabled: !!playerId,
  });
}

export function usePaymentsDue(supabase: SupabaseClientArg, playerId: string | undefined) {
  return useQuery({
    queryKey: ['payments-due', playerId],
    queryFn: () => queries.getPaymentsDue(supabase, playerId!),
    enabled: !!playerId,
  });
}
