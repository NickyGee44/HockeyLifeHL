'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { revalidatePath } from 'next/cache';
import { getSeasonParticipationTeamIds } from '@/lib/seasons/team-participation';
import { buildImportablePreviousSeasonPlayers } from '@/lib/players/previous-season-import';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';

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

type PreviousSeasonOption = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export type PreviousSeasonPlayerImportCandidate = {
  playerId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  teamId: string | null;
  teamName: string | null;
  position: string | null;
  jerseyNumber: number | null;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isDevelopment = process.env.NODE_ENV !== 'production';

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
          // position intentionally omitted: profiles.position is constrained to
          // short codes (C/LW/RW/D/G) while the imported value is a long label
          // ('Forward'/'Defense'/'Goalie'). The label is preserved below on
          // registration_submissions.preferred_position (unconstrained).
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
    revalidatePath(`/dashboard/leagues/${leagueId}/seasons/${seasonId}/players`);
  }

  return {
    success: true,
    data: { imported, skipped, errors },
  };
}

async function loadPreviousSeasonPlayerImportContext(params: {
  leagueId: string;
  seasonId: string;
  sourceSeasonId: string;
}) {
  const serviceClient = createServiceRoleClient();

  const [{ data: targetSeason }, { data: sourceSeason }] = await Promise.all([
    serviceClient
      .from('seasons')
      .select('id, name, league_id, start_date')
      .eq('id', params.seasonId)
      .eq('league_id', params.leagueId)
      .maybeSingle(),
    serviceClient
      .from('seasons')
      .select('id, name, league_id, start_date')
      .eq('id', params.sourceSeasonId)
      .eq('league_id', params.leagueId)
      .maybeSingle(),
  ]);

  if (!targetSeason) {
    return { error: 'Target season not found' } as const;
  }

  if (!sourceSeason) {
    return { error: 'Source season not found' } as const;
  }

  if (targetSeason.id === sourceSeason.id) {
    return { error: 'Choose a different source season' } as const;
  }

  if (
    targetSeason.start_date &&
    sourceSeason.start_date &&
    Date.parse(sourceSeason.start_date) >= Date.parse(targetSeason.start_date)
  ) {
    return { error: 'Choose a season that comes before the current one' } as const;
  }

  const [sourceRegistrationsResult, sourceRostersResult, targetRegistrationsResult, targetRostersResult] =
    await Promise.all([
      serviceClient
        .from('registration_submissions')
        .select(
          'player_id, team_id, assigned_team_id, preferred_position, preferred_jersey_number, registration_type, submitted_at, created_at'
        )
        .eq('league_id', params.leagueId)
        .eq('season_id', params.sourceSeasonId)
        .eq('status', 'approved')
        .not('submitted_at', 'is', null),
      serviceClient
        .from('team_rosters')
        .select('player_id, team_id, position, jersey_number, status, joined_at, start_date, end_date')
        .eq('league_id', params.leagueId)
        .eq('season_id', params.sourceSeasonId)
        .eq('status', 'active'),
      serviceClient
        .from('registration_submissions')
        .select('player_id')
        .eq('league_id', params.leagueId)
        .eq('season_id', params.seasonId),
      serviceClient
        .from('team_rosters')
        .select('player_id')
        .eq('league_id', params.leagueId)
        .eq('season_id', params.seasonId),
    ]);

  if (
    sourceRegistrationsResult.error ||
    sourceRostersResult.error ||
    targetRegistrationsResult.error ||
    targetRostersResult.error
  ) {
    return { error: 'Failed to load player import data' } as const;
  }

  const sourceRegistrations = sourceRegistrationsResult.data ?? [];
  const sourceRosters = sourceRostersResult.data ?? [];

  const sourcePlayerIds = Array.from(
    new Set(
      [...sourceRegistrations, ...sourceRosters]
        .map((row) => row.player_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  );

  if (sourcePlayerIds.length === 0) {
    return {
      sourceSeason,
      targetSeason,
      players: [] as PreviousSeasonPlayerImportCandidate[],
    } as const;
  }

  const sourceTeamIds = Array.from(
    new Set(
      [...sourceRegistrations.flatMap((row) => [row.assigned_team_id, row.team_id]), ...sourceRosters.map((row) => row.team_id)]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  );

  const [profilesResult, teamsResult] = await Promise.all([
    serviceClient
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url')
      .in('id', sourcePlayerIds),
    sourceTeamIds.length > 0
      ? serviceClient.from('teams').select('id, name').in('id', sourceTeamIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string | null }>, error: null }),
  ]);

  if (profilesResult.error || teamsResult.error) {
    return { error: 'Failed to load previous season players' } as const;
  }

  const existingTargetPlayerIds = new Set(
    [...(targetRegistrationsResult.data ?? []), ...(targetRostersResult.data ?? [])]
      .map((row) => row.player_id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  );

  const eligibleTargetTeamIds = new Set(
    await getSeasonParticipationTeamIds(serviceClient, params.leagueId, params.seasonId)
  );
  const teamNameById = new Map((teamsResult.data ?? []).map((team) => [team.id, team.name ?? null]));

  const players = buildImportablePreviousSeasonPlayers({
    profiles: profilesResult.data ?? [],
    registrations: sourceRegistrations,
    rosters: sourceRosters,
    teamNameById,
    existingTargetPlayerIds,
    eligibleTargetTeamIds,
  })
    .filter((player) => !player.alreadyInTargetSeason)
    .map((player) => ({
      playerId: player.playerId,
      fullName: player.fullName,
      email: player.email,
      phone: player.phone,
      avatarUrl: player.avatarUrl,
      teamId: player.teamId,
      teamName: player.teamName,
      position: player.position,
      jerseyNumber: player.jerseyNumber,
      registrationType: player.registrationType,
    }));

  return {
    sourceSeason,
    targetSeason,
    players,
  } as const;
}

export async function getPreviousSeasonsForPlayerImport(
  leagueId: string,
  seasonId: string
): Promise<ActionResult<{ seasons: PreviousSeasonOption[] }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  try {
    const serviceClient = createServiceRoleClient();
    const { data: targetSeason, error: targetSeasonError } = await serviceClient
      .from('seasons')
      .select('id, start_date')
      .eq('id', seasonId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (targetSeasonError || !targetSeason) {
      return { success: false, error: 'Season not found' };
    }

    const seasonQuery = serviceClient
      .from('seasons')
      .select('id, name, start_date, end_date')
      .eq('league_id', leagueId)
      .neq('id', seasonId)
      .order('start_date', { ascending: false });

    const { data: seasons, error } = targetSeason.start_date
      ? await seasonQuery.lt('start_date', targetSeason.start_date)
      : await seasonQuery;

    if (error) {
      return { success: false, error: 'Failed to load previous seasons' };
    }

    return {
      success: true,
      data: {
        seasons: seasons ?? [],
      },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error(
        'Unexpected error in getPreviousSeasonsForPlayerImport:',
        sanitizeErrorForLogging(error)
      );
    }

    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getPreviousSeasonPlayersForImport(params: {
  leagueId: string;
  seasonId: string;
  sourceSeasonId: string;
}): Promise<
  ActionResult<{
    sourceSeasonName: string;
    players: PreviousSeasonPlayerImportCandidate[];
  }>
> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  try {
    const context = await loadPreviousSeasonPlayerImportContext(params);

    if ('error' in context) {
      return { success: false, error: context.error || 'Failed to load previous season players' };
    }

    return {
      success: true,
      data: {
        sourceSeasonName: context.sourceSeason.name,
        players: context.players,
      },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error(
        'Unexpected error in getPreviousSeasonPlayersForImport:',
        sanitizeErrorForLogging(error)
      );
    }

    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function importSeasonPlayersFromPreviousSeason(params: {
  leagueId: string;
  seasonId: string;
  sourceSeasonId: string;
  playerIds: string[];
}): Promise<
  ActionResult<{
    imported: number;
    skipped: number;
    errors: string[];
    sourceSeasonName: string;
    targetSeasonName: string;
  }>
> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const {
    data: { user },
  } = await (await createClient()).auth.getUser();

  try {
    const context = await loadPreviousSeasonPlayerImportContext(params);
    if ('error' in context) {
      return { success: false, error: context.error || 'Failed to load previous season players' };
    }

    const requestedPlayerIds = [...new Set(params.playerIds.filter(Boolean))];
    if (requestedPlayerIds.length === 0) {
      return { success: false, error: 'Select at least one player to import' };
    }

    const candidateByPlayerId = new Map(context.players.map((player) => [player.playerId, player]));
    const selectedPlayers = requestedPlayerIds
      .map((playerId) => candidateByPlayerId.get(playerId))
      .filter((player): player is PreviousSeasonPlayerImportCandidate => Boolean(player));

    if (selectedPlayers.length === 0) {
      return { success: false, error: 'No eligible players were selected for import' };
    }

    const serviceClient = createServiceRoleClient();
    const now = new Date().toISOString();
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const player of selectedPlayers) {
      const { error } = await serviceClient
        .from('registration_submissions' as any)
        .insert({
          league_id: params.leagueId,
          season_id: params.seasonId,
          player_id: player.playerId,
          registration_type: player.registrationType,
          status: 'approved',
          team_id: player.teamId,
          assigned_team_id: player.teamId,
          preferred_position: player.position,
          preferred_jersey_number: player.jerseyNumber,
          submitted_at: now,
          reviewed_at: now,
          reviewed_by: user?.id ?? null,
          review_notes: `Imported from ${context.sourceSeason.name}`,
        });

      if (error) {
        if (error.code === '23505') {
          skipped += 1;
          continue;
        }

        errors.push(`Failed to import ${player.fullName}: ${error.message}`);
        continue;
      }

      imported += 1;
    }

    if (imported > 0) {
      revalidatePath(`/dashboard/leagues/${params.leagueId}/registrations`);
      revalidatePath(`/dashboard/leagues/${params.leagueId}/seasons/${params.seasonId}/registrations`);
      revalidatePath(`/dashboard/leagues/${params.leagueId}/seasons/${params.seasonId}/players`);
      revalidatePath(`/dashboard/leagues/${params.leagueId}/teams-divisions`);
    }

    return {
      success: true,
      data: {
        imported,
        skipped,
        errors,
        sourceSeasonName: context.sourceSeason.name,
        targetSeasonName: context.targetSeason.name,
      },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error(
        'Unexpected error in importSeasonPlayersFromPreviousSeason:',
        sanitizeErrorForLogging(error)
      );
    }

    return { success: false, error: 'An unexpected error occurred' };
  }
}
