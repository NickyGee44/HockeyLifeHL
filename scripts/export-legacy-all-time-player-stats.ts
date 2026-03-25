import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const EXPECTED_COUNTS_FROM_REPO = {
  total_rows: 923,
  skaters: 795,
  goalies: 128,
};

const SOURCE_TABLE = 'public.legacy_players';
const SOURCE_FIELDS = [
  'id',
  'first_name',
  'last_name',
  'full_name',
  'is_goalie',
  'games_played',
  'goals',
  'assists',
  'points',
  'points_per_game',
  'wins',
  'ties',
  'win_percentage',
  'moosehead_cup_wins',
  'goals_against',
  'goals_against_average',
  'saves',
  'shutouts',
  'save_percentage',
  'matched_to_profile_id',
  'matched_at',
  'imported_from',
  'created_at',
  'updated_at',
] as const;

const DEFAULT_OUTPUT_PATH = path.join(
  process.cwd(),
  'artifacts',
  'legacy',
  'legacy-all-time-player-stats.normalized.json',
);

const DEFAULT_SUMMARY_PATH = path.join(
  process.cwd(),
  'artifacts',
  'legacy',
  'legacy-all-time-player-stats.summary.json',
);

const legacyRowSchema = z.object({
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

const normalizedBaseSchema = z.object({
  legacy_player_id: z.string().min(1),
  profile_id: z.string().nullable(),
  full_name: z.string().min(1),
  first_name: z.string(),
  last_name: z.string(),
  imported_from: z.string().nullable(),
  matched_at: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

const normalizedSkaterSchema = normalizedBaseSchema.extend({
  player_type: z.literal('skater'),
  stats: z.object({
    games_played: z.number().int().nonnegative(),
    goals: z.number().int().nonnegative(),
    assists: z.number().int().nonnegative(),
    points: z.number().int().nonnegative(),
    points_per_game: z.number().nonnegative(),
    wins: z.number().int().nonnegative(),
    ties: z.number().int().nonnegative(),
    win_percentage: z.number().nonnegative(),
    moosehead_cup_wins: z.number().int().nonnegative(),
  }),
});

const normalizedGoalieSchema = normalizedBaseSchema.extend({
  player_type: z.literal('goalie'),
  stats: z.object({
    games_played: z.number().int().nonnegative(),
    wins: z.number().int().nonnegative(),
    ties: z.number().int().nonnegative(),
    win_percentage: z.number().nonnegative(),
    saves: z.number().int().nonnegative(),
    goals_against: z.number().int().nonnegative(),
    goals_against_average: z.number().nonnegative(),
    shutouts: z.number().int().nonnegative(),
    save_percentage: z.number().nonnegative(),
  }),
});

const normalizedPlayerSchema = z.union([normalizedSkaterSchema, normalizedGoalieSchema]);

type LegacyRow = z.infer<typeof legacyRowSchema>;
type NormalizedPlayer = z.infer<typeof normalizedPlayerSchema>;

type CliOptions = {
  help: boolean;
  outputPath: string;
  summaryPath: string;
};

function parseArgs(argv: string[]): CliOptions {
  let outputPath = DEFAULT_OUTPUT_PATH;
  let summaryPath = DEFAULT_SUMMARY_PATH;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }

    if (arg.startsWith('--out=')) {
      outputPath = path.resolve(arg.slice('--out='.length));
      continue;
    }

    if (arg === '--out') {
      const next = argv[index + 1];
      if (!next) throw new Error('Missing value for --out');
      outputPath = path.resolve(next);
      index += 1;
      continue;
    }

    if (arg.startsWith('--summary=')) {
      summaryPath = path.resolve(arg.slice('--summary='.length));
      continue;
    }

    if (arg === '--summary') {
      const next = argv[index + 1];
      if (!next) throw new Error('Missing value for --summary');
      summaryPath = path.resolve(next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { help, outputPath, summaryPath };
}

function printHelp(): void {
  const lines = [
    'Usage: pnpm exec tsx scripts/export-legacy-all-time-player-stats.ts [--out <file>] [--summary <file>]',
    '',
    'Reads public.legacy_players using NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    'from .env.local, normalizes the legacy aggregate all-time stats, and writes:',
    `  ${DEFAULT_OUTPUT_PATH}`,
    `  ${DEFAULT_SUMMARY_PATH}`,
  ];

  console.log(lines.join('\n'));
}

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

function toInt(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.trunc(Number(value)) : 0;
}

function toDecimal(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function displayName(row: LegacyRow): string {
  const composed = `${row.first_name} ${row.last_name}`.trim();
  return (row.full_name || composed).trim();
}

function normalizeRow(row: LegacyRow): NormalizedPlayer {
  const base = {
    legacy_player_id: row.id,
    profile_id: row.matched_to_profile_id,
    full_name: displayName(row),
    first_name: row.first_name,
    last_name: row.last_name,
    imported_from: row.imported_from,
    matched_at: row.matched_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.is_goalie) {
    return normalizedGoalieSchema.parse({
      ...base,
      player_type: 'goalie',
      stats: {
        games_played: toInt(row.games_played),
        wins: toInt(row.wins),
        ties: toInt(row.ties),
        win_percentage: toDecimal(row.win_percentage),
        saves: toInt(row.saves),
        goals_against: toInt(row.goals_against),
        goals_against_average: toDecimal(row.goals_against_average),
        shutouts: toInt(row.shutouts),
        save_percentage: toDecimal(row.save_percentage),
      },
    });
  }

  return normalizedSkaterSchema.parse({
    ...base,
    player_type: 'skater',
    stats: {
      games_played: toInt(row.games_played),
      goals: toInt(row.goals),
      assists: toInt(row.assists),
      points: toInt(row.points),
      points_per_game: toDecimal(row.points_per_game),
      wins: toInt(row.wins),
      ties: toInt(row.ties),
      win_percentage: toDecimal(row.win_percentage),
      moosehead_cup_wins: toInt(row.moosehead_cup_wins),
    },
  });
}

function ensureParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function stableSort(players: NormalizedPlayer[]): NormalizedPlayer[] {
  return [...players].sort((left, right) => {
    const typeSort = left.player_type.localeCompare(right.player_type);
    if (typeSort !== 0) return typeSort;

    const nameSort = left.full_name.localeCompare(right.full_name);
    if (nameSort !== 0) return nameSort;

    return left.legacy_player_id.localeCompare(right.legacy_player_id);
  });
}

function buildSummary(players: NormalizedPlayer[]) {
  const skaters = players.filter((player) => player.player_type === 'skater');
  const goalies = players.filter((player) => player.player_type === 'goalie');
  const matchedProfiles = players.filter((player) => player.profile_id).length;
  const unmatchedProfiles = players.length - matchedProfiles;

  const skaterTotals = skaters.reduce(
    (acc, player) => {
      acc.games_played += player.stats.games_played;
      acc.goals += player.stats.goals;
      acc.assists += player.stats.assists;
      acc.points += player.stats.points;
      acc.moosehead_cup_wins += player.stats.moosehead_cup_wins;
      return acc;
    },
    { games_played: 0, goals: 0, assists: 0, points: 0, moosehead_cup_wins: 0 },
  );

  const goalieTotals = goalies.reduce(
    (acc, player) => {
      acc.games_played += player.stats.games_played;
      acc.wins += player.stats.wins;
      acc.ties += player.stats.ties;
      acc.saves += player.stats.saves;
      acc.goals_against += player.stats.goals_against;
      acc.shutouts += player.stats.shutouts;
      return acc;
    },
    { games_played: 0, wins: 0, ties: 0, saves: 0, goals_against: 0, shutouts: 0 },
  );

  const skaterPointMismatches = skaters.filter(
    (player) => player.stats.points !== player.stats.goals + player.stats.assists,
  ).length;

  const importedFromCounts = players.reduce<Record<string, number>>((acc, player) => {
    const key = player.imported_from || 'null';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    counts: {
      total_rows: players.length,
      skaters: skaters.length,
      goalies: goalies.length,
      matched_profiles: matchedProfiles,
      unmatched_profiles: unmatchedProfiles,
    },
    repo_expected_counts: EXPECTED_COUNTS_FROM_REPO,
    repo_expected_count_match: {
      total_rows: players.length === EXPECTED_COUNTS_FROM_REPO.total_rows,
      skaters: skaters.length === EXPECTED_COUNTS_FROM_REPO.skaters,
      goalies: goalies.length === EXPECTED_COUNTS_FROM_REPO.goalies,
    },
    stat_totals: {
      skaters: skaterTotals,
      goalies: goalieTotals,
    },
    data_quality: {
      skater_point_mismatches: skaterPointMismatches,
      blank_full_names: players.filter((player) => player.full_name.trim().length === 0).length,
    },
    imported_from_breakdown: importedFromCounts,
    key_fields: {
      identity: ['legacy_player_id', 'profile_id', 'full_name', 'first_name', 'last_name', 'player_type'],
      skater_stats: ['games_played', 'goals', 'assists', 'points', 'points_per_game', 'wins', 'ties', 'win_percentage', 'moosehead_cup_wins'],
      goalie_stats: ['games_played', 'wins', 'ties', 'win_percentage', 'saves', 'goals_against', 'goals_against_average', 'shutouts', 'save_percentage'],
      provenance: ['imported_from', 'matched_at', 'created_at', 'updated_at'],
    },
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  loadEnv();

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const selectClause = SOURCE_FIELDS.join(',');
  const { data, error, count } = await supabase
    .from('legacy_players')
    .select(selectClause, { count: 'exact' })
    .order('full_name', { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to read ${SOURCE_TABLE}: ${error?.message || 'unknown error'}`);
  }

  const parsedRows = z.array(legacyRowSchema).parse(data);
  const normalizedPlayers = stableSort(parsedRows.map(normalizeRow));
  z.array(normalizedPlayerSchema).parse(normalizedPlayers);

  const generatedAt = new Date().toISOString();
  const summary = buildSummary(normalizedPlayers);
  const payload = {
    meta: {
      generated_at: generatedAt,
      source_table: SOURCE_TABLE,
      source_fields: SOURCE_FIELDS,
      fetched_row_count: count ?? normalizedPlayers.length,
      notes: [
        'public.legacy_players stores the imported legacy aggregate all-time baseline.',
        'player_stats, goalie_stats, player_season_stats, and the history page all-time leaders are downstream projections, not the source of truth.',
      ],
    },
    players: normalizedPlayers,
  };

  ensureParentDir(args.outputPath);
  ensureParentDir(args.summaryPath);

  fs.writeFileSync(args.outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    args.summaryPath,
    `${JSON.stringify(
      {
        generated_at: generatedAt,
        source_table: SOURCE_TABLE,
        source_fields: SOURCE_FIELDS,
        ...summary,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        output_path: args.outputPath,
        summary_path: args.summaryPath,
        counts: summary.counts,
        repo_expected_count_match: summary.repo_expected_count_match,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
