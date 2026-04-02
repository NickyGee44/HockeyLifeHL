import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { parse } from 'node-html-parser';
import { createClient } from '@supabase/supabase-js';

const SOURCE_URL = 'https://hockeylifehl.com/league-posts/statscard/?seasonid=cup';
const LEAGUE_ID = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const DEFAULT_OUTPUT_PATH = path.join(
  process.cwd(),
  'artifacts',
  'legacy',
  'hlhl-live-mcw.normalized.json',
);
const DEFAULT_SUMMARY_PATH = path.join(
  process.cwd(),
  'artifacts',
  'legacy',
  'hlhl-live-mcw.summary.json',
);

type CliOptions = {
  help: boolean;
  apply: boolean;
  outputPath: string;
  summaryPath: string;
};

type ScrapedPlayerRow = {
  last_name: string;
  first_name: string;
  full_name: string;
  gp: number;
  g: number;
  a: number;
  w: number;
  t: number;
  p: number;
  ppg: number;
  win_pct: number;
  moosehead_cup_wins: number;
};

type LegacyPlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string | null;
  matched_to_profile_id: string | null;
  moosehead_cup_wins: number | null;
};

type BaselineRow = {
  id: string;
  player_id: string;
  source_metadata: Record<string, unknown> | null;
};

type MatchedUpdate = {
  full_name: string;
  legacy_player_id: string;
  player_id: string;
  moosehead_cup_wins: number;
  previous_legacy_mcw: number;
};

type UnresolvedRow = {
  full_name: string;
  moosehead_cup_wins: number;
  reason: string;
};

function parseArgs(argv: string[]): CliOptions {
  let help = false;
  let apply = false;
  let outputPath = DEFAULT_OUTPUT_PATH;
  let summaryPath = DEFAULT_SUMMARY_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }

    if (arg === '--apply') {
      apply = true;
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

  return { help, apply, outputPath, summaryPath };
}

function printHelp(): void {
  console.log(
    [
      'Usage: pnpm exec tsx scripts/backfill-hlhl-live-website-mcw.ts [--apply] [--out <file>] [--summary <file>]',
      '',
      'Scrapes the live HockeyLifeHL Moosehead Cup stats page, writes normalized artifacts,',
      'maps rows to legacy_players / player_career_baselines, and optionally applies MCW backfills.',
      `Default artifact: ${DEFAULT_OUTPUT_PATH}`,
      `Default summary:  ${DEFAULT_SUMMARY_PATH}`,
    ].join('\n'),
  );
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

function normalizeName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&nbsp;/g, ' ')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
}

function getPlayerTableHtml(html: string): string {
  const root = parse(html);
  const tables = root.querySelectorAll('table.sortable');
  const playerTable = tables.find((table) => {
    const headers = table
      .querySelectorAll('thead th')
      .map((th) => th.text.replace(/\s+/g, ' ').trim());

    return headers.join('|') === 'Last|First|GP|G|A|W|T|P|PPG|W %|MCW';
  });

  if (!playerTable) {
    throw new Error('Could not find player Moosehead Cup stats table on live page');
  }

  return playerTable.toString();
}

function scrapePlayersFromTable(html: string): ScrapedPlayerRow[] {
  const table = parse(html);
  const rows = table.querySelectorAll('tbody tr');

  return rows
    .map((row) => {
      const cells = row
        .querySelectorAll('td')
        .map((cell) => cell.text.replace(/\s+/g, ' ').trim());

      if (cells.length !== 11) {
        return null;
      }

      const [lastName, firstName, gp, goals, assists, wins, ties, points, ppg, winPct, mcw] = cells;
      const fullName = buildFullName(firstName, lastName);
      if (!fullName) {
        return null;
      }

      return {
        last_name: lastName,
        first_name: firstName,
        full_name: fullName,
        gp: toNumber(gp),
        g: toNumber(goals),
        a: toNumber(assists),
        w: toNumber(wins),
        t: toNumber(ties),
        p: toNumber(points),
        ppg: toNumber(ppg),
        win_pct: toNumber(winPct),
        moosehead_cup_wins: toNumber(mcw),
      } satisfies ScrapedPlayerRow;
    })
    .filter((row): row is ScrapedPlayerRow => row !== null)
    .sort((left, right) =>
      left.last_name.localeCompare(right.last_name) || left.first_name.localeCompare(right.first_name),
    );
}

