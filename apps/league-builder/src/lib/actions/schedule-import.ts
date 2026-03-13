'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { revalidatePath } from 'next/cache';

export interface ScheduleImportRow {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM (24h)
  homeTeam: string;
  awayTeam: string;
  venue: string;
  notes: string;
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function importGamesFromCSV(
  leagueId: string,
  seasonId: string,
  rows: ScheduleImportRow[]
): Promise<ActionResult<{ imported: number; skipped: number; errors: string[] }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: 'Not authorized' };
  }

  if (!rows.length) {
    return { success: false, error: 'No rows to import' };
  }

  if (rows.length > 500) {
    return { success: false, error: 'Maximum 500 games per import' };
  }

  const supabase = createServiceRoleClient();

  // Fetch teams for name → ID resolution
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId);

  const teamsByName = new Map<string, string>();
  for (const team of teams || []) {
    teamsByName.set(team.name.toLowerCase().trim(), team.id);
  }

  // Fetch venues for name → string resolution
  const { data: venues } = await supabase
    .from('venues')
    .select('id, name')
    .eq('league_id', leagueId);

  const venuesByName = new Map<string, string>();
  for (const venue of venues || []) {
    venuesByName.set(venue.name.toLowerCase().trim(), venue.name);
  }

  const errors: string[] = [];
  type GameStatus = 'completed' | 'in_progress' | 'scheduled' | 'pending_verification' | 'cancelled' | 'postponed';
  const gamesToInsert: {
    league_id: string;
    season_id: string;
    home_team_id: string;
    away_team_id: string;
    scheduled_at: string;
    location: string | null;
    status: GameStatus;
  }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because header is row 1

    // Validate date
    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push(`Row ${rowNum}: Invalid date "${row.date}" — use YYYY-MM-DD format`);
      continue;
    }

    // Validate time
    if (!row.time || !/^\d{2}:\d{2}$/.test(row.time)) {
      errors.push(`Row ${rowNum}: Invalid time "${row.time}" — use HH:MM format`);
      continue;
    }

    // Resolve teams
    const homeTeamId = teamsByName.get(row.homeTeam.toLowerCase().trim());
    const awayTeamId = teamsByName.get(row.awayTeam.toLowerCase().trim());

    if (!homeTeamId) {
      errors.push(`Row ${rowNum}: Home team "${row.homeTeam}" not found in league`);
      continue;
    }
    if (!awayTeamId) {
      errors.push(`Row ${rowNum}: Away team "${row.awayTeam}" not found in league`);
      continue;
    }
    if (homeTeamId === awayTeamId) {
      errors.push(`Row ${rowNum}: Home and away team cannot be the same`);
      continue;
    }

    // Resolve venue (optional — if not matched, store the raw string)
    const venueStr = row.venue?.trim() || null;
    const resolvedVenue = venueStr
      ? (venuesByName.get(venueStr.toLowerCase()) ?? venueStr)
      : null;

    const scheduledAt = new Date(`${row.date}T${row.time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      errors.push(`Row ${rowNum}: Invalid date/time combination`);
      continue;
    }

    gamesToInsert.push({
      league_id: leagueId,
      season_id: seasonId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      scheduled_at: scheduledAt.toISOString(),
      location: resolvedVenue,
      status: 'scheduled',
    });
  }

  if (gamesToInsert.length === 0) {
    return {
      success: true,
      data: { imported: 0, skipped: rows.length, errors },
    };
  }

  const { error: insertError } = await supabase
    .from('games')
    .insert(gamesToInsert);

  if (insertError) {
    return { success: false, error: `Database error: ${insertError.message}` };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/seasons/${seasonId}/schedule`);

  return {
    success: true,
    data: {
      imported: gamesToInsert.length,
      skipped: rows.length - gamesToInsert.length,
      errors,
    },
  };
}
