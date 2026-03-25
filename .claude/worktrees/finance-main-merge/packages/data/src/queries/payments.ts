import type { SupabaseClientArg } from '../types';

export interface PaymentRecord {
  id: string;
  player_id: string;
  league_id: string;
  season_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description: string | null;
  stripe_payment_id: string | null;
  created_at: string;
  league?: { name: string; logo_url: string | null } | null;
  season?: { name: string } | null;
}

export interface PaymentDue {
  id: string;
  player_id: string;
  league_id: string;
  season_id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  due_date: string | null;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  league?: { name: string; slug: string; logo_url: string | null } | null;
  season?: { name: string } | null;
}

/**
 * Get payment history for a player
 */
export async function getPaymentHistory(
  supabase: SupabaseClientArg,
  playerId: string,
  limit = 50,
): Promise<PaymentRecord[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, league:leagues(name, logo_url), season:seasons(name)')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as PaymentRecord[];
}

/**
 * Get outstanding payment dues for a player
 */
export async function getPaymentsDue(
  supabase: SupabaseClientArg,
  playerId: string,
): Promise<PaymentDue[]> {
  const { data, error } = await supabase
    .from('registration_payments')
    .select('*, league:leagues(name, slug, logo_url), season:seasons(name)')
    .eq('player_id', playerId)
    .in('status', ['unpaid', 'partial', 'overdue'])
    .order('due_date', { ascending: true });

  if (error || !data) return [];
  return data as PaymentDue[];
}
