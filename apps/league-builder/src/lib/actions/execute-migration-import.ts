'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/auth';
import { locales } from '@/i18n/config';
import {
  normalizeLeagueMigrationRequest,
  type MigrationImportRunReport,
  type MigrationEntityImportReport,
  type MigrationImportMappingEntry,
  type MigrationTargetEntity,
} from '@/lib/migration/requests';
import {
  parseSqlDumpInserts,
  parseCsvContent,
  parseJsonContent,
} from '@/lib/migration/parse-source';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { pickOperationalSeason } from '@/lib/seasons/operational';

const isDevelopment = process.env.NODE_ENV !== 'production';
const MIGRATION_ASSET_BUCKET = 'league-migration-assets';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Execute a migration import for a specific request and league.
 *
 * This is the core import engine — called explicitly by platform admins only.
 * It reads approved import mappings, downloads source files, parses them,
 * and writes league-scoped data into BLH tables.
 */
export async function executeMigrationImport(
  requestId: string,
  leagueId: string
): Promise<ActionResult<MigrationImportRunReport>> {
  // ── Auth: platform admin only ──────────────────────────────────────
  const userData = await getCurrentUser();
  if (!userData?.profile?.is_platform_admin) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = createServiceRoleClient() as any;

  // ── Load and validate the migration request ────────────────────────
  const { data: raw, error: fetchError } = await supabase
    .from('league_migration_requests')
    .select('*')
    .eq('id', requestId)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (fetchError || !raw) {
    if (isDevelopment) console.error('Error loading migration request for execution:', fetchError);
    return { success: false, error: 'Migration request not found.' };
  }

  const request = normalizeLeagueMigrationRequest(raw as Record<string, unknown>);

  if (request.status !== 'scheduled' && request.status !== 'in_progress') {
    return {
      success: false,
      error: `Cannot execute import: request status is "${request.status}". Must be "scheduled" or "in_progress".`,
    };
  }

  // ── Resolve operational season for season-bound writes ─────────────
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, status, start_date, end_date, created_at')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  const operationalSeason = pickOperationalSeason(seasons ?? []);
  const seasonId: string | null = operationalSeason?.id ?? null;

  // ── Set status to in_progress ──────────────────────────────────────
  const startedAt = new Date().toISOString();

  await supabase
    .from('league_migration_requests')
    .update({ status: 'in_progress' })
    .eq('id', requestId)
    .eq('league_id', leagueId);

  // ── Build the run report ───────────────────────────────────────────
  const report: MigrationImportRunReport = {
    request_id: requestId,
    league_id: leagueId,
    executed_by: userData.user.id ?? null,
    started_at: startedAt,
    completed_at: null,
    status: 'running',
    entity_reports: [],
    errors: [],
  };

  const mappings = request.normalization_profile?.import_mappings ?? [];
  const readyMappings = mappings.filter((m) => m.ready_for_import && m.target_entity);

  if (readyMappings.length === 0) {
    report.status = 'failed';
    report.errors.push('No import mappings are marked as ready.');
    report.completed_at = new Date().toISOString();
    await finalizeRequest(supabase, requestId, leagueId, report);
    return { success: true, data: report };
  }

  // ── Process each ready mapping ─────────────────────────────────────
  for (const mapping of readyMappings) {
    const entityReport = await processMapping(
      supabase,
      request,
      mapping,
      leagueId,
      seasonId
    );
    report.entity_reports.push(entityReport);

    if (entityReport.errors.length > 0) {
      report.errors.push(
        ...entityReport.errors.slice(0, 10).map(
          (e) => `[${mapping.target_entity}] ${e}`
        )
      );
    }
  }

  // ── Determine final status ─────────────────────────────────────────
  const totalErrored = report.entity_reports.reduce((sum, r) => sum + r.errored, 0);
  const totalCreated = report.entity_reports.reduce((sum, r) => sum + r.created, 0);
  const totalUpdated = report.entity_reports.reduce((sum, r) => sum + r.updated, 0);

  if (totalCreated + totalUpdated === 0 && totalErrored > 0) {
    report.status = 'failed';
  } else if (totalErrored > 0) {
    report.status = 'partial';
  } else {
    report.status = 'completed';
  }

  report.completed_at = new Date().toISOString();
  await finalizeRequest(supabase, requestId, leagueId, report);

  return { success: true, data: report };
}

