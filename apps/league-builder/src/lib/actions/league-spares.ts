'use server';

import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

async function requireLeagueAccess(leagueId: string) {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { ok: false as const, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: 'Not authenticated' };
  }

  return { ok: true as const, userId: user.id };
}

export async function addLeagueSpare(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '');
  const playerId = String(formData.get('playerId') || '');
  const locale = String(formData.get('locale') || 'en');
  const position = String(formData.get('position') || '') || null;

  if (!leagueId || !playerId) {
    return;
  }

  const access = await requireLeagueAccess(leagueId);
  if (!access.ok) {
    return;
  }

  const serviceSupabase = createServiceRoleClient();
  const { data: currentSeason } = await serviceSupabase
    .from('seasons')
    .select('id')
    .eq('league_id', leagueId)
    .in('status', ['active', 'draft'])
    .order('status', { ascending: true })
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  await (serviceSupabase as any)
    .from('league_spare_pool')
    .upsert(
      {
        league_id: leagueId,
        season_id: currentSeason?.id ?? null,
        player_id: playerId,
        position,
        active: true,
        added_by: access.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'league_id,player_id' },
    );

  revalidatePath(`/${locale}/dashboard/leagues/${leagueId}/spares`);
}

export async function removeLeagueSpare(formData: FormData) {
  const leagueId = String(formData.get('leagueId') || '');
  const playerId = String(formData.get('playerId') || '');
  const locale = String(formData.get('locale') || 'en');

  if (!leagueId || !playerId) {
    return;
  }

  const access = await requireLeagueAccess(leagueId);
  if (!access.ok) {
    return;
  }

  const serviceSupabase = createServiceRoleClient();
  await (serviceSupabase as any)
    .from('league_spare_pool')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('league_id', leagueId)
    .eq('player_id', playerId);

  revalidatePath(`/${locale}/dashboard/leagues/${leagueId}/spares`);
}
