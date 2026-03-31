import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;

interface LegacySeason {
  id: number;
  name: string;
}

interface LegacyTeam {
  id: number;
  seasonId: number;
  name: string;
}

interface LegacyPlayer {
  hlplayerid: number;
  full_name: string;
}

interface LegacyPointRow {
  hlplayerid: number;
  seasonId: number;
  teamId: number;
}

interface LegacyGame {
  seasonId: number;
  team1: number;
  team2: number;
  score1: number;
  score2: number;
}

interface LegacyPlayerMatch {
  playerId: string;
  fullName: string;
  championships: number;
  legacyPlayerRowId?: string | null;
}

function readEnv(name: string): string {
  const envPath = path.join(process.cwd(), '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!match) {
    throw new Error(`Missing env var ${name} in .env.local`);
  }

  return match[1].trim().replace(/^"|"$/g, '');
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseInsertRows(sql: string): Array<Array<string | number | null>> {
  const insertMatch = sql.match(/INSERT INTO [\s\S]*? VALUES\s*([\s\S]*?);/i);
  if (!insertMatch) {
    throw new Error('Could not find INSERT statement in SQL dump');
  }

  const tuples = [...insertMatch[1].matchAll(/\(([^()]*)\)/g)].map((match) => match[1]);

  return tuples.map((tuple) => {
    const values: string[] = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < tuple.length; i += 1) {
      const ch = tuple[i];
      if (ch === "'" && tuple[i - 1] !== '\\') {
        inQuote = !inQuote;
        current += ch;
        continue;
      }

      if (ch === ',' && !inQuote) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += ch;
    }

    values.push(current.trim());

    return values.map((value) => {
      if (value === 'NULL') return null;
      if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1).replace(/\\'/g, "'");
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    });
  });
}