function buildLegacyIndex(rows: LegacyPlayerRow[]): Map<string, LegacyPlayerRow[]> {
  const index = new Map<string, LegacyPlayerRow[]>();

  for (const row of rows) {
    const candidates = new Set<string>([
      normalizeName(row.full_name),
      normalizeName(buildFullName(row.first_name, row.last_name)),
    ]);

    for (const key of candidates) {
      if (!key) continue;
      const bucket = index.get(key) ?? [];
      bucket.push(row);
      index.set(key, bucket);
    }
  }

  return index;
}

function mapScrapedRows(input: {
  scrapedRows: ScrapedPlayerRow[];
  legacyPlayers: LegacyPlayerRow[];
}): { matched: MatchedUpdate[]; unresolved: UnresolvedRow[] } {
  const legacyIndex = buildLegacyIndex(input.legacyPlayers);
  const matched: MatchedUpdate[] = [];
  const unresolved: UnresolvedRow[] = [];

  for (const row of input.scrapedRows.filter((item) => item.moosehead_cup_wins > 0)) {
    const key = normalizeName(row.full_name);
    const candidates = legacyIndex.get(key) ?? [];

    if (candidates.length === 0) {
      unresolved.push({
        full_name: row.full_name,
        moosehead_cup_wins: row.moosehead_cup_wins,
        reason: 'No legacy_players match found',
      });
      continue;
    }

    if (candidates.length > 1) {
      unresolved.push({
        full_name: row.full_name,
        moosehead_cup_wins: row.moosehead_cup_wins,
        reason: `Ambiguous legacy_players match (${candidates.length})`,
      });
      continue;
    }

    const candidate = candidates[0];
    if (!candidate.matched_to_profile_id) {
      unresolved.push({
        full_name: row.full_name,
        moosehead_cup_wins: row.moosehead_cup_wins,
        reason: 'legacy_players row has no matched_to_profile_id',
      });
      continue;
    }

    matched.push({
      full_name: row.full_name,
      legacy_player_id: candidate.id,
      player_id: candidate.matched_to_profile_id,
      moosehead_cup_wins: row.moosehead_cup_wins,
      previous_legacy_mcw: Number(candidate.moosehead_cup_wins ?? 0),
    });
  }

  matched.sort(
    (left, right) =>
      right.moosehead_cup_wins - left.moosehead_cup_wins || left.full_name.localeCompare(right.full_name),
  );

  unresolved.sort((left, right) => left.full_name.localeCompare(right.full_name));

  return { matched, unresolved };
}

