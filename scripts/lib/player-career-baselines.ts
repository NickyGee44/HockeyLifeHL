import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const DEFAULT_SOURCE_SYSTEM = 'hockeylifehl_legacy_players';
const DEFAULT_SOURCE_BATCH_ID = 'legacy_players_current';
const DEFAULT_SOURCE_LABEL = 'Legacy career totals';
const UPSERT_CHUNK_SIZE = 250;

const legacyPlayerRowSchema = z.object({
  id: z.string().min(1),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string().nullable(),
  is_goalie: z.boolean().nullable(),
  games_played: z.number().nullable(),
  goals: z.number().nullable(),
  assists: z.number().nullable(),
  points: z.number().nullable(),
  points_per_game: z.number().nullable(),
  wins: z.number().nullable(),
  ties: z.number().nullable(),
  win_percentage: z.number().nullable(),
  moosehead_cup_wins: z.number().nullable(),
  goals_against: z.number().nullable(),
  goals_against_average: z.number().nullable(),
  saves: z.number().nullable(),
  shutouts: z.number().nullable(),
  save_percentage: z.number().nullable(),
  matched_to_profile_id: z.string().nullable(),
  matched_at: z.string().nullable(),
  imported_from: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

const playerCareerBaselineUpsertSchema = z.object({
  league_id: z.string().uuid(),
  player_id: z.string().uuid().nullable(),
  source_system: z.string().min(1),
  source_batch_id: z.string().min(1),
  source_record_id: z.string().min(1),
  source_label: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  full_name: z.string().nullable(),
  is_goalie: z.boolean(),
  games_played: z.number().int().nonnegative(),
  goals: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  ties: z.number().int().nonnegative(),
  moosehead_cup_wins: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  goals_against: z.number().int().nonnegative(),
  shutouts: z.number().int().nonnegative(),
  points_per_game: z.number().nonnegative(),
  win_percentage: z.number().nonnegative(),
  goals_against_average: z.number().nonnegative(),
  save_percentage: z.number().nonnegative(),
  source_updated_at: z.string().nullable(),
  imported_at: z.string(),
  source_metadata: z.record(z.string(), z.unknown()),
});

export type LegacyPlayerRow = z.infer<typeof legacyPlayerRowSchema>;
export type PlayerCareerBaselineUpsert = z.infer<typeof playerCareerBaselineUpsertSchema>;

export type ImportLegacyCareerBaselinesOptions = {
  leagueId: string;
  sourceSystem?: string;
  sourceBatchId?: string;
  sourceLabel?: string | null;
  matchedOnly?: boolean;
  dryRun?: boolean;
  limit?: number;
};

export type ImportLegacyCareerBaselinesResult = {
  dryRun: boolean;
  sourceSystem: string;
  sourceBatchId: string;
  sourceLabel: string | null;
  leagueId: string;
  fetchedRows: number;
  processedRows: number;
  matchedRows: number;
  unmatchedRows: number;
  goalieRows: number;
  upsertedRows: number;
};

function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    return;
  }

  dotenv.config();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createAdminSupabaseClient(): SupabaseClient {
  loadEnv();

  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function toInt(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.trunc(Number(value)) : 0;
}

function toDecimal(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function getDisplayName(row: LegacyPlayerRow): string | null {
  const composed = `${row.first_name} ${row.last_name}`.trim();
  const name = (row.full_name || composed).trim();
  return name || null;
}

export function mapLegacyPlayerToCareerBaseline(
  row: LegacyPlayerRow,
  options: Required<Pick<ImportLegacyCareerBaselinesOptions, 'leagueId'>> & {
    sourceSystem: string;
    sourceBatchId: string;
    sourceLabel: string | null;
    importedAt?: string;
  },
): PlayerCareerBaselineUpsert {
  const importedAt = options.importedAt ?? new Date().toISOString();

  return playerCareerBaselineUpsertSchema.parse({
    league_id: options.leagueId,
    player_id: row.matched_to_profile_id,
    source_system: options.sourceSystem,
    source_batch_id: options.sourceBatchId,
    source_record_id: row.id,
    source_label: options.sourceLabel,
    first_name: row.first_name || null,
    last_name: row.last_name || null,
    full_name: getDisplayName(row),
    is_goalie: Boolean(row.is_goalie),
    games_played: toInt(row.games_played),
    goals: toInt(row.goals),
    assists: toInt(row.assists),
    points: toInt(row.points),
    wins: toInt(row.wins),
    ties: toInt(row.ties),
    moosehead_cup_wins: toInt(row.moosehead_cup_wins),
    saves: toInt(row.saves),
    goals_against: toInt(row.goals_against),
    shutouts: toInt(row.shutouts),
    points_per_game: toDecimal(row.points_per_game),
    win_percentage: toDecimal(row.win_percentage),
    goals_against_average: toDecimal(row.goals_against_average),
    save_percentage: toDecimal(row.save_percentage),
    source_updated_at: row.updated_at,
    imported_at: importedAt,
    source_metadata: {
      source_table: 'legacy_players',
      legacy_player_id: row.id,
      imported_from: row.imported_from,
      matched_at: row.matched_at,
      source_created_at: row.created_at,
      source_updated_at: row.updated_at,
    },
  });
}

export async function fetchLegacyPlayers(
  supabase: SupabaseClient,
  options: { matchedOnly?: boolean; limit?: number } = {},
): Promise<LegacyPlayerRow[]> {
  let query = supabase
    .from('legacy_players')
    .select(
      'id, first_name, last_name, full_name, is_goalie, games_played, goals, assists, points, points_per_game, wins, ties, win_percentage, moosehead_cup_wins, goals_against, goals_against_average, saves, shutouts, save_percentage, matched_to_profile_id, matched_at, imported_from, created_at, updated_at'
    )
    .order('full_name', { ascending: true });

  if (options.matchedOnly) {
    query = query.not('matched_to_profile_id', 'is', null);
  }

  if (typeof options.limit === 'number' && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return z.array(legacyPlayerRowSchema).parse(data ?? []);
}

async function upsertCareerBaselinesInChunks(
  supabase: SupabaseClient,
  rows: PlayerCareerBaselineUpsert[],
): Promise<number> {
  let upserted = 0;

  for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + UPSERT_CHUNK_SIZE);
    const { error } = await supabase
      .from('player_career_baselines')
      .upsert(chunk, {
        onConflict: 'league_id,source_system,source_batch_id,source_record_id',
        ignoreDuplicates: false,
      });

    if (error) {
      throw new Error(
        `Failed to upsert player_career_baselines rows ${index + 1}-${index + chunk.length}: ${error.message}`
      );
    }

    upserted += chunk.length;
  }

  return upserted;
}

export async function importLegacyCareerBaselines(
  options: ImportLegacyCareerBaselinesOptions,
): Promise<ImportLegacyCareerBaselinesResult> {
  const supabase = createAdminSupabaseClient();
  const sourceSystem = options.sourceSystem?.trim() || DEFAULT_SOURCE_SYSTEM;
  const sourceBatchId = options.sourceBatchId?.trim() || DEFAULT_SOURCE_BATCH_ID;
  const sourceLabel = options.sourceLabel?.trim() || DEFAULT_SOURCE_LABEL;
  const importedAt = new Date().toISOString();

  const legacyRows = await fetchLegacyPlayers(supabase, {
    matchedOnly: options.matchedOnly,
    limit: options.limit,
  });

  const mappedRows = legacyRows.map((row) =>
    mapLegacyPlayerToCareerBaseline(row, {
      leagueId: options.leagueId,
      sourceSystem,
      sourceBatchId,
      sourceLabel,
      importedAt,
    })
  );

  const matchedRows = mappedRows.filter((row) => Boolean(row.player_id)).length;
  const goalieRows = mappedRows.filter((row) => row.is_goalie).length;

  const upsertedRows = options.dryRun
    ? 0
    : await upsertCareerBaselinesInChunks(supabase, mappedRows);

  return {
    dryRun: Boolean(options.dryRun),
    sourceSystem,
    sourceBatchId,
    sourceLabel,
    leagueId: options.leagueId,
    fetchedRows: legacyRows.length,
    processedRows: mappedRows.length,
    matchedRows,
    unmatchedRows: mappedRows.length - matchedRows,
    goalieRows,
    upsertedRows,
  };
}
