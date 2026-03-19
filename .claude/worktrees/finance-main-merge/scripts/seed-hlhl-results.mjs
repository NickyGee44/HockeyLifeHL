/**
 * Seed HLHL Results: Game events, player stats, goalie stats
 *
 * Populates game_events, player_stats, goalie_stats for all completed games
 * in the HLHL league. Reads existing home_score/away_score from the games
 * table and generates matching events and statistics.
 *
 * Usage:
 *   node scripts/seed-hlhl-results.mjs           # Create (skip if events exist)
 *   node scripts/seed-hlhl-results.mjs --reset    # Delete and recreate
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const RESET = process.argv.includes('--reset');
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Seeded PRNG (Mulberry32) — deterministic results on every run
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(77); // Different seed from demo for unique results

function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function rand() {
  return rng();
}

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pseudoUUID() {
  const hex = () =>
    Math.floor(rng() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${['8', '9', 'a', 'b'][Math.floor(rng() * 4)]}${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

function weightedPick(weighted) {
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let r = rng() * total;
  for (const { item, weight } of weighted) {
    r -= weight;
    if (r <= 0) return item;
  }
  return weighted[weighted.length - 1].item;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHOT_TYPES = ['wrist', 'slap', 'snap', 'backhand', 'tip', 'deflection'];

const PENALTY_TYPES = [
  'Tripping', 'Hooking', 'Slashing', 'Roughing', 'High Sticking',
  'Holding', 'Interference', 'Cross-checking', 'Boarding', 'Delay of Game',
];

const PERIOD_LENGTH_SECONDS = 1200;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distributeGoalsToPeriods(totalGoals) {
  const periods = [];
  for (let i = 0; i < totalGoals; i++) {
    const r = rng();
    if (r < 0.3) periods.push(1);
    else if (r < 0.7) periods.push(2);
    else periods.push(3);
  }
  return periods;
}

function pickScorer(skaters) {
  const weighted = skaters.map((player, idx) => ({
    item: player,
    weight: skaters.length - idx + 1,
  }));
  return weightedPick(weighted);
}

function pickAssist(skaters, excludeIds) {
  const eligible = skaters.filter((p) => !excludeIds.includes(p.player_id));
  if (eligible.length === 0) return null;
  return pick(eligible);
}

async function batchInsert(table, records, label, onConflict) {
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    let query = supabase.from(table);
    let result;
    if (onConflict) {
      result = await query.upsert(batch, { onConflict });
    } else {
      result = await query.insert(batch);
    }
    if (result.error) {
      console.error('  Failed to insert %s batch %d-%d: %s', label, i, i + batch.length - 1, result.error.message);
      if (batch[0]) console.error('  First record:', JSON.stringify(batch[0], null, 2));
      return inserted;
    }
    inserted += batch.length;
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedHLHLResults() {
  console.log('=== Seed HLHL Results: Game Events & Stats ===\n');

  // Step 1: Find HLHL league
  console.log('Looking up HLHL league...');

  // Find league by owner email pattern or by matching org name
  const { data: leagues, error: leaguesErr } = await supabase
    .from('leagues')
    .select('id, name, slug, created_by, organization_id')
    .order('created_at', { ascending: true });

  if (leaguesErr || !leagues || leagues.length === 0) {
    console.error('No leagues found.');
    process.exit(1);
  }

  // Try to find HLHL league - look for leagues with 'hlhl' or 'hockey life' in name/slug
  let league = leagues.find(l =>
    l.slug?.toLowerCase().includes('hlhl') ||
    l.name?.toLowerCase().includes('hlhl') ||
    l.name?.toLowerCase().includes('hockey life hockey league')
  );

  // Fallback: if not found by name, use the first non-demo league
  if (!league) {
    league = leagues.find(l => l.slug !== 'demo') || leagues[0];
  }

  console.log('  League: %s (%s)', league.name, league.id);

  // Step 2: Find current season (try active, then upcoming, then most recent)
  console.log('Looking up season...');
  let season = null;

  for (const status of ['active', 'upcoming', 'completed']) {
    const { data } = await supabase
      .from('seasons')
      .select('id, name, status')
      .eq('league_id', league.id)
      .eq('status', status)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();
    if (data) { season = data; break; }
  }

  // Final fallback
  if (!season) {
    const { data } = await supabase
      .from('seasons')
      .select('id, name, status')
      .eq('league_id', league.id)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();
    season = data;
  }

  if (!season) {
    console.error('No season found for league.');
    process.exit(1);
  }
  console.log('  Season: %s (%s) [status: %s]', season.name, season.id, season.status);

  // Step 3: Load teams
  console.log('Looking up teams...');
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .eq('league_id', league.id)
    .order('name');

  if (teamsErr || !teams || teams.length === 0) {
    console.error('No teams found.');
    process.exit(1);
  }
  console.log('  Teams: %d', teams.length);

  // Step 4: Load rosters
  console.log('Looking up rosters...');
  const { data: rosters, error: rostersErr } = await supabase
    .from('team_rosters')
    .select('player_id, team_id, is_goalie, position, jersey_number')
    .eq('league_id', league.id)
    .eq('season_id', season.id)
    .eq('status', 'active');

  if (rostersErr || !rosters || rosters.length === 0) {
    console.error('No rosters found for season %s.', season.name);
    process.exit(1);
  }
  console.log('  Roster entries: %d', rosters.length);

  // Build per-team roster maps
  const teamRosters = {};
  for (const t of teams) {
    teamRosters[t.id] = { goalies: [], skaters: [] };
  }
  for (const r of rosters) {
    if (!teamRosters[r.team_id]) continue;
    if (r.is_goalie || r.position === 'Goalie') {
      teamRosters[r.team_id].goalies.push(r);
    } else {
      teamRosters[r.team_id].skaters.push(r);
    }
  }

  // Verify each team has goalies and skaters
  for (const t of teams) {
    const tr = teamRosters[t.id];
    if (tr.goalies.length === 0) {
      console.warn('  Warning: Team %s has no goalies. Will use a skater as substitute.', t.name);
      // Move first skater to goalie role as fallback
      if (tr.skaters.length > 1) {
        tr.goalies.push(tr.skaters.pop());
      }
    }
    console.log('    %s: %d skaters, %d goalies', t.name, tr.skaters.length, tr.goalies.length);
  }

  // Admin user for entered_by
  const adminUserId = league.created_by;
  console.log('  Admin user (entered_by): %s', adminUserId);

  // Step 5: Load completed games
  console.log('Looking up completed games...');
  const { data: completedGames, error: gamesErr } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, home_score, away_score, scheduled_at, game_started_at, game_ended_at, game_number')
    .eq('season_id', season.id)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: true });

  if (gamesErr || !completedGames) {
    console.error('Failed to fetch completed games:', gamesErr?.message);
    process.exit(1);
  }
  console.log('  Completed games: %d', completedGames.length);

  if (completedGames.length === 0) {
    console.log('No completed games to process. Exiting.');
    return;
  }

  // Step 6: Check existing data / reset
  console.log('\nChecking for existing game events...');
  const gameIds = completedGames.map((g) => g.id);

  const { count: existingEventCount } = await supabase
    .from('game_events')
    .select('id', { count: 'exact', head: true })
    .in('game_id', gameIds.slice(0, 50));

  if (existingEventCount > 0 && !RESET) {
    console.log('Game events already exist (%d found). Use --reset to recreate.', existingEventCount);
    return;
  }

  if (existingEventCount > 0 && RESET) {
    console.log('--reset flag detected. Deleting existing data...');
    for (let i = 0; i < gameIds.length; i += BATCH_SIZE) {
      const batchIds = gameIds.slice(i, i + BATCH_SIZE);
      await supabase.from('game_events').delete().in('game_id', batchIds);
      await supabase.from('player_stats').delete().in('game_id', batchIds);
      await supabase.from('goalie_stats').delete().in('game_id', batchIds);
    }
    console.log('  Existing data deleted.\n');
  }

  // Step 7: Generate all data
  console.log('Generating game events and stats...\n');

  const allGameEvents = [];
  const allPlayerStats = [];
  const allGoalieStats = [];

  let totalGoalEvents = 0;
  let totalPenaltyEvents = 0;

  for (let gameIdx = 0; gameIdx < completedGames.length; gameIdx++) {
    const game = completedGames[gameIdx];
    const homeScore = game.home_score ?? 0;
    const awayScore = game.away_score ?? 0;
    const homeTeamId = game.home_team_id;
    const awayTeamId = game.away_team_id;

    const homeRoster = teamRosters[homeTeamId];
    const awayRoster = teamRosters[awayTeamId];

    if (!homeRoster || !awayRoster || homeRoster.skaters.length === 0 || awayRoster.skaters.length === 0) {
      console.warn('  Skipping game %s: missing roster', game.id);
      continue;
    }

    const homeGoalie = homeRoster.goalies[0];
    const awayGoalie = awayRoster.goalies[0];

    // Track per-player stats
    const playerGoals = {};
    const playerAssists = {};
    const playerPIM = {};
    const playerPPGoals = {};
    const playerSHGoals = {};
    const playerENGoals = {};
    const playerPeriodGoals = {};
    const playerPeriodAssists = {};
    const homeGoaliePeriodShots = { 1: 0, 2: 0, 3: 0 };
    const awayGoaliePeriodShots = { 1: 0, 2: 0, 3: 0 };
    const homeGoaliePeriodSaves = { 1: 0, 2: 0, 3: 0 };
    const awayGoaliePeriodSaves = { 1: 0, 2: 0, 3: 0 };

    const initPeriodStat = (map, pid) => {
      if (!map[pid]) map[pid] = { 1: 0, 2: 0, 3: 0 };
    };

    // Generate goal events
    function generateGoalEvent(teamId, teamType, period, skaters, opposingGoalie) {
      const scorer = pickScorer(skaters);
      let assist1 = null, assist2 = null;

      if (rand() < 0.8) assist1 = pickAssist(skaters, [scorer.player_id]);
      if (assist1 && rand() < 0.5) assist2 = pickAssist(skaters, [scorer.player_id, assist1.player_id]);

      const isPP = rand() < 0.15;
      const isSH = !isPP && rand() < 0.03;
      const isEN = period === 3 && rand() < 0.05;

      let gameTimeSeconds = isEN
        ? randInt(PERIOD_LENGTH_SECONDS - 120, PERIOD_LENGTH_SECONDS - 1)
        : randInt(0, PERIOD_LENGTH_SECONDS - 1);

      playerGoals[scorer.player_id] = (playerGoals[scorer.player_id] || 0) + 1;
      initPeriodStat(playerPeriodGoals, scorer.player_id);
      playerPeriodGoals[scorer.player_id][period]++;

      if (isPP) playerPPGoals[scorer.player_id] = (playerPPGoals[scorer.player_id] || 0) + 1;
      if (isSH) playerSHGoals[scorer.player_id] = (playerSHGoals[scorer.player_id] || 0) + 1;
      if (isEN) playerENGoals[scorer.player_id] = (playerENGoals[scorer.player_id] || 0) + 1;

      if (assist1) {
        playerAssists[assist1.player_id] = (playerAssists[assist1.player_id] || 0) + 1;
        initPeriodStat(playerPeriodAssists, assist1.player_id);
        playerPeriodAssists[assist1.player_id][period]++;
      }
      if (assist2) {
        playerAssists[assist2.player_id] = (playerAssists[assist2.player_id] || 0) + 1;
        initPeriodStat(playerPeriodAssists, assist2.player_id);
        playerPeriodAssists[assist2.player_id][period]++;
      }

      if (opposingGoalie) {
        if (teamType === 'home') awayGoaliePeriodShots[period]++;
        else homeGoaliePeriodShots[period]++;
      }

      return {
        game_id: game.id,
        client_event_id: pseudoUUID(),
        league_id: league.id,
        team_id: teamId,
        team_type: teamType,
        event_type: 'goal',
        period,
        game_time_seconds: gameTimeSeconds,
        entered_by: adminUserId,
        entered_at: game.game_started_at || game.scheduled_at,
        player_id: scorer.player_id,
        assist1_player_id: assist1 ? assist1.player_id : null,
        assist2_player_id: assist2 ? assist2.player_id : null,
        goalie_in_net_id: opposingGoalie ? opposingGoalie.player_id : null,
        is_power_play: isPP,
        is_short_handed: isSH,
        is_empty_net: isEN,
        shot_type: pick(SHOT_TYPES),
        sync_status: 'synced',
        created_offline: false,
      };
    }

    const homeGoalPeriods = distributeGoalsToPeriods(homeScore);
    const awayGoalPeriods = distributeGoalsToPeriods(awayScore);

    for (const period of homeGoalPeriods) {
      allGameEvents.push(generateGoalEvent(homeTeamId, 'home', period, homeRoster.skaters, awayGoalie));
      totalGoalEvents++;
    }
    for (const period of awayGoalPeriods) {
      allGameEvents.push(generateGoalEvent(awayTeamId, 'away', period, awayRoster.skaters, homeGoalie));
      totalGoalEvents++;
    }

    // Generate penalties
    const penaltyCount = randInt(2, 4);
    for (let p = 0; p < penaltyCount; p++) {
      const isHome = rand() < 0.5;
      const teamId = isHome ? homeTeamId : awayTeamId;
      const teamType = isHome ? 'home' : 'away';
      const skaters = isHome ? homeRoster.skaters : awayRoster.skaters;
      const penaltyPlayer = pick(skaters);
      const period = pick([1, 2, 3]);

      playerPIM[penaltyPlayer.player_id] = (playerPIM[penaltyPlayer.player_id] || 0) + 2;

      allGameEvents.push({
        game_id: game.id,
        client_event_id: pseudoUUID(),
        league_id: league.id,
        team_id: teamId,
        team_type: teamType,
        event_type: 'penalty',
        period,
        game_time_seconds: randInt(0, PERIOD_LENGTH_SECONDS - 1),
        entered_by: adminUserId,
        entered_at: game.game_started_at || game.scheduled_at,
        player_id: penaltyPlayer.player_id,
        penalty_type: pick(PENALTY_TYPES),
        penalty_severity: 'minor',
        penalty_minutes: 2,
        sync_status: 'synced',
        created_offline: false,
      });
      totalPenaltyEvents++;
    }

    // Generate player stats
    const generatePlayerStatRows = (skaters, teamId, teamScore, opponentScore) => {
      for (const skater of skaters) {
        const pid = skater.player_id;
        const goals = playerGoals[pid] || 0;
        const assists = playerAssists[pid] || 0;
        const pim = playerPIM[pid] || 0;
        const shots = goals + randInt(1, 5);
        let plusMinus = (goals > 0 || assists > 0)
          ? teamScore - opponentScore + randInt(-1, 1)
          : randInt(-2, 2);
        plusMinus = Math.max(-5, Math.min(5, plusMinus));

        const pg = playerPeriodGoals[pid] || { 1: 0, 2: 0, 3: 0 };
        const pa = playerPeriodAssists[pid] || { 1: 0, 2: 0, 3: 0 };

        allPlayerStats.push({
          game_id: game.id,
          player_id: pid,
          season_id: season.id,
          team_id: teamId,
          league_id: league.id,
          goals,
          assists,
          shots,
          penalty_minutes: pim,
          plus_minus: plusMinus,
          power_play_goals: playerPPGoals[pid] || 0,
          short_handed_goals: playerSHGoals[pid] || 0,
          empty_net_goals: playerENGoals[pid] || 0,
          game_winning_goals: 0,
          power_play_assists: assists > 0 && rand() < 0.15 ? 1 : 0,
          short_handed_assists: assists > 0 && rand() < 0.03 ? 1 : 0,
          period_1_goals: pg[1],
          period_2_goals: pg[2],
          period_3_goals: pg[3],
          period_1_assists: pa[1],
          period_2_assists: pa[2],
          period_3_assists: pa[3],
        });
      }
    };

    generatePlayerStatRows(homeRoster.skaters, homeTeamId, homeScore, awayScore);
    generatePlayerStatRows(awayRoster.skaters, awayTeamId, awayScore, homeScore);

    // Award GWG
    if (homeScore !== awayScore) {
      const winningTeamId = homeScore > awayScore ? homeTeamId : awayTeamId;
      const winningSkaters = homeScore > awayScore ? homeRoster.skaters : awayRoster.skaters;
      const scorers = winningSkaters.filter((s) => (playerGoals[s.player_id] || 0) > 0);
      if (scorers.length > 0) {
        const gwgScorer = pick(scorers);
        const statRow = allPlayerStats.find(
          (ps) => ps.game_id === game.id && ps.player_id === gwgScorer.player_id && ps.team_id === winningTeamId
        );
        if (statRow) statRow.game_winning_goals = 1;
      }
    }

    // Generate goalie stats
    if (homeGoalie) {
      const awayTotalShots = awayScore + randInt(15, 30);
      for (let p = 1; p <= 3; p++) {
        const periodGoals = homeGoaliePeriodShots[p];
        homeGoaliePeriodShots[p] += randInt(4, 12);
        homeGoaliePeriodSaves[p] = homeGoaliePeriodShots[p] - periodGoals;
      }
      allGoalieStats.push({
        game_id: game.id,
        player_id: homeGoalie.player_id,
        season_id: season.id,
        team_id: homeTeamId,
        league_id: league.id,
        goals_against: awayScore,
        shots_against: awayTotalShots,
        saves: awayTotalShots - awayScore,
        shutout: awayScore === 0,
        game_result: homeScore > awayScore ? 'W' : 'L',
        period_1_shots: homeGoaliePeriodShots[1],
        period_1_saves: homeGoaliePeriodSaves[1],
        period_2_shots: homeGoaliePeriodShots[2],
        period_2_saves: homeGoaliePeriodSaves[2],
        period_3_shots: homeGoaliePeriodShots[3],
        period_3_saves: homeGoaliePeriodSaves[3],
      });
    }

    if (awayGoalie) {
      const homeTotalShots = homeScore + randInt(15, 30);
      for (let p = 1; p <= 3; p++) {
        const periodGoals = awayGoaliePeriodShots[p];
        awayGoaliePeriodShots[p] += randInt(4, 12);
        awayGoaliePeriodSaves[p] = awayGoaliePeriodShots[p] - periodGoals;
      }
      allGoalieStats.push({
        game_id: game.id,
        player_id: awayGoalie.player_id,
        season_id: season.id,
        team_id: awayTeamId,
        league_id: league.id,
        goals_against: homeScore,
        shots_against: homeTotalShots,
        saves: homeTotalShots - homeScore,
        shutout: homeScore === 0,
        game_result: awayScore > homeScore ? 'W' : 'L',
        period_1_shots: awayGoaliePeriodShots[1],
        period_1_saves: awayGoaliePeriodSaves[1],
        period_2_shots: awayGoaliePeriodShots[2],
        period_2_saves: awayGoaliePeriodSaves[2],
        period_3_shots: awayGoaliePeriodShots[3],
        period_3_saves: awayGoaliePeriodSaves[3],
      });
    }

    if ((gameIdx + 1) % 5 === 0 || gameIdx === completedGames.length - 1) {
      console.log('  Processed %d / %d games', gameIdx + 1, completedGames.length);
    }
  }

  // Step 8: Deduplicate and batch insert
  // Deduplicate player_stats by (game_id, player_id) — keep the one with more goals
  const psMap = new Map();
  for (const ps of allPlayerStats) {
    const key = `${ps.game_id}:${ps.player_id}`;
    const existing = psMap.get(key);
    if (!existing || ps.goals > existing.goals) {
      psMap.set(key, ps);
    }
  }
  const dedupedPlayerStats = Array.from(psMap.values());

  console.log('\n--- Inserting data ---\n');
  console.log('(Deduped player stats: %d → %d)\n', allPlayerStats.length, dedupedPlayerStats.length);

  console.log('Inserting %d game events...', allGameEvents.length);
  const eventsInserted = await batchInsert('game_events', allGameEvents, 'game_events');
  console.log('  Inserted %d / %d', eventsInserted, allGameEvents.length);

  console.log('Upserting %d player stats...', dedupedPlayerStats.length);
  const psInserted = await batchInsert('player_stats', dedupedPlayerStats, 'player_stats', 'game_id,player_id');
  console.log('  Upserted %d / %d', psInserted, dedupedPlayerStats.length);

  console.log('Upserting %d goalie stats...', allGoalieStats.length);
  const gsInserted = await batchInsert('goalie_stats', allGoalieStats, 'goalie_stats', 'game_id,player_id');
  console.log('  Inserted %d / %d', gsInserted, allGoalieStats.length);

  // Summary
  console.log('\n=== HLHL Results Seeded Successfully ===');
  console.log('  Games processed:     %d', completedGames.length);
  console.log('  Goal events:         %d', totalGoalEvents);
  console.log('  Penalty events:      %d', totalPenaltyEvents);
  console.log('  Player stat rows:    %d', allPlayerStats.length);
  console.log('  Goalie stat rows:    %d', allGoalieStats.length);
  console.log('  League:              %s (%s)', league.name, league.id);
  console.log('  Season:              %s (%s)', season.name, season.id);
}

try {
  await seedHLHLResults();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
