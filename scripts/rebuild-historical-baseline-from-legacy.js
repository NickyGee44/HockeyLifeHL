require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LEAGUE_ID = process.env.LEAGACY_REBUILD_LEAGUE_ID || 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const SEASON_NAME = process.env.LEGACY_REBUILD_SEASON_NAME || 'Historical Career Baseline (Pre-BLH)';
const HOME_TEAM_NAME = process.env.LEGACY_REBUILD_HOME_TEAM || 'Historical Baseline Home';
const AWAY_TEAM_NAME = process.env.LEGACY_REBUILD_AWAY_TEAM || 'Historical Baseline Away';

function isoAtOffset(baseDate, minutes) {
  const d = new Date(baseDate.getTime() + minutes * 60 * 1000);
  return d.toISOString();
}

async function countRows(table, seasonId) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('season_id', seasonId);
  if (error) throw error;
  return count || 0;
}

async function getSingle(table, queryBuilder) {
  const { data, error } = await queryBuilder;
  if (error || !data) throw error || new Error(`${table} lookup failed`);
  return data;
}

async function chunkInsert(table, rows, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert failed at chunk ${i / chunkSize + 1}: ${error.message}`);
  }
}

(async () => {
  const season = await getSingle(
    'seasons',
    supabase.from('seasons').select('id,name,league_id').eq('league_id', LEAGUE_ID).eq('name', SEASON_NAME).single()
  );
  const homeTeam = await getSingle(
    'teams',
    supabase.from('teams').select('id,name,status').eq('league_id', LEAGUE_ID).eq('name', HOME_TEAM_NAME).single()
  );
  const awayTeam = await getSingle(
    'teams',
    supabase.from('teams').select('id,name,status').eq('league_id', LEAGUE_ID).eq('name', AWAY_TEAM_NAME).single()
  );

  const { data: legacyPlayers, error: legacyError } = await supabase
    .from('legacy_players')
    .select('id,full_name,is_goalie,goals,assists,saves,goals_against,shutouts,wins,matched_to_profile_id')
    .not('matched_to_profile_id', 'is', null)
    .order('full_name', { ascending: true });

  if (legacyError) throw legacyError;
  if (!legacyPlayers?.length) throw new Error('No matched legacy players found');

  const before = {
    games: await countRows('games', season.id),
    rosters: await countRows('team_rosters', season.id),
    player_stats: await countRows('player_stats', season.id),
    goalie_stats: await countRows('goalie_stats', season.id),
    matched_legacy_players: legacyPlayers.length,
    matched_goalies: legacyPlayers.filter((p) => p.is_goalie).length,
  };

  // Clear existing baseline season data in dependency-safe order.
  for (const table of ['player_stats', 'goalie_stats', 'team_rosters', 'games']) {
    const { error } = await supabase.from(table).delete().eq('season_id', season.id);
    if (error) throw new Error(`Failed clearing ${table}: ${error.message}`);
  }

  const baseDate = new Date('2012-01-01T00:00:00.000Z');
  const games = legacyPlayers.map((player, idx) => ({
    id: randomUUID(),
    league_id: LEAGUE_ID,
    season_id: season.id,
    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,
    scheduled_at: isoAtOffset(baseDate, idx),
    status: 'completed',
    home_score: 0,
    away_score: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  await chunkInsert('games', games, 400);

  const rosters = legacyPlayers.map((player) => ({
    id: randomUUID(),
    league_id: LEAGUE_ID,
    season_id: season.id,
    team_id: homeTeam.id,
    player_id: player.matched_to_profile_id,
    status: 'active',
  }));

  await chunkInsert('team_rosters', rosters, 400);

  const playerStats = [];
  const goalieStats = [];
  for (let i = 0; i < legacyPlayers.length; i += 1) {
    const player = legacyPlayers[i];
    const game = games[i];
    if (player.is_goalie) {
      goalieStats.push({
        id: randomUUID(),
        game_id: game.id,
        player_id: player.matched_to_profile_id,
        team_id: homeTeam.id,
        season_id: season.id,
        league_id: LEAGUE_ID,
        goals_against: Number(player.goals_against || 0),
        saves: Number(player.saves || 0),
        shots_against: Number(player.saves || 0) + Number(player.goals_against || 0),
        shutout: Number(player.shutouts || 0) > 0,
        game_result: Number(player.wins || 0) > 0 ? 'W' : 'L',
        created_at: new Date().toISOString(),
      });
    } else {
      playerStats.push({
        id: randomUUID(),
        game_id: game.id,
        player_id: player.matched_to_profile_id,
        team_id: homeTeam.id,
        season_id: season.id,
        league_id: LEAGUE_ID,
        goals: Number(player.goals || 0),
        assists: Number(player.assists || 0),
        penalty_minutes: 0,
        shots: 0,
        plus_minus: 0,
        power_play_goals: 0,
        power_play_assists: 0,
        short_handed_goals: 0,
        short_handed_assists: 0,
        game_winning_goals: 0,
        empty_net_goals: 0,
        created_at: new Date().toISOString(),
      });
    }
  }

  await chunkInsert('player_stats', playerStats, 400);
  await chunkInsert('goalie_stats', goalieStats, 400);

  const after = {
    games: await countRows('games', season.id),
    rosters: await countRows('team_rosters', season.id),
    player_stats: await countRows('player_stats', season.id),
    goalie_stats: await countRows('goalie_stats', season.id),
  };

  console.log(JSON.stringify({
    league_id: LEAGUE_ID,
    season: { id: season.id, name: season.name },
    teams: { home: homeTeam, away: awayTeam },
    before,
    after,
    expected: {
      games: legacyPlayers.length,
      rosters: legacyPlayers.length,
      player_stats: legacyPlayers.filter((p) => !p.is_goalie).length,
      goalie_stats: legacyPlayers.filter((p) => p.is_goalie).length,
    },
    status: 'ok',
  }, null, 2));

  process.exit(0);
})().catch((error) => {
  console.error(JSON.stringify({ status: 'error', message: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
