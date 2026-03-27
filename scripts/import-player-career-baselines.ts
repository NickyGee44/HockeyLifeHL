import { importLegacyCareerBaselines } from './lib/player-career-baselines';

type CliOptions = {
  help: boolean;
  leagueId: string | null;
  sourceSystem?: string;
  sourceBatchId?: string;
  sourceLabel?: string | null;
  matchedOnly: boolean;
  dryRun: boolean;
  limit?: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    leagueId: null,
    matchedOnly: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--matched-only') {
      options.matchedOnly = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--league=')) {
      options.leagueId = arg.slice('--league='.length);
      continue;
    }

    if (arg === '--league') {
      options.leagueId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--source-system=')) {
      options.sourceSystem = arg.slice('--source-system='.length);
      continue;
    }

    if (arg === '--source-system') {
      options.sourceSystem = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--source-batch=')) {
      options.sourceBatchId = arg.slice('--source-batch='.length);
      continue;
    }

    if (arg === '--source-batch') {
      options.sourceBatchId = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--source-label=')) {
      options.sourceLabel = arg.slice('--source-label='.length);
      continue;
    }

    if (arg === '--source-label') {
      options.sourceLabel = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      const value = Number.parseInt(arg.slice('--limit='.length), 10);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid --limit value: ${arg}`);
      }
      options.limit = value;
      continue;
    }

    if (arg === '--limit') {
      const value = Number.parseInt(argv[index + 1] ?? '', 10);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('Missing or invalid value for --limit');
      }
      options.limit = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp(): void {
  console.log(
    [
      'Usage: pnpm exec tsx scripts/import-player-career-baselines.ts --league <league-id> [options]',
      '',
      'Imports rows from public.legacy_players into public.player_career_baselines.',
      'This preserves imported pre-BLH totals as league-scoped baseline rows that can be',
      'added to native BLH stats later instead of writing synthetic games or replacing stats.',
      '',
      'Options:',
      '  --league <uuid>          Target league id (required)',
      '  --source-system <text>   External source key (default: hockeylifehl_legacy_players)',
      '  --source-batch <text>    Idempotent batch key (default: legacy_players_current)',
      '  --source-label <text>    Human-readable source label (default: Legacy career totals)',
      '  --matched-only           Only import legacy rows that already map to a BLH profile',
      '  --limit <n>              Limit source rows for verification runs',
      '  --dry-run                Fetch and map rows without writing them',
    ].join('\n')
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.leagueId) {
    throw new Error('Missing required --league <league-id>');
  }

  const result = await importLegacyCareerBaselines({
    leagueId: options.leagueId,
    sourceSystem: options.sourceSystem,
    sourceBatchId: options.sourceBatchId,
    sourceLabel: options.sourceLabel,
    matchedOnly: options.matchedOnly,
    dryRun: options.dryRun,
    limit: options.limit,
  });

  console.log(JSON.stringify(result, null, 2));
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
    )
  );
  process.exit(1);
});