// ---------------------------------------------------------------------------
// Per-mapping processing
// ---------------------------------------------------------------------------

async function processMapping(
  supabase: any,
  request: ReturnType<typeof normalizeLeagueMigrationRequest>,
  mapping: MigrationImportMappingEntry,
  leagueId: string,
  seasonId: string | null
): Promise<MigrationEntityImportReport> {
  const entityReport: MigrationEntityImportReport = {
    target_entity: mapping.target_entity!,
    asset_id: mapping.asset_id,
    created: 0,
    updated: 0,
    skipped: 0,
    errored: 0,
    errors: [],
  };

  // Find the uploaded asset for this mapping
  const asset = request.uploaded_assets.find((a) => a.id === mapping.asset_id);
  if (!asset) {
    entityReport.errored = 1;
    entityReport.errors.push('Uploaded asset not found on request.');
    return entityReport;
  }

  // Download file from storage
  const { data: fileBlob, error: dlError } = await supabase.storage
    .from(MIGRATION_ASSET_BUCKET)
    .download(asset.path);

  if (dlError || !fileBlob) {
    entityReport.errored = 1;
    entityReport.errors.push(`Failed to download source file: ${dlError?.message ?? 'unknown error'}`);
    return entityReport;
  }

  const content = await (fileBlob as Blob).text();

  // Parse based on source format
  let rows: Record<string, unknown>[];
  try {
    rows = parseSourceContent(content, asset.analysis.source_format, mapping.source_object);
  } catch (err) {
    entityReport.errored = 1;
    entityReport.errors.push(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
    return entityReport;
  }

  if (rows.length === 0) {
    entityReport.skipped = 1;
    entityReport.errors.push('No rows parsed from source file.');
    return entityReport;
  }

  // Build field mapping lookup: source_field → target_field
  const fieldMap = new Map<string, string>();
  for (const fm of mapping.field_mappings) {
    if (fm.source_field && fm.target_field) {
      fieldMap.set(fm.source_field, fm.target_field);
    }
  }

  // Transform and write each row
  for (let i = 0; i < rows.length; i++) {
    try {
      const sourceRow = rows[i];
      const mapped = applyFieldMappings(sourceRow, fieldMap);

      if (Object.keys(mapped).length === 0) {
        entityReport.skipped++;
        continue;
      }

      const result = await writeEntity(
        supabase,
        mapping.target_entity!,
        mapped,
        leagueId,
        seasonId,
        mapping.import_mode
      );

      if (result === 'created') entityReport.created++;
      else if (result === 'updated') entityReport.updated++;
      else if (result === 'skipped') entityReport.skipped++;
    } catch (err) {
      entityReport.errored++;
      if (entityReport.errors.length < 20) {
        entityReport.errors.push(
          `Row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  return entityReport;
}

// ---------------------------------------------------------------------------
// Source content parsing
// ---------------------------------------------------------------------------

function parseSourceContent(
  content: string,
  sourceFormat: string,
  sourceObject: string | null
): Record<string, unknown>[] {
  switch (sourceFormat) {
    case 'sql_dump':
      if (!sourceObject) {
        throw new Error('SQL dump imports require a source_object (table name) to be specified.');
      }
      return parseSqlDumpInserts(content, sourceObject);

    case 'csv_export':
    case 'spreadsheet':
      return parseCsvContent(content);

    case 'json_export':
      return parseJsonContent(content);

    default:
      throw new Error(`Unsupported source format: ${sourceFormat}`);
  }
}

// ---------------------------------------------------------------------------
// Field mapping transform
// ---------------------------------------------------------------------------

function applyFieldMappings(
  sourceRow: Record<string, unknown>,
  fieldMap: Map<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [sourceField, targetField] of fieldMap) {
    const value = sourceRow[sourceField];
    if (value !== undefined && value !== null && value !== '') {
      result[targetField] = String(value);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Entity writers — all writes are league-scoped
// ---------------------------------------------------------------------------

type WriteResult = 'created' | 'updated' | 'skipped';

async function writeEntity(
  supabase: any,
  targetEntity: MigrationTargetEntity,
  mapped: Record<string, string>,
  leagueId: string,
  seasonId: string | null,
  importMode: string
): Promise<WriteResult> {
  switch (targetEntity) {
    case 'teams':
      return writeTeam(supabase, mapped, leagueId, importMode);
    case 'players':
      return writePlayer(supabase, mapped, leagueId, seasonId, importMode);
    case 'schedule_games':
      return writeGame(supabase, mapped, leagueId, seasonId, importMode);
    case 'stats':
      return writeStats(supabase, mapped, leagueId, seasonId, importMode);
    default:
      throw new Error(`Entity type "${targetEntity}" is not yet supported for import.`);
  }
}

// ---------------------------------------------------------------------------
// writeTeam — follows team-import.ts insert shape
// ---------------------------------------------------------------------------

function makeShortName(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 4);
  return initials || name.slice(0, 4).toUpperCase();
}

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function writeTeam(
  supabase: any,
  mapped: Record<string, string>,
  leagueId: string,
  importMode: string
): Promise<WriteResult> {
  const teamName = mapped.team_name?.trim();
  if (!teamName) throw new Error('Missing required field: team_name');

  // Check for existing team in this league
  if (importMode === 'merge_upsert') {
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .ilike('name', teamName)
      .maybeSingle();

    if (existing) {
      const updates = buildTeamPayload(mapped);
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('teams')
          .update(updates)
          .eq('id', existing.id)
          .eq('league_id', leagueId);
        return 'updated';
      }
      return 'skipped';
    }
  }

  // Resolve division (optional)
  let divisionId: string | null = null;
  if (mapped.division_name) {
    const { data: div } = await supabase
      .from('divisions')
      .select('id')
      .eq('league_id', leagueId)
      .ilike('name', mapped.division_name.trim())
      .maybeSingle();
    divisionId = div?.id ?? null;
  }

  // Resolve captain by email (optional)
  let captainId: string | null = null;
  if (mapped.captain_email?.trim()) {
    const { data: captain } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', mapped.captain_email.trim().toLowerCase())
      .maybeSingle();
    captainId = captain?.id ?? null;
  }

  const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const color = mapped.primary_color?.trim() || null;
  const primaryColor = color && HEX_COLOR_REGEX.test(color) ? color : null;

  // Create new team — matches team-import.ts shape
  const { error } = await supabase.from('teams').insert({
    league_id: leagueId,
    name: teamName,
    short_name: makeShortName(teamName),
    slug: makeSlug(teamName),
    primary_color: primaryColor,
    division_id: divisionId,
    captain_id: captainId,
    status: 'active',
  });

  if (error) throw new Error(`Failed to insert team "${teamName}": ${error.message}`);
  return 'created';
}

// ---------------------------------------------------------------------------
// writePlayer — safer matching: email → roster context → exact name
// ---------------------------------------------------------------------------

async function writePlayer(
  supabase: any,
  mapped: Record<string, string>,
  leagueId: string,
  seasonId: string | null,
  importMode: string
): Promise<WriteResult> {
  const fullName =
    mapped.full_name?.trim() ||
    [mapped.first_name?.trim(), mapped.last_name?.trim()].filter(Boolean).join(' ');

  if (!fullName) throw new Error('Missing required field: full_name (or first_name + last_name)');

  // Look up team if provided
  let teamId: string | null = null;
  if (mapped.team_name) {
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .ilike('name', mapped.team_name.trim())
      .maybeSingle();
    teamId = team?.id ?? null;
  }

  // ── Safer player matching ──────────────────────────────────────────
  let existingProfileId: string | null = null;

  // 1) Prefer email exact match
  if (mapped.email?.trim()) {
    const { data: byEmail } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', mapped.email.trim())
      .maybeSingle();
    existingProfileId = byEmail?.id ?? null;
  }

  // 2) If no email match and team+season known, search roster context
  if (!existingProfileId && teamId && seasonId) {
    const { data: rosterMatches } = await supabase
      .from('team_rosters')
      .select('player_id, profiles:player_id(id, full_name)')
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .is('end_date', null);

    if (rosterMatches) {
      const matches = rosterMatches.filter((r: any) => {
        const profile = r.profiles as any;
        return profile?.full_name?.toLowerCase() === fullName.toLowerCase();
      });
      if (matches.length === 1) {
        existingProfileId = matches[0].player_id;
      } else if (matches.length > 1) {
        throw new Error(`Ambiguous player "${fullName}" — ${matches.length} matches on roster.`);
      }
    }
  }

  // 3) Fallback to exact full_name with ambiguity check
  if (!existingProfileId) {
    const { data: byName } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', fullName);

    if (byName && byName.length === 1) {
      existingProfileId = byName[0].id;
    } else if (byName && byName.length > 1) {
      throw new Error(`Ambiguous player "${fullName}" — ${byName.length} profiles matched. Provide email to disambiguate.`);
    }
  }

  // If merge_upsert and found, just ensure roster
  if (importMode === 'merge_upsert' && existingProfileId) {
    if (teamId && seasonId) {
      await ensureRosterEntry(supabase, existingProfileId, teamId, leagueId, seasonId, mapped);
    }
    return 'updated';
  }

  // If found but not merge mode, skip
  if (existingProfileId) {
    if (teamId && seasonId) {
      await ensureRosterEntry(supabase, existingProfileId, teamId, leagueId, seasonId, mapped);
    }
    return 'updated';
  }

  // Create a new player profile — only columns that exist on profiles
  const newId = crypto.randomUUID();
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: newId,
      full_name: fullName,
      email: mapped.email?.trim() || null,
      phone: mapped.phone?.trim() || null,
    });

  if (profileError) {
    throw new Error(`Failed to create player "${fullName}": ${profileError.message}`);
  }

  // Add roster entry if we have a team and season
  if (teamId && seasonId) {
    await ensureRosterEntry(supabase, newId, teamId, leagueId, seasonId, mapped);
  }

  return 'created';
}

// ---------------------------------------------------------------------------
// writeGame — follows schedule-import.ts shape, requires season_id
// ---------------------------------------------------------------------------

async function writeGame(
  supabase: any,
  mapped: Record<string, string>,
  leagueId: string,
  seasonId: string | null,
  _importMode: string
): Promise<WriteResult> {
  if (!seasonId) {
    throw new Error('Cannot import games: no active season found for this league.');
  }

  const homeTeamName = mapped.home_team?.trim();
  const awayTeamName = mapped.away_team?.trim();
  const gameDate = mapped.game_date?.trim();
  const startTime = mapped.start_time?.trim();

  if (!homeTeamName || !awayTeamName || !gameDate) {
    throw new Error('Missing required fields: home_team, away_team, game_date');
  }

  // Look up teams
  const [{ data: homeTeam }, { data: awayTeam }] = await Promise.all([
    supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .ilike('name', homeTeamName)
      .maybeSingle(),
    supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .ilike('name', awayTeamName)
      .maybeSingle(),
  ]);

  if (!homeTeam) throw new Error(`Home team "${homeTeamName}" not found in league.`);
  if (!awayTeam) throw new Error(`Away team "${awayTeamName}" not found in league.`);

  // Build scheduled_at from date + optional time
  const scheduledAt = startTime
    ? new Date(`${gameDate}T${startTime}`).toISOString()
    : new Date(`${gameDate}T00:00:00`).toISOString();

  const homeScore = mapped.home_score ? parseInt(mapped.home_score, 10) : null;
  const awayScore = mapped.away_score ? parseInt(mapped.away_score, 10) : null;
  const hasResult = homeScore !== null && awayScore !== null && !isNaN(homeScore) && !isNaN(awayScore);

  // Matches schedule-import.ts shape: league_id, season_id, home_team_id, away_team_id,
  // scheduled_at, location, status. Optional scores for completed games.
  const gamePayload: Record<string, unknown> = {
    league_id: leagueId,
    season_id: seasonId,
    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,
    scheduled_at: scheduledAt,
    location: mapped.venue_name?.trim() || null,
    status: hasResult ? 'completed' : 'scheduled',
  };

  if (hasResult) {
    gamePayload.home_score = homeScore;
    gamePayload.away_score = awayScore;
  }

  const { error } = await supabase.from('games').insert(gamePayload);

  if (error) throw new Error(`Failed to insert game: ${error.message}`);
  return 'created';
}

// ---------------------------------------------------------------------------
// writeStats — uses player_stats (not skater_stats), requires game_id + season_id
// ---------------------------------------------------------------------------

async function writeStats(
  supabase: any,
  mapped: Record<string, string>,
  leagueId: string,
  seasonId: string | null,
  _importMode: string
): Promise<WriteResult> {
  if (!seasonId) {
    throw new Error('Cannot import stats: no active season found for this league.');
  }

  const playerName = mapped.player_name?.trim();
  const playerEmail = mapped.email?.trim();
  if (!playerName && !playerEmail) {
    throw new Error('Missing required field: player_name or email');
  }

  // ── Safer player matching ──────────────────────────────────────────
  let profileId: string | null = null;

  // 1) Prefer email exact match
  if (playerEmail) {
    const { data: byEmail } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', playerEmail)
      .maybeSingle();
    profileId = byEmail?.id ?? null;
  }

  // 2) Look up team for roster context
  let teamId: string | null = null;
  if (mapped.team_name) {
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .ilike('name', mapped.team_name.trim())
      .maybeSingle();
    teamId = team?.id ?? null;
  }

  // 3) Search roster context if team+season known
  if (!profileId && playerName && teamId) {
    const { data: rosterMatches } = await supabase
      .from('team_rosters')
      .select('player_id, profiles:player_id(id, full_name)')
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .is('end_date', null);

    if (rosterMatches) {
      const matches = rosterMatches.filter((r: any) => {
        const profile = r.profiles as any;
        return profile?.full_name?.toLowerCase() === playerName.toLowerCase();
      });
      if (matches.length === 1) {
        profileId = matches[0].player_id;
      } else if (matches.length > 1) {
        throw new Error(`Ambiguous player "${playerName}" — ${matches.length} matches on roster.`);
      }
    }
  }

  // 4) Fallback to exact full_name with ambiguity check
  if (!profileId && playerName) {
    const { data: byName } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', playerName);

    if (byName && byName.length === 1) {
      profileId = byName[0].id;
    } else if (byName && byName.length > 1) {
      throw new Error(`Ambiguous player "${playerName}" — ${byName.length} profiles matched. Provide email to disambiguate.`);
    }
  }

  if (!profileId) {
    throw new Error(`Player "${playerName ?? playerEmail}" not found in profiles.`);
  }

  // ── Resolve game_id if possible ────────────────────────────────────
  // Stats rows are per-game; require game_id to safely write.
  let gameId: string | null = mapped.game_id?.trim() || null;

  // If no explicit game_id, try to match by date + teams
  if (!gameId && mapped.game_date && teamId) {
    const gameDate = mapped.game_date.trim();
    const { data: gameMatch } = await supabase
      .from('games')
      .select('id')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .gte('scheduled_at', `${gameDate}T00:00:00`)
      .lte('scheduled_at', `${gameDate}T23:59:59`)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .maybeSingle();
    gameId = gameMatch?.id ?? null;
  }

  if (!gameId) {
    throw new Error(
      `Cannot import stats for "${playerName ?? playerEmail}": no game_id provided and could not match a game. ` +
      'Per-game stats require a valid game_id.'
    );
  }

  // Determine if this is a goalie stat line (has goalie-specific fields)
  const isGoalie =
    mapped.saves !== undefined ||
    mapped.shots_against !== undefined ||
    mapped.goals_against !== undefined;

  if (isGoalie) {
    // goalie_stats columns from calculate-player-ratings.ts:
    // player_id, team_id, game_id, saves, shots_against, goals_against, game_result, shutout
    const { error } = await supabase.from('goalie_stats').insert({
      league_id: leagueId,
      season_id: seasonId,
      player_id: profileId,
      team_id: teamId,
      game_id: gameId,
      saves: mapped.saves ? parseInt(mapped.saves, 10) || 0 : null,
      shots_against: mapped.shots_against ? parseInt(mapped.shots_against, 10) || 0 : null,
      goals_against: mapped.goals_against ? parseInt(mapped.goals_against, 10) || 0 : null,
      game_result: mapped.game_result?.trim() || null,
      shutout: mapped.shutout === 'true' || mapped.shutout === '1' || false,
    });

    if (error) throw new Error(`Failed to insert goalie stats: ${error.message}`);
    return 'created';
  }

  // player_stats — columns from calculate-player-ratings.ts:
  // player_id, team_id, game_id, goals, assists, plus_minus, penalty_minutes,
  // shots, game_winning_goals, power_play_goals, power_play_assists,
  // short_handed_goals, short_handed_assists
  const { error } = await supabase.from('player_stats').insert({
    league_id: leagueId,
    season_id: seasonId,
    player_id: profileId,
    team_id: teamId,
    game_id: gameId,
    goals: parseInt(mapped.goals ?? '0', 10) || 0,
    assists: parseInt(mapped.assists ?? '0', 10) || 0,
    plus_minus: parseInt(mapped.plus_minus ?? '0', 10) || 0,
    penalty_minutes: parseInt(mapped.penalty_minutes ?? mapped.pim ?? '0', 10) || 0,
    shots: mapped.shots ? parseInt(mapped.shots, 10) || 0 : null,
    game_winning_goals: mapped.game_winning_goals ? parseInt(mapped.game_winning_goals, 10) || 0 : null,
    power_play_goals: mapped.power_play_goals ? parseInt(mapped.power_play_goals, 10) || 0 : null,
    power_play_assists: mapped.power_play_assists ? parseInt(mapped.power_play_assists, 10) || 0 : null,
    short_handed_goals: mapped.short_handed_goals ? parseInt(mapped.short_handed_goals, 10) || 0 : null,
    short_handed_assists: mapped.short_handed_assists ? parseInt(mapped.short_handed_assists, 10) || 0 : null,
  });

  if (error) throw new Error(`Failed to insert player stats: ${error.message}`);
  return 'created';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureRosterEntry(
  supabase: any,
  playerId: string,
  teamId: string,
  leagueId: string,
  seasonId: string,
  mapped: Record<string, string>
): Promise<void> {
  // Check if roster entry already exists — use team_rosters (not rosters)
  const { data: existing } = await supabase
    .from('team_rosters')
    .select('id')
    .eq('player_id', playerId)
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .is('end_date', null)
    .maybeSingle();

  if (existing) return;

  // Get team's division_id for the roster entry (follows roster.ts pattern)
  const { data: team } = await supabase
    .from('teams')
    .select('division_id')
    .eq('id', teamId)
    .single();

  // Insert roster entry — follows roster.ts shape:
  // team_id, player_id, season_id, division_id, jersey_number, position,
  // status, leadership_role, start_date
  // league_id is auto-populated by trigger
  await (supabase.from('team_rosters') as any).insert({
    team_id: teamId,
    player_id: playerId,
    season_id: seasonId,
    division_id: team?.division_id ?? null,
    jersey_number: mapped.jersey_number ? parseInt(mapped.jersey_number, 10) || null : null,
    position: normalizePosition(mapped.position) || null,
    status: 'active' as const,
    start_date: new Date().toISOString(),
  });
}

function normalizePosition(raw?: string): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (lower === 'c' || lower === 'center' || lower === 'centre') return 'Forward';
  if (lower === 'lw' || lower === 'left wing') return 'Forward';
  if (lower === 'rw' || lower === 'right wing') return 'Forward';
  if (lower === 'f' || lower === 'forward' || lower === 'fwd') return 'Forward';
  if (lower === 'd' || lower === 'defense' || lower === 'defence' || lower === 'defenseman' || lower === 'def') return 'Defense';
  if (lower === 'g' || lower === 'goalie' || lower === 'goaltender' || lower === 'goalkeeper') return 'Goalie';
  return raw.trim();
}

function buildTeamPayload(mapped: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (mapped.primary_color) {
    const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
    if (HEX_COLOR_REGEX.test(mapped.primary_color.trim())) {
      payload.primary_color = mapped.primary_color.trim();
    }
  }
  if (mapped.short_name) payload.short_name = mapped.short_name.trim();
  return payload;
}

async function finalizeRequest(
  supabase: any,
  requestId: string,
  leagueId: string,
  report: MigrationImportRunReport
): Promise<void> {
  const finalStatus =
    report.status === 'completed' || report.status === 'partial'
      ? 'completed'
      : 'scheduled'; // Revert to scheduled on failure so admin can retry

  const updates: Record<string, unknown> = {
    status: finalStatus,
  };

  if (finalStatus === 'completed') {
    updates.completed_at = report.completed_at;
  }

  await supabase
    .from('league_migration_requests')
    .update(updates)
    .eq('id', requestId)
    .eq('league_id', leagueId);

  // Revalidate admin pages
  for (const locale of locales) {
    revalidatePath(`/${locale}/dashboard/admin`);
    revalidatePath(`/${locale}/dashboard/admin/migrations`);
    revalidatePath(`/${locale}/dashboard/leagues/${leagueId}/migration-center`);
  }
}
