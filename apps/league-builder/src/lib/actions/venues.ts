'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface VenueFull {
  id: string;
  leagueId: string;
  name: string;
  address: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  numberOfRinks: number | null;
  parkingInfo: string | null;
  createdAt: string | null;
}

export interface VenueInput {
  name: string;
  address?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  numberOfRinks?: number | null;
  parkingInfo?: string | null;
}

export interface VenueCsvRow {
  name: string;
  address?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  numberOfRinks?: number;
}

export interface AvailabilityCsvRow {
  venueName: string;
  dayOfWeek: number; // 0=Sun … 6=Sat
  startTime: string;
  endTime: string;
  maxGames?: number;
}

export interface BlackoutCsvRow {
  venueName: string;
  date: string; // YYYY-MM-DD
  reason?: string;
}

// ============================================================================
// VENUE CRUD
// ============================================================================

export async function getLeagueVenuesFull(leagueId: string): Promise<VenueFull[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('venues')
    .select('id, league_id, name, address, city, state_province, postal_code, number_of_rinks, parking_info, created_at')
    .eq('league_id', leagueId)
    .order('name', { ascending: true });

  if (error) {
    console.error('[getLeagueVenuesFull]', error);
    return [];
  }

  return (data ?? []).map((v) => ({
    id: v.id,
    leagueId: v.league_id,
    name: v.name,
    address: v.address,
    city: v.city,
    stateProvince: v.state_province,
    postalCode: v.postal_code,
    numberOfRinks: v.number_of_rinks,
    parkingInfo: v.parking_info,
    createdAt: v.created_at,
  }));
}

