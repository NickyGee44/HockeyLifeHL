import type { SupabaseClient } from '@supabase/supabase-js';

export type FeeCollectionModel = 'individual' | 'team' | 'hybrid';
export type RegistrationPaymentMode = 'hidden' | 'required' | 'optional';

export function normalizeFeeCollectionModel(
  value: string | null | undefined
): FeeCollectionModel {
  if (value === 'team' || value === 'hybrid' || value === 'individual') {
    return value;
  }

  return 'individual';
}

export function getRegistrationPaymentMode(
  feeCollectionModel: FeeCollectionModel,
  feeAmountCents: number
): RegistrationPaymentMode {
  if (feeAmountCents <= 0) return 'hidden';

  switch (feeCollectionModel) {
    case 'team':
      return 'hidden';
    case 'hybrid':
      return 'optional';
    case 'individual':
    default:
      return 'required';
  }
}

export async function getSeasonFeeCollectionModel(
  supabase: SupabaseClient<any>,
  seasonId: string
): Promise<FeeCollectionModel> {
  const { data, error } = await (supabase as any)
    .from('seasons')
    .select('fee_collection_model')
    .eq('id', seasonId)
    .maybeSingle();

  if (error) {
    if (
      error.code === '42703' ||
      error.message?.includes('fee_collection_model')
    ) {
      return 'individual';
    }

    throw error;
  }

  return normalizeFeeCollectionModel(data?.fee_collection_model);
}

export async function getSeasonPaymentSettings(
  supabase: SupabaseClient<any>,
  leagueId: string,
  seasonId: string
): Promise<{
  feeAmountCents: number;
  feeCollectionModel: FeeCollectionModel;
  currency: string;
}> {
  const [feeResult, model] = await Promise.all([
    supabase
      .from('season_fees')
      .select('amount_cents, currency')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getSeasonFeeCollectionModel(supabase, seasonId),
  ]);

  return {
    feeAmountCents: feeResult.data?.amount_cents ?? 0,
    feeCollectionModel: model,
    currency: feeResult.data?.currency ?? 'cad',
  };
}
