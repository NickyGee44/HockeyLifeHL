'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { locales } from '@/i18n/config';
import {
  normalizeLeagueMigrationRequest,
  type LeagueMigrationRequest,
  type MigrationImportMappingEntry,
  type MigrationTargetEntity,
  type MigrationUploadedAsset,
} from '@/lib/migration/requests';
import {
  parseMigrationAsset,
  type ParsedMigrationFile,
  type ParsedMigrationRow,
} from '@/lib/migration/file-parser';

const isDevelopment = process.env.NODE_ENV !== 'production';
const MIGRATION_ASSET_BUCKET = 'league-migration-assets';

// ── Types ────────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface MigrationImportPreviewInput {
  requestId: string;
  leagueId: string;
  assetId: string;
}

export interface MigrationImportPreviewResult {
  assetId: string;
  assetName: string;
  targetEntity: MigrationTargetEntity;
  sourceColumns: string[];
  sampleRows: ParsedMigrationRow[];
  totalRowCount: number;
  mappedFieldCount: number;
  errors: string[];
}

export interface MigrationImportExecuteInput {
  requestId: string;
  leagueId: string;
  assetId: string;
  /** Optional season ID for entities that need one (stats, schedule, players) */
  seasonId?: string;
}

export interface MigrationImportResult {
  assetId: string;
  assetName: string;
  targetEntity: MigrationTargetEntity;
  imported: number;
  skipped: number;
  errors: string[];
  startedAt: string;
  completedAt: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function assertPlatformAdmin(): Promise<ActionResult<true>> {
  const userData = await getCurrentUser();
  if (!userData?.profile?.is_platform_admin) {
    return { success: false, error: 'Unauthorized' };
  }
  return { success: true, data: true };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function revalidateImportPaths(leagueId: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}/dashboard/admin/migrations`);
    revalidatePath(`/${locale}/dashboard/leagues/${leagueId}`);
    revalidatePath(`/${locale}/dashboard/leagues/${leagueId}/migration-center`);
  }
}

async function loadRequestAndMapping(
  supabase: any,
  requestId: string,
  leagueId: string,
  assetId: string
): Promise<
  ActionResult<{
    request: LeagueMigrationRequest;
    asset: MigrationUploadedAsset;
    mapping: MigrationImportMappingEntry;
  }>
> {
  const { data: row, error } = await supabase
    .from('league_migration_requests')
    .select('*')
    .eq('id', requestId)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (error || !row) {
    return { success: false, error: 'Migration request not found.' };
  }

  const request = normalizeLeagueMigrationRequest(row as Record<string, unknown>);
  const asset = request.uploaded_assets.find((a) => a.id === assetId);
  if (!asset) {
    return { success: false, error: 'Uploaded asset not found on this request.' };
  }

  const mapping = request.normalization_profile?.import_mappings.find(
    (m) => m.asset_id === assetId
  );
  if (!mapping) {
    return { success: false, error: 'No import mapping found for this asset. Save the import plan first.' };
  }

  if (!mapping.ready_for_import) {
    return {
      success: false,
      error: `Asset is not ready for import. Blockers: ${mapping.blockers.join('; ') || 'unknown'}`,
    };
  }

  if (!mapping.target_entity) {
    return { success: false, error: 'No target entity set for this asset.' };
  }

  return { success: true, data: { request, asset, mapping } };
}

async function downloadAssetText(supabase: any, path: string): Promise<ActionResult<string>> {
  const { data: blob, error } = await supabase.storage
    .from(MIGRATION_ASSET_BUCKET)
    .download(path);

  if (error || !blob) {
    if (isDevelopment) console.error('Error downloading migration asset:', error);
    return { success: false, error: 'Failed to download the source file.' };
  }

  const text = await (blob as Blob).text();
  return { success: true, data: text };
}

// ── Preview ──────────────────────────────────────────────────────────────────

export async function previewMigrationImport(
  input: MigrationImportPreviewInput
): Promise<ActionResult<MigrationImportPreviewResult>> {
  const access = await assertPlatformAdmin();
  if (!access.success) return access;

  const supabase = createServiceRoleClient() as any;
  const loaded = await loadRequestAndMapping(
    supabase,
    input.requestId,
    input.leagueId,
    input.assetId
  );
  if (!loaded.success) return loaded;

  const { asset, mapping } = loaded.data;
  const textResult = await downloadAssetText(supabase, asset.path);
  if (!textResult.success) return textResult;

  const parsed = parseMigrationAsset(textResult.data, asset, mapping, { preview: true });

  const mappedFieldCount = mapping.field_mappings.filter(
    (fm) => fm.target_field && fm.confidence === 'confirmed'
  ).length;

  return {
    success: true,
    data: {
      assetId: asset.id,
      assetName: asset.name,
      targetEntity: mapping.target_entity!,
      sourceColumns: parsed.sourceColumns,
      sampleRows: parsed.rows,
      totalRowCount: parsed.totalRowCount,
      mappedFieldCount,
      errors: parsed.errors,
    },
  };
}

// ── Execute ──────────────────────────────────────────────────────────────────

export async function executeMigrationImport(
  input: MigrationImportExecuteInput
): Promise<ActionResult<MigrationImportResult>> {
  const access = await assertPlatformAdmin();
  if (!access.success) return access;

  const startedAt = new Date().toISOString();
  const supabase = createServiceRoleClient() as any;

  const loaded = await loadRequestAndMapping(
    supabase,
    input.requestId,
    input.leagueId,
    input.assetId
  );
  if (!loaded.success) return loaded;

  const { request, asset, mapping } = loaded.data;
  const textResult = await downloadAssetText(supabase, asset.path);
  if (!textResult.success) return textResult;

  const parsed = parseMigrationAsset(textResult.data, asset, mapping);

  if (parsed.rows.length === 0) {
    return {
      success: false,
      error: parsed.errors.length > 0
        ? parsed.errors.join('; ')
        : 'No rows could be parsed from the source file.',
    };
  }

  let result: MigrationImportResult;

  switch (mapping.target_entity) {
    case 'teams':
      result = await importTeams(supabase, input.leagueId, parsed, asset, startedAt);
      break;
    case 'players':
      result = await importPlayers(supabase, input.leagueId, input.seasonId ?? null, parsed, asset, startedAt);
      break;
    case 'schedule_games':
      result = await importScheduleGames(supabase, input.leagueId, input.seasonId ?? null, parsed, asset, startedAt);
      break;
    case 'stats':
      result = await importStats(supabase, input.leagueId, input.seasonId ?? null, parsed, asset, startedAt);
      break;
    case 'news_articles':
      result = await importNewsArticles(supabase, input.leagueId, parsed, asset, startedAt);
      break;
    case 'media_assets':
      result = await importMediaAssets(supabase, input.leagueId, parsed, asset, startedAt);
      break;
    default:
      return { success: false, error: `Unsupported target entity: ${mapping.target_entity}` };
  }

  // Save the import result to the request's normalization profile
  await saveImportResult(supabase, request, asset.id, result);
  revalidateImportPaths(input.leagueId);

  return { success: true, data: result };
}

// ── Save Result ──────────────────────────────────────────────────────────────

async function saveImportResult(
  supabase: any,
  request: LeagueMigrationRequest,
  assetId: string,
  result: MigrationImportResult
) {
  const profile = request.normalization_profile;
  if (!profile) return;

  const existingResults: MigrationImportResult[] =
    (profile as any).import_results ?? [];

  const nextResults = [
    ...existingResults.filter((r) => r.assetId !== assetId),
    result,
  ];

  // Update the mapping to mark it as imported
  const nextMappings = profile.import_mappings.map((m) => {
    if (m.asset_id !== assetId) return m;
    return {
      ...m,
      notes: [
        ...m.notes.filter((n) => !n.startsWith('Import completed')),
        `Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors at ${result.completedAt}`,
      ],
    };
  });

  try {
    await supabase
      .from('league_migration_requests')
      .update({
        normalization_profile: {
          ...profile,
          import_mappings: nextMappings,
          import_results: nextResults,
        },
      })
      .eq('id', request.id)
      .eq('league_id', request.league_id);
  } catch (err) {
    if (isDevelopment) console.error('Failed to save import result to request:', err);
  }
}

// ── Fetch Seasons (admin) ────────────────────────────────────────────────────

export async function getLeagueSeasonsForMigration(
  leagueId: string
): Promise<ActionResult<{ id: string; name: string }[]>> {
  const access = await assertPlatformAdmin();
  if (!access.success) return access;

  const supabase = createServiceRoleClient() as any;
  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, status, start_date')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  if (error) {
    return { success: false, error: 'Failed to load seasons.' };
  }

  return {
    success: true,
    data: (data ?? []).map((s: any) => ({ id: s.id, name: s.name })),
  };
}

// ── Entity Importers ─────────────────────────────────────────────────────────

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeShortName(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 4);
  return initials || name.slice(0, 4).toUpperCase();
}

async function importTeams(
  supabase: any,
  leagueId: string,
  parsed: ParsedMigrationFile,
  asset: MigrationUploadedAsset,
  startedAt: string
): Promise<MigrationImportResult> {
  const errors: string[] = [...parsed.errors];
  let imported = 0;
  let skipped = 0;

  // Get existing teams for duplicate detection
  const { data: existingTeams } = await supabase
    .from('teams')
    .select('name')
    .eq('league_id', leagueId);

  const existingNames = new Set<string>(
    (existingTeams ?? []).map((t: any) => t.name.toLowerCase().trim())
  );

  // Get divisions for resolution
  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('league_id', leagueId);

  const divisionsByName = new Map<string, string>();
  for (const div of divisions ?? []) {
    divisionsByName.set((div as any).name.toLowerCase().trim(), (div as any).id);
  }

  for (const row of parsed.rows) {
    const teamName = row.mapped.team_name?.trim();
    if (!teamName) {
      errors.push(`Row ${row.rowNumber}: Missing team name`);
      continue;
    }

    if (existingNames.has(teamName.toLowerCase())) {
      skipped++;
      continue;
    }

    const divisionName = row.mapped.division_name?.trim();
    const divisionId = divisionName
      ? divisionsByName.get(divisionName.toLowerCase()) ?? null
      : null;

    const { error: insertError } = await supabase.from('teams').insert({
      league_id: leagueId,
      name: teamName,
      short_name: makeShortName(teamName),
      slug: makeSlug(teamName),
      division_id: divisionId,
      status: 'active',
    });

    if (insertError) {
      if (insertError.message?.includes('duplicate')) {
        skipped++;
      } else {
        errors.push(`Row ${row.rowNumber}: ${insertError.message}`);
      }
      continue;
    }

    existingNames.add(teamName.toLowerCase());
    imported++;
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    targetEntity: 'teams',
    imported,
    skipped,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

async function importPlayers(
  supabase: any,
  leagueId: string,
  seasonId: string | null,
  parsed: ParsedMigrationFile,
  asset: MigrationUploadedAsset,
  startedAt: string
): Promise<MigrationImportResult> {
  const errors: string[] = [...parsed.errors];
  let imported = 0;
  let skipped = 0;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Get existing teams for team resolution
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId);

  const teamsByName = new Map<string, string>();
  for (const team of teams ?? []) {
    teamsByName.set((team as any).name.toLowerCase().trim(), (team as any).id);
  }

  for (const row of parsed.rows) {
    const fullName =
      row.mapped.full_name?.trim() ||
      [row.mapped.first_name?.trim(), row.mapped.last_name?.trim()].filter(Boolean).join(' ');

    if (!fullName) {
      errors.push(`Row ${row.rowNumber}: Missing player name`);
      continue;
    }

    const email = row.mapped.email?.trim().toLowerCase();
    const phone = row.mapped.phone?.trim() || null;
    const position = normalizePosition(row.mapped.position?.trim() ?? '');
    const jerseyNumber = row.mapped.jersey_number ? parseInt(row.mapped.jersey_number, 10) : null;

    // Try to find or create profile
    let profileId: string | null = null;

    if (email && EMAIL_REGEX.test(email)) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        profileId = existingProfile.id;
      } else {
        const newId = crypto.randomUUID();
        const { error: profileError } = await supabase.from('profiles').insert({
          id: newId,
          email,
          full_name: fullName,
          phone,
          position: position ?? undefined,
          jersey_number: !isNaN(jerseyNumber as number) ? jerseyNumber : undefined,
          is_legacy_import: true,
        });

        if (profileError) {
          errors.push(`Row ${row.rowNumber}: Failed to create profile for ${email}`);
          continue;
        }
        profileId = newId;
      }
    } else {
      // No email — create a stub profile
      const newId = crypto.randomUUID();
      const stubEmail = `import-${newId.slice(0, 8)}@legacy.beerleaguehockey.ca`;
      const { error: profileError } = await supabase.from('profiles').insert({
        id: newId,
        email: stubEmail,
        full_name: fullName,
        phone,
        position: position ?? undefined,
        jersey_number: !isNaN(jerseyNumber as number) ? jerseyNumber : undefined,
        is_legacy_import: true,
      });

      if (profileError) {
        errors.push(`Row ${row.rowNumber}: Failed to create profile for ${fullName}`);
        continue;
      }
      profileId = newId;
    }

    // If we have a season, create a registration
    if (seasonId && profileId) {
      const teamName = row.mapped.team_name?.trim();
      const teamId = teamName ? teamsByName.get(teamName.toLowerCase()) ?? null : null;

      const { error: regError } = await supabase
        .from('registration_submissions')
        .insert({
          league_id: leagueId,
          season_id: seasonId,
          player_id: profileId,
          team_id: teamId,
          registration_type: 'free_agent',
          status: 'approved',
          preferred_position: position,
          preferred_jersey_number: !isNaN(jerseyNumber as number) ? jerseyNumber : null,
          submitted_at: new Date().toISOString(),
        });

      if (regError) {
        errors.push(`Row ${row.rowNumber}: Profile created but registration failed — ${regError.message}`);
        continue;
      }
    }

    imported++;
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    targetEntity: 'players',
    imported,
    skipped,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

async function importScheduleGames(
  supabase: any,
  leagueId: string,
  seasonId: string | null,
  parsed: ParsedMigrationFile,
  asset: MigrationUploadedAsset,
  startedAt: string
): Promise<MigrationImportResult> {
  const errors: string[] = [...parsed.errors];
  let imported = 0;
  let skipped = 0;

  if (!seasonId) {
    return {
      assetId: asset.id,
      assetName: asset.name,
      targetEntity: 'schedule_games',
      imported: 0,
      skipped: parsed.rows.length,
      errors: ['A season must be selected to import schedule games.'],
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId);

  const teamsByName = new Map<string, string>();
  for (const team of teams ?? []) {
    teamsByName.set((team as any).name.toLowerCase().trim(), (team as any).id);
  }

  type GameStatus = 'completed' | 'in_progress' | 'scheduled' | 'pending_verification' | 'cancelled' | 'postponed';
  const gamesToInsert: any[] = [];

  for (const row of parsed.rows) {
    const homeTeam = row.mapped.home_team?.trim();
    const awayTeam = row.mapped.away_team?.trim();
    const gameDate = row.mapped.game_date?.trim();
    const startTime = row.mapped.start_time?.trim() || '19:00';

    if (!homeTeam || !awayTeam) {
      errors.push(`Row ${row.rowNumber}: Missing home or away team`);
      continue;
    }

    const homeTeamId = teamsByName.get(homeTeam.toLowerCase());
    const awayTeamId = teamsByName.get(awayTeam.toLowerCase());

    if (!homeTeamId) {
      errors.push(`Row ${row.rowNumber}: Home team "${homeTeam}" not found`);
      continue;
    }
    if (!awayTeamId) {
      errors.push(`Row ${row.rowNumber}: Away team "${awayTeam}" not found`);
      continue;
    }

    const dateStr = gameDate || new Date().toISOString().slice(0, 10);
    const timeStr = /^\d{2}:\d{2}$/.test(startTime) ? startTime : '19:00';
    const scheduledAt = new Date(`${dateStr}T${timeStr}:00`);

    if (isNaN(scheduledAt.getTime())) {
      errors.push(`Row ${row.rowNumber}: Invalid date/time`);
      continue;
    }

    const homeScore = row.mapped.home_score ? parseInt(row.mapped.home_score, 10) : null;
    const awayScore = row.mapped.away_score ? parseInt(row.mapped.away_score, 10) : null;
    const hasScores = homeScore !== null && awayScore !== null && !isNaN(homeScore) && !isNaN(awayScore);

    gamesToInsert.push({
      league_id: leagueId,
      season_id: seasonId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      scheduled_at: scheduledAt.toISOString(),
      location: row.mapped.venue_name?.trim() || null,
      status: (hasScores ? 'completed' : 'scheduled') as GameStatus,
      home_score: hasScores ? homeScore : null,
      away_score: hasScores ? awayScore : null,
    });
  }

  if (gamesToInsert.length === 0) {
    return {
      assetId: asset.id,
      assetName: asset.name,
      targetEntity: 'schedule_games',
      imported: 0,
      skipped: parsed.rows.length,
      errors,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < gamesToInsert.length; i += batchSize) {
    const batch = gamesToInsert.slice(i, i + batchSize);
    const { error: insertError } = await supabase.from('games').insert(batch);

    if (insertError) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      skipped += batch.length;
    } else {
      imported += batch.length;
    }
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    targetEntity: 'schedule_games',
    imported,
    skipped,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

async function importStats(
  supabase: any,
  leagueId: string,
  seasonId: string | null,
  parsed: ParsedMigrationFile,
  asset: MigrationUploadedAsset,
  startedAt: string
): Promise<MigrationImportResult> {
  const errors: string[] = [...parsed.errors];
  let imported = 0;
  let skipped = 0;

  // Get teams for resolution
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId);

  const teamsByName = new Map<string, string>();
  for (const team of teams ?? []) {
    teamsByName.set((team as any).name.toLowerCase().trim(), (team as any).id);
  }

  // Get seasons for resolution
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('league_id', leagueId);

  const seasonsByName = new Map<string, string>();
  for (const season of seasons ?? []) {
    seasonsByName.set((season as any).name.toLowerCase().trim(), (season as any).id);
  }

  for (const row of parsed.rows) {
    const playerName = row.mapped.player_name?.trim();
    if (!playerName) {
      errors.push(`Row ${row.rowNumber}: Missing player name`);
      continue;
    }

    const teamName = row.mapped.team_name?.trim();
    const teamId = teamName ? teamsByName.get(teamName.toLowerCase()) ?? null : null;

    const seasonName = row.mapped.season_name?.trim();
    const resolvedSeasonId = seasonName
      ? seasonsByName.get(seasonName.toLowerCase()) ?? seasonId
      : seasonId;

    if (!resolvedSeasonId) {
      errors.push(`Row ${row.rowNumber}: No season could be resolved for "${playerName}"`);
      continue;
    }

    const gamesPlayed = safeInt(row.mapped.games_played);
    const goals = safeInt(row.mapped.goals);
    const assists = safeInt(row.mapped.assists);
    const points = safeInt(row.mapped.points) ?? (goals !== null && assists !== null ? goals + assists : null);
    const pim = safeInt(row.mapped.pim);

    // Detect goalie stats (has wins or gaa or save_pct)
    const wins = safeInt(row.mapped.wins);
    const gaa = safeFloat(row.mapped.gaa);
    const savePct = safeFloat(row.mapped.save_pct);
    const isGoalie = wins !== null || gaa !== null || savePct !== null;

    if (isGoalie) {
      const { error: insertError } = await supabase.from('goalie_stats').insert({
        league_id: leagueId,
        season_id: resolvedSeasonId,
        team_id: teamId,
        player_name: playerName,
        games_played: gamesPlayed,
        wins: wins,
        goals_against_average: gaa,
        save_percentage: savePct,
        is_legacy_import: true,
      });

      if (insertError) {
        errors.push(`Row ${row.rowNumber}: ${insertError.message}`);
        continue;
      }
    } else {
      const { error: insertError } = await supabase.from('player_stats').insert({
        league_id: leagueId,
        season_id: resolvedSeasonId,
        team_id: teamId,
        player_name: playerName,
        games_played: gamesPlayed,
        goals: goals ?? 0,
        assists: assists ?? 0,
        points: points ?? 0,
        pim: pim ?? 0,
        is_legacy_import: true,
      });

      if (insertError) {
        errors.push(`Row ${row.rowNumber}: ${insertError.message}`);
        continue;
      }
    }

    imported++;
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    targetEntity: 'stats',
    imported,
    skipped,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

async function importNewsArticles(
  supabase: any,
  leagueId: string,
  parsed: ParsedMigrationFile,
  asset: MigrationUploadedAsset,
  startedAt: string
): Promise<MigrationImportResult> {
  const errors: string[] = [...parsed.errors];
  let imported = 0;
  let skipped = 0;

  for (const row of parsed.rows) {
    const title = row.mapped.title?.trim();
    const body = row.mapped.body?.trim();

    if (!title) {
      errors.push(`Row ${row.rowNumber}: Missing article title`);
      continue;
    }

    if (!body) {
      errors.push(`Row ${row.rowNumber}: Missing article body`);
      continue;
    }

    const slug =
      row.mapped.slug?.trim() ||
      makeSlug(title) + '-' + Date.now().toString(36);

    const publishedAt = row.mapped.published_at?.trim() || null;
    const summary = row.mapped.summary?.trim() || null;
    const authorName = row.mapped.author_name?.trim() || null;

    const { error: insertError } = await supabase.from('articles').insert({
      league_id: leagueId,
      title,
      slug,
      body,
      summary,
      author_name: authorName,
      published: Boolean(publishedAt),
      published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
      is_legacy_import: true,
      created_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
    });

    if (insertError) {
      if (insertError.message?.includes('duplicate')) {
        skipped++;
      } else {
        errors.push(`Row ${row.rowNumber}: ${insertError.message}`);
      }
      continue;
    }

    imported++;
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    targetEntity: 'news_articles',
    imported,
    skipped,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

async function importMediaAssets(
  supabase: any,
  leagueId: string,
  parsed: ParsedMigrationFile,
  asset: MigrationUploadedAsset,
  startedAt: string
): Promise<MigrationImportResult> {
  const errors: string[] = [...parsed.errors];
  let imported = 0;
  let skipped = 0;

  // Group by album name
  const albumGroups = new Map<string, ParsedMigrationRow[]>();
  for (const row of parsed.rows) {
    const albumName = row.mapped.album_name?.trim() || 'Imported Photos';
    if (!albumGroups.has(albumName)) {
      albumGroups.set(albumName, []);
    }
    albumGroups.get(albumName)!.push(row);
  }

  for (const [albumName, rows] of albumGroups) {
    // Create or find the gallery album
    let albumId: string;

    const { data: existingAlbum } = await supabase
      .from('league_gallery')
      .select('id')
      .eq('league_id', leagueId)
      .eq('title', albumName)
      .maybeSingle();

    if (existingAlbum) {
      albumId = existingAlbum.id;
    } else {
      const { data: newAlbum, error: albumError } = await supabase
        .from('league_gallery')
        .insert({
          league_id: leagueId,
          title: albumName,
          is_legacy_import: true,
        })
        .select('id')
        .single();

      if (albumError || !newAlbum) {
        errors.push(`Failed to create album "${albumName}": ${albumError?.message ?? 'unknown'}`);
        skipped += rows.length;
        continue;
      }
      albumId = newAlbum.id;
    }

    // Insert photos
    for (const row of rows) {
      const imageUrl = row.mapped.image_url?.trim();
      if (!imageUrl) {
        errors.push(`Row ${row.rowNumber}: Missing image URL`);
        continue;
      }

      const { error: photoError } = await supabase.from('gallery_photos').insert({
        gallery_id: albumId,
        url: imageUrl,
        caption: row.mapped.caption?.trim() || null,
        credit: row.mapped.credit?.trim() || null,
        taken_at: row.mapped.taken_at?.trim() || null,
        is_legacy_import: true,
      });

      if (photoError) {
        errors.push(`Row ${row.rowNumber}: ${photoError.message}`);
        continue;
      }

      imported++;
    }
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    targetEntity: 'media_assets',
    imported,
    skipped,
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

// ── Utility ──────────────────────────────────────────────────────────────────

function normalizePosition(raw: string): 'Forward' | 'Defense' | 'Goalie' | null {
  const lower = raw.toLowerCase().trim();
  if (lower === 'forward' || lower === 'f' || lower === 'fwd') return 'Forward';
  if (lower === 'defense' || lower === 'd' || lower === 'def' || lower === 'defence') return 'Defense';
  if (lower === 'goalie' || lower === 'g' || lower === 'goaltender') return 'Goalie';
  return null;
}

function safeInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

function safeFloat(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}
