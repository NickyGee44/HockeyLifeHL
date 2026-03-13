import type { SupabaseClient } from '@supabase/supabase-js';

export type FeeCollectionModel = 'individual' | 'team' | 'hybrid';
export type FeeBasis = 'player' | 'team';
export type RegistrationPaymentMode = 'hidden' | 'required' | 'optional';

export function normalizeFeeCollectionModel(
  value: string | null | undefined
): FeeCollectionModel {
  if (value === 'team' || value === 'hybrid' || value === 'individual') {
    return value;
  }

  return 'individual';
}

export function normalizeFeeBasis(value: string | null | undefined): FeeBasis {
  return value === 'team' ? 'team' : 'player';
}

export function getPlayerRegistrationFeeAmount(
  feeBasis: FeeBasis,
  feeAmountCents: number
): number {
  if (feeAmountCents <= 0) return 0;
  return feeBasis === 'team' ? 0 : feeAmountCents;
}

export function usesTeamBilling(
  feeCollectionModel: FeeCollectionModel,
  feeBasis: FeeBasis = 'player'
): boolean {
  return feeCollectionModel === 'team' || feeBasis === 'team';
}

export function getRegistrationPaymentMode(
  feeCollectionModel: FeeCollectionModel,
  feeAmountCents: number,
  feeBasis: FeeBasis = 'player'
): RegistrationPaymentMode {
  const playerFeeAmountCents = getPlayerRegistrationFeeAmount(feeBasis, feeAmountCents);

  if (playerFeeAmountCents <= 0) return 'hidden';

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

export function isPlayerFeeConfigurationMissing(
  feeCollectionModel: FeeCollectionModel,
  feeAmountCents: number,
  feeBasis: FeeBasis = 'player'
): boolean {
  return feeBasis === 'player' && feeCollectionModel !== 'team' && feeAmountCents <= 0;
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
  feeBasis: FeeBasis;
  currency: string;
}> {
  const [feeResult, model] = await Promise.all([
    (async () => {
      const feeQuery = await supabase
        .from('season_fees')
        .select('amount_cents, currency, fee_basis')
        .eq('league_id', leagueId)
        .eq('season_id', seasonId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        feeQuery.error &&
        (feeQuery.error.code === '42703' || feeQuery.error.message?.includes('fee_basis'))
      ) {
        const fallbackQuery = await supabase
          .from('season_fees')
          .select('amount_cents, currency')
          .eq('league_id', leagueId)
          .eq('season_id', seasonId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          data: fallbackQuery.data
            ? { ...fallbackQuery.data, fee_basis: 'player' as const }
            : null,
        };
      }

      if (feeQuery.error) {
        throw feeQuery.error;
      }

      return {
        data: feeQuery.data
          ? { ...feeQuery.data, fee_basis: normalizeFeeBasis(feeQuery.data.fee_basis) }
          : null,
      };
    })(),
    getSeasonFeeCollectionModel(supabase, seasonId),
  ]);

  return {
    feeAmountCents: feeResult.data?.amount_cents ?? 0,
    feeCollectionModel: model,
    feeBasis: normalizeFeeBasis(feeResult.data?.fee_basis),
    currency: feeResult.data?.currency ?? 'cad',
  };
}
