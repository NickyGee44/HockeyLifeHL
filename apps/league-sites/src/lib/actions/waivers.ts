'use server';

import { revalidatePath } from 'next/cache';
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/server';
import { pickRegistrationSeason } from '@/lib/registration/seasons';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type RegistrationSeasonRow = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
};

type RegistrationRow = {
  id: string;
  season_id: string;
};

export async function signLeagueWaiver(
  leagueSlug: string,
  waiverId: string,
  signedName: string
): Promise<ActionResult<{ waiverId: string; agreedAt: string }>> {
  const authSupabase = await createAuthClient();
  const serviceSupabase = createServiceRoleClient();

  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to sign the waiver.' };
  }

  const safeName = signedName.trim();
  if (!safeName) {
    return { success: false, error: 'Please enter your full legal name.' };
  }

  const { data: league, error: leagueError } = await serviceSupabase
    .from('leagues')
    .select('id, slug')
    .eq('slug', leagueSlug)
    .single();

  if (leagueError || !league) {
    return { success: false, error: 'League not found.' };
  }

  const { data: waiver, error: waiverError } = await serviceSupabase
    .from('league_waiver_templates')
    .select('id, league_id, title, version, content_hash')
    .eq('id', waiverId)
    .eq('league_id', league.id)
    .eq('is_active', true)
    .single();

  if (waiverError || !waiver) {
    return { success: false, error: 'Waiver not found.' };
  }

  const agreedAt = new Date().toISOString();

  const { data: seasons } = await serviceSupabase
    .from('seasons')
    .select('id, name, status, start_date, registration_opens_at, registration_closes_at')
    .eq('league_id', league.id)
    .order('start_date', { ascending: false });

  const targetRegistrationSeason = pickRegistrationSeason(
    ((seasons || []) as RegistrationSeasonRow[]) ?? [],
    new Date()
  );

  const { data: existingWaiver } = await serviceSupabase
    .from('player_waivers')
    .select('id')
    .eq('league_id', league.id)
    .eq('player_id', user.id)
    .eq('waiver_content_hash', waiver.content_hash)
    .order('agreed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let signedWaiverId = existingWaiver?.id || null;

  if (!signedWaiverId) {
    const { data: newWaiver, error: insertError } = await serviceSupabase
      .from('player_waivers')
      .insert({
        league_id: league.id,
        player_id: user.id,
        season_id: targetRegistrationSeason?.id || null,
        signature_data: safeName,
        signature_type: 'typed',
        signed_name: safeName,
        waiver_version: waiver.version,
        waiver_content_hash: waiver.content_hash,
        waiver_accepted: true,
        waiver_accepted_at: agreedAt,
        agreed_at: agreedAt,
      })
      .select('id')
      .single();

    if (insertError || !newWaiver) {
      console.error('Sign waiver error:', insertError);
      return { success: false, error: 'Failed to save your waiver signature.' };
    }

    signedWaiverId = newWaiver.id;
  }

  let registrationIdsToUpdate: string[] = [];

  if (targetRegistrationSeason?.id) {
    const { data: targetRegistrations } = await serviceSupabase
      .from('registration_submissions')
      .select('id')
      .eq('league_id', league.id)
      .eq('player_id', user.id)
      .eq('season_id', targetRegistrationSeason.id)
      .not('submitted_at', 'is', null)
      .in('status', ['pending', 'approved', 'waitlisted']);

    registrationIdsToUpdate = (targetRegistrations || []).map((row: { id: string }) => row.id);
  }

  if (registrationIdsToUpdate.length === 0) {
    const { data: fallbackRegistrations } = await serviceSupabase
      .from('registration_submissions')
      .select('id, season_id')
      .eq('league_id', league.id)
      .eq('player_id', user.id)
      .not('submitted_at', 'is', null)
      .in('status', ['pending', 'approved', 'waitlisted'])
      .order('created_at', { ascending: false })
      .limit(5);

    registrationIdsToUpdate = ((fallbackRegistrations || []) as RegistrationRow[]).map(
      (row) => row.id
    );
  }

  if (registrationIdsToUpdate.length > 0) {
    await serviceSupabase
      .from('registration_submissions')
      .update({ waiver_id: signedWaiverId })
      .in('id', registrationIdsToUpdate);
  }

  revalidatePath(`/${leagueSlug}/me/waivers`);
  revalidatePath(`/${leagueSlug}/me`);

  return {
    success: true,
    data: {
      waiverId: signedWaiverId,
      agreedAt,
    },
  };
}
