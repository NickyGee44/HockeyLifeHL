'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { revalidatePath } from 'next/cache';

export interface PlayerImportRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;   // Forward | Defense | Goalie (case-insensitive)
  jerseyNumber: string;
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

const VALID_POSITIONS = new Set(['forward', 'defense', 'goalie']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePosition(raw: string): 'Forward' | 'Defense' | 'Goalie' | null {
  const lower = raw.toLowerCase().trim();
  if (lower === 'forward' || lower === 'f' || lower === 'fwd') return 'Forward';
  if (lower === 'defense' || lower === 'd' || lower === 'def' || lower === 'defence') return 'Defense';
  if (lower === 'goalie' || lower === 'g' || lower === 'goaltender') return 'Goalie';
  return null;
}

export async function importPlayersFromCSV(
  leagueId: string,
  seasonId: string,
  rows: PlayerImportRow[]
): Promise<ActionResult<{ imported: number; skipped: number; errors: string[] }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  if (!rows.length) {
    return { success: false, error: 'No rows to import' };
  }

  if (rows.length > 200) {
    return { success: false, error: 'Maximum 200 players per import' };
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch existing registrations for this season to detect duplicates.
  // Must use serviceClient — RLS on profiles restricts the joined column to auth.uid() only,
  // which would return nothing for an admin looking at other players' profiles.
  const { data: existingRegs } = await serviceClient
    .from('registration_submissions')
    .select('player_id, profiles!inner(email)')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId);

  const registeredEmails = new Set<string>();
  for (const reg of existingRegs || []) {
    const profile = reg.profiles as unknown as { email: string } | null;
    if (profile?.email) {
      registeredEmails.add(profile.email.toLowerCase());
    }
  }

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const email = row.email?.trim().toLowerCase();
    const firstName = row.firstName?.trim();
    const lastName = row.lastName?.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    if (!email || !EMAIL_REGEX.test(email)) {
      errors.push(`Row ${rowNum}: Invalid or missing email`);
      continue;
    }
    if (!fullName) {
      errors.push(`Row ${rowNum}: Missing player name`);
      continue;
    }

    // Skip if already registered this season
    if (registeredEmails.has(email)) {
      skipped++;
      continue;
    }

    const position = row.position ? normalizePosition(row.position) : null;
    const jerseyNumber = row.jerseyNumber ? parseInt(row.jerseyNumber, 10) : null;
    const phone = row.phone?.trim() || null;

    // Look up or create profile — serviceClient bypasses RLS so we can read
    // any profile by email regardless of who is calling
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let profileId: string;

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      // Create a profile stub — player can claim it by signing up with this email
      const newId = crypto.randomUUID();
      const { error: profileError } = await serviceClient
        .from('profiles')
        .insert({
          id: newId,
          email,
          full_name: fullName,
          phone,
          position: position ?? undefined,
          jersey_number: jerseyNumber ?? undefined,
          is_legacy_import: true,
        });

      if (profileError) {
        errors.push(`Row ${rowNum}: Failed to create profile for ${email}`);
        continue;
      }
      profileId = newId;
    }

    // Create registration submission — serviceClient required because RLS policy
    // "Players can submit registrations" checks player_id = auth.uid(), but here
    // the admin is auth'd and player_id is the imported player's UUID (different person).
    const { error: regError } = await serviceClient
      .from('registration_submissions')
      .insert({
        league_id: leagueId,
        season_id: seasonId,
        player_id: profileId,
        registration_type: 'free_agent',
        status: 'approved',
        preferred_position: position,
        preferred_jersey_number: isNaN(jerseyNumber as number) ? null : jerseyNumber,
        submitted_at: new Date().toISOString(),
      });

    if (regError) {
      errors.push(`Row ${rowNum}: Failed to register ${email} — ${regError.message}`);
      continue;
    }

    registeredEmails.add(email);
    imported++;
  }

  if (imported > 0) {
    revalidatePath(`/dashboard/leagues/${leagueId}/registrations`);
  }

  return {
    success: true,
    data: { imported, skipped, errors },
  };
}