async function downloadMigrationAsset(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('league-migration-assets')
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download ${storagePath}: ${error.message}`);
  }

  return await data.text();
}

async function loadLegacySourceData(supabase: SupabaseClient) {
  const basePath =
    'd6e55507-6eae-4d94-978c-47c6c30a36f1/dc0d9ce4-82ef-40e2-8390-1f66293d7033';

  const [playersSql, pointsSql, seasonsSql, teamsSql, gamesSql] = await Promise.all([
    downloadMigrationAsset(supabase, `${basePath}/1773533051881-hl_players.sql`),
    downloadMigrationAsset(supabase, `${basePath}/1773533054365-hl_points.sql`),
    downloadMigrationAsset(supabase, `${basePath}/1773533056054-hl_seasons.sql`),
    downloadMigrationAsset(supabase, `${basePath}/1773533057718-hl_teams.sql`),
    downloadMigrationAsset(supabase, `${basePath}/1773533049584-hl_games.sql`),
  ]);

  const legacyPlayers: LegacyPlayer[] = parseInsertRows(playersSql).map((row) => ({
    hlplayerid: Number(row[0]),
    full_name: `${row[1] ?? ''} ${row[2] ?? ''}`.trim(),
  }));

  const legacyPoints: LegacyPointRow[] = parseInsertRows(pointsSql)
    .map((row) => ({
      hlplayerid: Number(row[1]),
      seasonId: Number(row[2]),
      teamId: Number(row[12] ?? 0),
    }))
    .filter((row) => row.teamId > 0);

  const legacySeasons: LegacySeason[] = parseInsertRows(seasonsSql).map((row) => ({
    id: Number(row[0]),
    name: String(row[1]),
  }));

  const legacyTeams: LegacyTeam[] = parseInsertRows(teamsSql).map((row) => ({
    id: Number(row[0]),
    seasonId: Number(row[1]),
    name: String(row[2]),
  }));

  const legacyGames: LegacyGame[] = parseInsertRows(gamesSql)
    .map((row) => ({
      seasonId: Number(row[1]),
      team1: Number(row[3]),
      team2: Number(row[4]),
      score1: row[6] == null ? NaN : Number(row[6]),
      score2: row[7] == null ? NaN : Number(row[7]),
    }))
    .filter((row) => Number.isFinite(row.score1) && Number.isFinite(row.score2));

  return { legacyPlayers, legacyPoints, legacySeasons, legacyTeams, legacyGames };
}

function inferChampionshipsFromLegacySql(input: {
  legacyPlayers: LegacyPlayer[];
  legacyPoints: LegacyPointRow[];
  legacySeasons: LegacySeason[];
  legacyTeams: LegacyTeam[];
  legacyGames: LegacyGame[];
}) {
  const standingsBySeason = new Map<
    number,
    Map<number, { teamId: number; wins: number; losses: number; ties: number; goalsFor: number; goalsAgainst: number }>
  >();

  for (const game of input.legacyGames) {
    const seasonStandings = standingsBySeason.get(game.seasonId) ?? new Map();
    standingsBySeason.set(game.seasonId, seasonStandings);

    for (const teamId of [game.team1, game.team2]) {
      if (!seasonStandings.has(teamId)) {
        seasonStandings.set(teamId, {
          teamId,
          wins: 0,
          losses: 0,
          ties: 0,
          goalsFor: 0,
          goalsAgainst: 0,
        });
      }
    }

    const team1 = seasonStandings.get(game.team1)!;
    const team2 = seasonStandings.get(game.team2)!;

    team1.goalsFor += game.score1;
    team1.goalsAgainst += game.score2;
    team2.goalsFor += game.score2;
    team2.goalsAgainst += game.score1;

    if (game.score1 > game.score2) {
      team1.wins += 1;
      team2.losses += 1;
    } else if (game.score2 > game.score1) {
      team2.wins += 1;
      team1.losses += 1;
    } else {
      team1.ties += 1;
      team2.ties += 1;
    }
  }

  const championTeamBySeason = new Map<number, number>();
  for (const season of input.legacySeasons) {
    const standings = [...(standingsBySeason.get(season.id)?.values() ?? [])].sort((left, right) => {
      const leftPoints = left.wins * 2 + left.ties;
      const rightPoints = right.wins * 2 + right.ties;
      if (rightPoints !== leftPoints) return rightPoints - leftPoints;

      const leftDiff = left.goalsFor - left.goalsAgainst;
      const rightDiff = right.goalsFor - right.goalsAgainst;
      if (rightDiff !== leftDiff) return rightDiff - leftDiff;

      return right.goalsFor - left.goalsFor;
    });

    if (standings[0]) {
      championTeamBySeason.set(season.id, standings[0].teamId);
    }
  }

  const championshipsByLegacyPlayer = new Map<number, number>();
  for (const row of input.legacyPoints) {
    const championTeamId = championTeamBySeason.get(row.seasonId);
    if (!championTeamId) continue;
    if (row.teamId !== championTeamId) continue;

    championshipsByLegacyPlayer.set(
      row.hlplayerid,
      (championshipsByLegacyPlayer.get(row.hlplayerid) ?? 0) + 1,
    );
  }

  const legacyPlayerById = new Map(input.legacyPlayers.map((player) => [player.hlplayerid, player]));
  const legacyTeamById = new Map(input.legacyTeams.map((team) => [team.id, team]));

  const championSeasonDetails = [...championTeamBySeason.entries()].map(([seasonId, teamId]) => {
    const season = input.legacySeasons.find((item) => item.id === seasonId);
    const team = legacyTeamById.get(teamId);
    return {
      seasonId,
      seasonName: season?.name ?? `Season ${seasonId}`,
      championTeamId: teamId,
      championTeamName: team?.name ?? `Team ${teamId}`,
    };
  });

  const inferredPlayers = [...championshipsByLegacyPlayer.entries()]
    .map(([hlplayerid, championships]) => ({
      hlplayerid,
      full_name: legacyPlayerById.get(hlplayerid)?.full_name ?? `Player ${hlplayerid}`,
      championships,
    }))
    .sort((left, right) =>
      right.championships - left.championships || left.full_name.localeCompare(right.full_name),
    );

  return { championSeasonDetails, inferredPlayers };
}

async function mapInferredPlayersToLiveProfiles(
  supabase: SupabaseClient,
  inferredPlayers: Array<{ hlplayerid: number; full_name: string; championships: number }>,
): Promise<LegacyPlayerMatch[]> {
  const matches: LegacyPlayerMatch[] = [];

  for (const inferred of inferredPlayers) {
    const normalizedName = normalizeName(inferred.full_name);

    const { data: legacyPlayers, error: legacyPlayersError } = await supabase
      .from('legacy_players')
      .select('id, full_name, matched_to_profile_id')
      .or(`full_name.ilike.%${inferred.full_name}%,full_name.ilike.%${inferred.full_name.split(' ').slice(-1)[0]}%`);
    if (legacyPlayersError) {
      throw new Error(`Failed to read legacy_players for ${inferred.full_name}: ${legacyPlayersError.message}`);
    }

    const exactLegacyMatches = (legacyPlayers ?? []).filter((row) =>
      normalizeName(row.full_name) === normalizedName ||
      normalizedName.endsWith(normalizeName(row.full_name)),
    );

    if (exactLegacyMatches.length === 1 && exactLegacyMatches[0].matched_to_profile_id) {
      matches.push({
        playerId: exactLegacyMatches[0].matched_to_profile_id,
        fullName: inferred.full_name,
        championships: inferred.championships,
        legacyPlayerRowId: exactLegacyMatches[0].id,
      });
      continue;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', inferred.full_name)
      .limit(5);
    if (profilesError) {
      throw new Error(`Failed to read profiles for ${inferred.full_name}: ${profilesError.message}`);
    }

    const exactProfileMatches = (profiles ?? []).filter(
      (profile) => normalizeName(profile.full_name) === normalizedName,
    );

    if (exactProfileMatches.length === 1) {
      matches.push({
        playerId: exactProfileMatches[0].id,
        fullName: inferred.full_name,
        championships: inferred.championships,
        legacyPlayerRowId: exactLegacyMatches[0]?.id ?? null,
      });
      continue;
    }

    throw new Error(
      `Could not map inferred player ${inferred.full_name} (HLplayerID ${inferred.hlplayerid}) to a unique live profile`,
    );
  }

  return matches;
}

async function applyBackfill(supabase: SupabaseClient, matches: LegacyPlayerMatch[]) {
  const leagueId = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';

  for (const match of matches) {
    const { error: baselineError } = await supabase
      .from('player_career_baselines')
      .update({
        moosehead_cup_wins: match.championships,
        source_metadata: {
          derivedFrom: 'legacy_hl_sql_standings',
          note: 'Backfilled from uploaded HLHL migration SQL because mcwins column was empty in source dump',
        },
      })
      .eq('league_id', leagueId)
      .eq('player_id', match.playerId);

    if (baselineError) {
      throw new Error(`Failed to update player_career_baselines for ${match.fullName}: ${baselineError.message}`);
    }

    if (match.legacyPlayerRowId) {
      const { error: legacyError } = await supabase
        .from('legacy_players')
        .update({ moosehead_cup_wins: match.championships })
        .eq('id', match.legacyPlayerRowId);

      if (legacyError) {
        throw new Error(`Failed to update legacy_players for ${match.fullName}: ${legacyError.message}`);
      }
    }
  }
}

async function main() {
  const supabase = createClient(readEnv('NEXT_PUBLIC_SUPABASE_URL'), readEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const sourceData = await loadLegacySourceData(supabase);
  const inferred = inferChampionshipsFromLegacySql(sourceData);
  const matches = await mapInferredPlayersToLiveProfiles(supabase, inferred.inferredPlayers);

  console.log('Derived champion seasons:');
  console.table(inferred.championSeasonDetails);

  console.log(`Mapped ${matches.length} player championship totals:`);
  console.table(matches.slice(0, 30));

  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Re-run with --apply to persist changes.');
    return;
  }

  await applyBackfill(supabase, matches);
  console.log(`Applied championship backfill for ${matches.length} players.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