async function fetchPageHtml(): Promise<string> {
  const response = await fetch(SOURCE_URL, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Nova/1.0; +https://openclaw.ai)',
      accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch live MCW page: ${response.status} ${response.statusText}`);
  }

  return await response.text();
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

  const fetchedAt = new Date().toISOString();
  const html = await fetchPageHtml();
  const playerTableHtml = getPlayerTableHtml(html);
  const scrapedRows = scrapePlayersFromTable(playerTableHtml);

  const { data: legacyPlayers, error: legacyPlayersError } = await supabase
    .from('legacy_players')
    .select('id, first_name, last_name, full_name, matched_to_profile_id, moosehead_cup_wins')
    .order('full_name', { ascending: true });

  if (legacyPlayersError || !legacyPlayers) {
    throw new Error(`Failed to read legacy_players: ${legacyPlayersError?.message || 'unknown error'}`);
  }

  const mapping = mapScrapedRows({
    scrapedRows,
    legacyPlayers: legacyPlayers as LegacyPlayerRow[],
  });

  const baselinePlayerIds = [...new Set(mapping.matched.map((row) => row.player_id))];
  const { data: baselineRows, error: baselineRowsError } = await supabase
    .from('player_career_baselines')
    .select('id, player_id, source_metadata')
    .eq('league_id', LEAGUE_ID)
    .in('player_id', baselinePlayerIds);

  if (baselineRowsError) {
    throw new Error(`Failed to read player_career_baselines: ${baselineRowsError.message}`);
  }

  const baselineByPlayerId = new Map<string, BaselineRow>();
  for (const row of (baselineRows ?? []) as BaselineRow[]) {
    baselineByPlayerId.set(row.player_id, row);
  }

  const unresolved = [...mapping.unresolved];
  const applicableMatches: MatchedUpdate[] = [];
  for (const row of mapping.matched) {
    if (!baselineByPlayerId.has(row.player_id)) {
      unresolved.push({
        full_name: row.full_name,
        moosehead_cup_wins: row.moosehead_cup_wins,
        reason: 'No player_career_baselines row for matched profile',
      });
      continue;
    }

    applicableMatches.push(row);
  }

  if (args.apply) {
    for (const row of applicableMatches) {
      const baseline = baselineByPlayerId.get(row.player_id)!;
      const mergedMetadata = {
        ...(baseline.source_metadata ?? {}),
        mooseheadCupSource: {
          derivedFrom: 'hlhl_live_website_cup_stats_page',
          sourceUrl: SOURCE_URL,
          fetchedAt,
          note: 'Backfilled from live HockeyLifeHL Moosehead Cup stats page because migration SQL mcwins values were zeroed out.',
        },
      };

      const { error: legacyUpdateError } = await supabase
        .from('legacy_players')
        .update({ moosehead_cup_wins: row.moosehead_cup_wins })
        .eq('id', row.legacy_player_id);

      if (legacyUpdateError) {
        throw new Error(`Failed updating legacy_players for ${row.full_name}: ${legacyUpdateError.message}`);
      }

      const { error: baselineUpdateError } = await supabase
        .from('player_career_baselines')
        .update({
          moosehead_cup_wins: row.moosehead_cup_wins,
          source_metadata: mergedMetadata,
        })
        .eq('id', baseline.id);

      if (baselineUpdateError) {
        throw new Error(`Failed updating player_career_baselines for ${row.full_name}: ${baselineUpdateError.message}`);
      }
    }
  }

  const postApplyVerification = args.apply
    ? await Promise.all([
        supabase
          .from('legacy_players')
          .select('full_name, moosehead_cup_wins')
          .in('full_name', ['Adam Klimowicz', 'Marek Klimowicz'])
          .order('full_name', { ascending: true }),
        supabase
          .from('player_career_baselines')
          .select('player_id, moosehead_cup_wins')
          .eq('league_id', LEAGUE_ID)
          .gt('moosehead_cup_wins', 0),
      ])
    : null;

  const summary = {
    fetched_at: fetchedAt,
    source_url: SOURCE_URL,
    player_rows_scraped: scrapedRows.length,
    positive_mcw_rows: scrapedRows.filter((row) => row.moosehead_cup_wins > 0).length,
    matched_updates: mapping.matched.length,
    applicable_updates: applicableMatches.length,
    unresolved_rows: unresolved.length,
    top_players: applicableMatches.slice(0, 15),
    unresolved_sample: unresolved.slice(0, 15),
    dry_run: !args.apply,
    verification: args.apply
      ? {
          adam_and_marek_legacy_rows: postApplyVerification?.[0].data ?? [],
          baseline_rows_with_positive_mcw: postApplyVerification?.[1].data?.length ?? 0,
        }
      : null,
  };

  ensureParentDir(args.outputPath);
  ensureParentDir(args.summaryPath);

  fs.writeFileSync(
    args.outputPath,
    `${JSON.stringify(
      {
        meta: {
          fetched_at: fetchedAt,
          source_url: SOURCE_URL,
          note: 'Scraped from live HockeyLifeHL Moosehead Cup stats page because migration SQL mcwins values were zeroed out.',
          apply_mode: args.apply,
        },
        scraped_rows: scrapedRows,
        matched_updates: applicableMatches,
        unresolved_rows: unresolved,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  fs.writeFileSync(args.summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        apply: args.apply,
        output_path: args.outputPath,
        summary_path: args.summaryPath,
        summary,
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
