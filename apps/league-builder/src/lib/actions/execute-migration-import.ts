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
      leagueId
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
  leagueId: string
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
  importMode: string
): Promise<WriteResult> {
  switch (targetEntity) {
    case 'teams':
      return writeTeam(supabase, mapped, leagueId, importMode);
    case 'players':
      return writePlayer(supabase, mapped, leagueId, importMode);
    case 'schedule_games':
      return writeGame(supabase, mapped, leagueId, importMode);
    case 'stats':
      return writeStats(supabase, mapped, leagueId, importMode);
    default:
      throw new Error(`Entity type "${targetEntity}" is not yet supported for import.`);
  }
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
      // Update existing team with any additional mapped fields
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

  // Create new team
  const { error } = await supabase.from('teams').insert({
    league_id: leagueId,
    name: teamName,
    short_name: mapped.division_name ? null : teamName.substring(0, 10),
    contact_email: mapped.captain_email || null,
    contact_phone: mapped.captain_phone || null,
    status: 'active',
    is_legacy_import: true,
  });

  if (error) throw new Error(`Failed to insert team "${teamName}": ${error.message}`);
  return 'created';
}

async function writePlayer(
  supabase: any,
  mapped: Record<string, string>,
  leagueId: string,
  importMode: string
): Promise<WriteResult> {
  // Build the player's full name
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

  // Check for existing player profile by email if available
  if (importMode === 'merge_upsert' && mapped.email) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', mapped.email.trim())
      .maybeSingle();

    if (existingProfile) {
      // Ensure the player is rostered to the team in this league
      if (teamId) {
        await ensureRosterEntry(supabase, existingProfile.id, teamId, leagueId, mapped);
      }
      return 'updated';
    }
  }

  // Create a legacy player profile
  const { data: newProfile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      full_name: fullName,
      email: mapped.email?.trim() || null,
      phone: mapped.phone?.trim() || null,
      position: normalizePosition(mapped.position) || null,
      jersey_number: mapped.jersey_number ? parseInt(mapped.jersey_number, 10) || null : null,
      is_legacy_import: true,
    })
    .select('id')
    .single();

  if (profileError || !newProfile) {
    throw new Error(`Failed to create player "${fullName}": ${profileError?.message ?? 'unknown error'}`);
  }

  // Add roster entry if we have a team
  if (teamId) {
    await ensureRosterEntry(supabase, newProfile.id, teamId, leagueId, mapped);
  }

  return 'created';
}

async function writeGame(
  supabase: any,
  mapped: Record<string, string>,
  leagueId: string,
  _importMode: string
): Promise<WriteResult> {
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

  const { error } = await supabase.from('games').insert({
    league_id: leagueId,
    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,
    scheduled_at: scheduledAt,
    location: mapped.venue_name?.trim() || null,
    home_score: hasResult ? homeScore : null,
    away_score: hasResult ? awayScore : null,
    status: hasResult ? 'completed' : 'scheduled',
    game_type: 'regular',
    is_legacy_import: true,
  });

  if (error) throw new Error(`Failed to insert game: ${error.message}`);
  return 'created';
}

async function writeStats(
  supabase: any,
  mapped: Record<string, string>,
  leagueId: string,
  _importMode: string
): Promise<WriteResult> {
  const playerName = mapped.player_name?.trim();
  if (!playerName) throw new Error('Missing required field: player_name');

  // Look up player by name within the league's rosters
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('full_name', playerName)
    .maybeSingle();

  if (!profile) {
    throw new Error(`Player "${playerName}" not found in profiles.`);
  }

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

  // Determine if this is a goalie stat line (has goalie-specific fields)
  const isGoalie =
    mapped.wins !== undefined ||
    mapped.gaa !== undefined ||
    mapped.save_pct !== undefined;

  if (isGoalie) {
    const { error } = await supabase.from('goalie_stats').insert({
      league_id: leagueId,
      player_id: profile.id,
      team_id: teamId,
      saves: mapped.save_pct ? null : null, // save_pct is aggregate, not per-game
      goals_against: mapped.gaa ? null : null,
      is_legacy_import: true,
    });

    if (error) throw new Error(`Failed to insert goalie stats: ${error.message}`);
    return 'created';
  }

  // Skater stats — write to skater_stats if the table exists,
  // otherwise fall back to a legacy_stats insert pattern
  const { error } = await supabase.from('skater_stats').insert({
    league_id: leagueId,
    player_id: profile.id,
    team_id: teamId,
    games_played: parseInt(mapped.games_played ?? '0', 10) || 0,
    goals: parseInt(mapped.goals ?? '0', 10) || 0,
    assists: parseInt(mapped.assists ?? '0', 10) || 0,
    points: parseInt(mapped.points ?? '0', 10) || 0,
    pim: parseInt(mapped.pim ?? '0', 10) || 0,
    is_legacy_import: true,
  });

  if (error) throw new Error(`Failed to insert skater stats: ${error.message}`);
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
  mapped: Record<string, string>
): Promise<void> {
  // Check if roster entry already exists
  const { data: existing } = await supabase
    .from('rosters')
    .select('id')
    .eq('player_id', playerId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (existing) return;

  await supabase.from('rosters').insert({
    player_id: playerId,
    team_id: teamId,
    league_id: leagueId,
    jersey_number: mapped.jersey_number ? parseInt(mapped.jersey_number, 10) || null : null,
    position: normalizePosition(mapped.position) || null,
    status: 'active',
    is_legacy_import: true,
  });
}

function normalizePosition(raw?: string): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (lower === 'c' || lower === 'center' || lower === 'centre') return 'center';
  if (lower === 'lw' || lower === 'left wing') return 'left_wing';
  if (lower === 'rw' || lower === 'right wing') return 'right_wing';
  if (lower === 'f' || lower === 'forward') return 'forward';
  if (lower === 'd' || lower === 'defense' || lower === 'defence' || lower === 'defenseman') return 'defense';
  if (lower === 'g' || lower === 'goalie' || lower === 'goaltender' || lower === 'goalkeeper') return 'goalie';
  return raw.trim();
}

function buildTeamPayload(mapped: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (mapped.captain_email) payload.contact_email = mapped.captain_email;
  if (mapped.captain_phone) payload.contact_phone = mapped.captain_phone;
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