export async function createVenue(
  leagueId: string,
  data: VenueInput
): Promise<{ success: boolean; venue?: VenueFull; error?: string }> {
  if (!data.name?.trim()) {
    return { success: false, error: 'Venue name is required' };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: inserted, error } = await supabase
    .from('venues')
    .insert({
      league_id: leagueId,
      name: data.name.trim(),
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state_province: data.stateProvince?.trim() || null,
      postal_code: data.postalCode?.trim() || null,
      number_of_rinks: data.numberOfRinks || null,
      parking_info: data.parkingInfo?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[createVenue]', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return {
    success: true,
    venue: {
      id: inserted.id,
      leagueId: inserted.league_id,
      name: inserted.name,
      address: inserted.address,
      city: inserted.city,
      stateProvince: inserted.state_province,
      postalCode: inserted.postal_code,
      numberOfRinks: inserted.number_of_rinks,
      parkingInfo: inserted.parking_info,
      createdAt: inserted.created_at,
    },
  };
}

export async function updateVenue(
  venueId: string,
  data: VenueInput
): Promise<{ success: boolean; error?: string }> {
  if (!data.name?.trim()) {
    return { success: false, error: 'Venue name is required' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('venues')
    .update({
      name: data.name.trim(),
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state_province: data.stateProvince?.trim() || null,
      postal_code: data.postalCode?.trim() || null,
      number_of_rinks: data.numberOfRinks || null,
      parking_info: data.parkingInfo?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', venueId);

  if (error) {
    console.error('[updateVenue]', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteVenue(
  venueId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('venues')
    .delete()
    .eq('id', venueId);

  if (error) {
    console.error('[deleteVenue]', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// CSV IMPORTS
// ============================================================================

/**
 * Bulk import venues from CSV rows.
 * Skips venues whose name already exists (case-insensitive).
 */
export async function importVenuesFromCsv(
  leagueId: string,
  rows: VenueCsvRow[]
): Promise<{ success: boolean; imported: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, imported: 0, skipped: 0, errors: ['Not authenticated'] };
  }

  // Fetch existing venue names for this league (for dedup check)
  const { data: existing } = await supabase
    .from('venues')
    .select('name')
    .eq('league_id', leagueId);

  const existingNames = new Set(
    (existing ?? []).map((v) => v.name.toLowerCase().trim())
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.name?.trim()) {
      errors.push(`Row skipped: empty name`);
      skipped++;
      continue;
    }

    if (existingNames.has(row.name.toLowerCase().trim())) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('venues')
      .insert({
        league_id: leagueId,
        name: row.name.trim(),
        address: row.address?.trim() || null,
        city: row.city?.trim() || null,
        state_province: row.stateProvince?.trim() || null,
        postal_code: row.postalCode?.trim() || null,
        number_of_rinks: row.numberOfRinks || null,
      });

    if (error) {
      errors.push(`"${row.name}": ${error.message}`);
      skipped++;
    } else {
      existingNames.add(row.name.toLowerCase().trim());
      imported++;
    }
  }

  if (imported > 0) revalidatePath('/dashboard');
  return { success: true, imported, skipped, errors };
}

/**
 * Bulk import weekly availability slots from CSV rows.
 * Deduplicates by venue+day+startTime.
 */
export async function importAvailabilityFromCsv(
  leagueId: string,
  rows: AvailabilityCsvRow[]
): Promise<{ success: boolean; imported: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, imported: 0, skipped: 0, errors: ['Not authenticated'] };
  }

  // Fetch venue list for name matching
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('league_id', leagueId);

  const venueMap = new Map(
    (venues ?? []).map((v) => [v.name.toLowerCase().trim(), v.id])
  );

  // Fetch existing slots for dedup
  const { data: existing } = await supabase
    .from('venue_availability')
    .select('venue_id, day_of_week, start_time')
    .eq('league_id', leagueId);

  const existingKeys = new Set(
    (existing ?? []).map((s) => `${s.venue_id}:${s.day_of_week}:${s.start_time}`)
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const venueId = venueMap.get(row.venueName?.toLowerCase?.().trim() ?? '');
    if (!venueId) {
      errors.push(`"${row.venueName}": venue not found — add it first`);
      skipped++;
      continue;
    }

    const key = `${venueId}:${row.dayOfWeek}:${row.startTime}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('venue_availability')
      .insert({
        league_id: leagueId,
        venue_id: venueId,
        day_of_week: row.dayOfWeek,
        start_time: row.startTime,
        end_time: row.endTime,
        is_available: true,
        max_games: row.maxGames ?? null,
        created_by: userData.user.id,
      });

    if (error) {
      errors.push(`"${row.venueName}" ${row.startTime}: ${error.message}`);
      skipped++;
    } else {
      existingKeys.add(key);
      imported++;
    }
  }

  if (imported > 0) revalidatePath('/dashboard');
  return { success: true, imported, skipped, errors };
}

/**
 * Bulk import blackout dates from CSV rows.
 */
export async function importBlackoutsFromCsv(
  leagueId: string,
  rows: BlackoutCsvRow[]
): Promise<{ success: boolean; imported: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, imported: 0, skipped: 0, errors: ['Not authenticated'] };
  }

  // Fetch venue list for name matching
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('league_id', leagueId);

  const venueMap = new Map(
    (venues ?? []).map((v) => [v.name.toLowerCase().trim(), v.id])
  );

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const venueId = venueMap.get(row.venueName?.toLowerCase?.().trim() ?? '');
    if (!venueId) {
      errors.push(`"${row.venueName}": venue not found — add it first`);
      skipped++;
      continue;
    }

    if (!datePattern.test(row.date)) {
      errors.push(`"${row.venueName}" ${row.date}: invalid date format (use YYYY-MM-DD)`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('venue_blackout_dates')
      .insert({
        league_id: leagueId,
        venue_id: venueId,
        blackout_date: row.date,
        reason: row.reason?.trim() || null,
        created_by: userData.user.id,
      });

    if (error) {
      errors.push(`"${row.venueName}" ${row.date}: ${error.message}`);
      skipped++;
    } else {
      imported++;
    }
  }

  if (imported > 0) revalidatePath('/dashboard');
  return { success: true, imported, skipped, errors };
}
