/**
 * Seed Demo Results: Game events, player stats, goalie stats, and scorekeeper assignments
 *
 * Populates game_events, player_stats, goalie_stats, and game_scorekeeper_assignments
 * for all completed games in the demo league. Reads existing home_score/away_score from
 * the games table and generates matching events and statistics.
 *
 * Prerequisites:
 *   - Demo league must exist (run seed-demo-league.mjs first)
 *   - Rosters must exist (run seed-demo-rosters.mjs first)
 *   - Schedule must exist with scores (run seed-demo-schedule.mjs first)
 *
 * Usage:
 *   node scripts/seed-demo-results.mjs           # Create (skip if events exist)
 *   node scripts/seed-demo-results.mjs --reset    # Delete and recreate
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Also try .env.local (Next.js convention)
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
const DEMO_SLUG = 'demo';

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

const rng = mulberry32(42);

/** Random integer from min to max (inclusive) */
function randInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Random float 0-1 */
function rand() {
  return rng();
}

/** Pick a random element from an array */
function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Generate a UUID-like string using the seeded PRNG */
function pseudoUUID() {
  const hex = () =>
    Math.floor(rng() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${['8', '9', 'a', 'b'][Math.floor(rng() * 4)]}${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

/** Shuffle array in-place using Fisher-Yates with seeded RNG */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Weighted random pick from an array of items with weights.
 * @param {Array<{item: any, weight: number}>} weighted
 */
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
  'Tripping',
  'Hooking',
  'Slashing',
  'Roughing',
  'High Sticking',
  'Holding',
  'Interference',
  'Cross-checking',
  'Boarding',
  'Delay of Game',
];

const PERIOD_LENGTH_SECONDS = 1200; // 20 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Distribute N goals across 3 periods with weighting: ~30% P1, ~40% P2, ~30% P3.
 * Returns array of period numbers (1, 2, or 3) with length = totalGoals.
 */
function distributeGoalsToPeriods(totalGoals) {
  const periods = [];
  for (let i = 0; i < totalGoals; i++) {
    const r = rng();
    if (r < 0.3) {
      periods.push(1);
    } else if (r < 0.7) {
      periods.push(2);
    } else {
      periods.push(3);
    }
  }
  return periods;
}

/**
 * Pick a scorer from a team's skaters, weighted toward higher-points legacy players.
 * Players earlier in the roster array (sorted by legacy points) get more weight.
 */
function pickScorer(skaters) {
  const weighted = skaters.map((player, idx) => ({
    item: player,
    // Weight: inverse index + 1 so first player has highest weight
    weight: skaters.length - idx + 1,
  }));
  return weightedPick(weighted);
}

/**
 * Pick an assister from a team's skaters, excluding specified player IDs.
 */
function pickAssist(skaters, excludeIds) {
  const eligible = skaters.filter((p) => !excludeIds.includes(p.player_id));
  if (eligible.length === 0) return null;
  return pick(eligible);
}

/**
 * Insert records in batches.
 */
async function batchInsert(table, records, label) {
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(
        '  Failed to insert %s batch %d-%d: %s',
        label,
        i,
        i + batch.length - 1,
        error.message
      );
      // Log first record for debugging
      if (batch[0]) {
        console.error('  First record:', JSON.stringify(batch[0], null, 2));
      }
      return inserted;
    }
    inserted += batch.length;
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedDemoResults() {
  console.log('=== Seed Demo Results: Game Events, Stats & Assignments ===\n');

  // -----------------------------------------------------------------------
  // Step 1: Look up demo league, season, teams, rosters, scorekeepers, games
  // -----------------------------------------------------------------------

  console.log('Looking up demo league...');
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .select('id, name, created_by')
    .eq('slug', DEMO_SLUG)
    .single();

  if (leagueErr || !league) {
    console.error('Demo league not found. Run seed-demo-league.mjs first.');
    console.error('Error:', leagueErr?.message);
    process.exit(1);
  }
  console.log('  League: %s (%s)', league.name, league.id);

  console.log('Looking up active season...');
  const { data: season, error: seasonErr } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('league_id', league.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (seasonErr || !season) {
    console.error('No active season found for demo league.');
    console.error('Error:', seasonErr?.message);
    process.exit(1);
  }
  console.log('  Season: %s (%s)', season.name, season.id);

  console.log('Looking up teams...');
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .eq('league_id', league.id)
    .order('name');

  if (teamsErr || !teams || teams.length === 0) {
    console.error('No teams found for demo league.');
    process.exit(1);
  }
  console.log('  Teams: %d', teams.length);

  // Build team lookup
  const teamMap = {};
  for (const t of teams) {
    teamMap[t.id] = t;
  }

  console.log('Looking up rosters...');
  const { data: rosters, error: rostersErr } = await supabase
    .from('team_rosters')
    .select('player_id, team_id, is_goalie, position, jersey_number')
    .eq('league_id', league.id)
    .eq('season_id', season.id)
    .eq('status', 'active');

  if (rostersErr || !rosters || rosters.length === 0) {
    console.error('No rosters found. Run seed-demo-rosters.mjs first.');
    console.error('Error:', rostersErr?.message);
    process.exit(1);
  }
  console.log('  Roster entries: %d', rosters.length);

  // Build per-team roster maps (goalies and skaters separated)
  const teamRosters = {}; // teamId -> { goalies: [], skaters: [] }
  for (const t of teams) {
    teamRosters[t.id] = { goalies: [], skaters: [] };
  }
  for (const r of rosters) {
    if (!teamRosters[r.team_id]) continue;
    if (r.is_goalie) {
      teamRosters[r.team_id].goalies.push(r);
    } else {
      teamRosters[r.team_id].skaters.push(r);
    }
  }

  // Verify each team has at least one goalie and some skaters
  for (const t of teams) {
    const tr = teamRosters[t.id];
    if (tr.goalies.length === 0) {
      console.error('Team %s has no goalies! Cannot generate stats.', t.name);
      process.exit(1);
    }
    if (tr.skaters.length === 0) {
      console.error('Team %s has no skaters! Cannot generate stats.', t.name);
      process.exit(1);
    }
    console.log(
      '    %s: %d skaters, %d goalies',
      t.short_name,
      tr.skaters.length,
      tr.goalies.length
    );
  }

  console.log('Looking up scorekeepers...');
  const { data: scorekeepers, error: skErr } = await supabase
    .from('league_scorekeepers')
    .select('id, scorekeeper_id, display_name')
    .eq('league_id', league.id)
    .eq('is_active', true);

  if (skErr || !scorekeepers || scorekeepers.length === 0) {
    console.error('No scorekeepers found for demo league.');
    console.error('Error:', skErr?.message);
    process.exit(1);
  }
  console.log('  Scorekeepers: %d', scorekeepers.length);
  for (const sk of scorekeepers) {
    console.log('    %s (%s)', sk.display_name || sk.scorekeeper_id, sk.id);
  }

  // Find admin user for assigned_by field
  const adminUserId = league.created_by;
  console.log('  Admin user (assigned_by): %s', adminUserId);

  console.log('Looking up completed games...');
  const { data: completedGames, error: gamesErr } = await supabase
    .from('games')
    .select(
      'id, home_team_id, away_team_id, home_score, away_score, scheduled_at, game_started_at, game_ended_at, game_number'
    )
    .eq('season_id', season.id)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: true });

  if (gamesErr || !completedGames) {
    console.error('Failed to fetch completed games.');
    console.error('Error:', gamesErr?.message);
    process.exit(1);
  }
  console.log('  Completed games: %d', completedGames.length);

  if (completedGames.length === 0) {
    console.log('No completed games to process. Exiting.');
    return;
  }

  // -----------------------------------------------------------------------
  // Step 2: Check for existing data / reset
  // -----------------------------------------------------------------------

  console.log('\nChecking for existing game events...');
  const gameIds = completedGames.map((g) => g.id);

  // Check if any game_events exist for these games
  const { count: existingEventCount } = await supabase
    .from('game_events')
    .select('id', { count: 'exact', head: true })
    .in('game_id', gameIds.slice(0, 50)); // Check first batch

  if (existingEventCount > 0 && !RESET) {
    console.log(
      'Game events already exist for completed games (%d found). Use --reset to recreate.',
      existingEventCount
    );
    return;
  }

  if (existingEventCount > 0 && RESET) {
    console.log('--reset flag detected. Deleting existing data...');

    // Delete in batches (Supabase IN filter has limits)
    for (let i = 0; i < gameIds.length; i += BATCH_SIZE) {
      const batchIds = gameIds.slice(i, i + BATCH_SIZE);

      const { error: evtDelErr } = await supabase
        .from('game_events')
        .delete()
        .in('game_id', batchIds);
      if (evtDelErr) console.warn('  Warning: game_events delete error:', evtDelErr.message);

      const { error: psDelErr } = await supabase
        .from('player_stats')
        .delete()
        .in('game_id', batchIds);
      if (psDelErr) console.warn('  Warning: player_stats delete error:', psDelErr.message);

      const { error: gsDelErr } = await supabase
        .from('goalie_stats')
        .delete()
        .in('game_id', batchIds);
      if (gsDelErr) console.warn('  Warning: goalie_stats delete error:', gsDelErr.message);

      const { error: saDelErr } = await supabase
        .from('game_scorekeeper_assignments')
        .delete()
        .in('game_id', batchIds);
      if (saDelErr)
        console.warn('  Warning: game_scorekeeper_assignments delete error:', saDelErr.message);
    }

    console.log('  Existing data deleted.\n');
  }

  // -----------------------------------------------------------------------
  // Step 3: Generate all data for each completed game
  // -----------------------------------------------------------------------

  console.log('Generating game events, stats, and assignments...\n');

  const allGameEvents = [];
  const allPlayerStats = [];
  const allGoalieStats = [];
  const allAssignments = [];

  let totalGoalEvents = 0;
  let totalPenaltyEvents = 0;
  let totalPlayerStatRows = 0;
  let totalGoalieStatRows = 0;

  for (let gameIdx = 0; gameIdx < completedGames.length; gameIdx++) {
    const game = completedGames[gameIdx];
    const homeScore = game.home_score ?? 0;
    const awayScore = game.away_score ?? 0;
    const homeTeamId = game.home_team_id;
    const awayTeamId = game.away_team_id;

    const homeRoster = teamRosters[homeTeamId];
    const awayRoster = teamRosters[awayTeamId];

    if (!homeRoster || !awayRoster) {
      console.warn(
        '  Skipping game %s: missing roster for home=%s or away=%s',
        game.id,
        homeTeamId,
        awayTeamId
      );
      continue;
    }

    // Pick a scorekeeper (round-robin)
    const scorekeeper = scorekeepers[gameIdx % scorekeepers.length];

    // Starting goalies (first goalie in each team's roster)
    const homeGoalie = homeRoster.goalies[0];
    const awayGoalie = awayRoster.goalies[0];

    // -------------------------------------------------------------------
    // 3a: Generate goal events
    // -------------------------------------------------------------------

    const homeGoalPeriods = distributeGoalsToPeriods(homeScore);
    const awayGoalPeriods = distributeGoalsToPeriods(awayScore);

    // Track per-player stats for this game
    const playerGoals = {}; // player_id -> count
    const playerAssists = {}; // player_id -> count
    const playerPIM = {}; // player_id -> penalty minutes
    const playerPPGoals = {}; // player_id -> power play goals
    const playerSHGoals = {}; // player_id -> short-handed goals
    const playerENGoals = {}; // player_id -> empty net goals

    // Track period-level stats for players
    const playerPeriodGoals = {}; // player_id -> { 1: n, 2: n, 3: n }
    const playerPeriodAssists = {}; // player_id -> { 1: n, 2: n, 3: n }

    // Track per-period shots for goalies
    const homeGoaliePeriodShots = { 1: 0, 2: 0, 3: 0 };
    const awayGoaliePeriodShots = { 1: 0, 2: 0, 3: 0 };
    const homeGoaliePeriodSaves = { 1: 0, 2: 0, 3: 0 };
    const awayGoaliePeriodSaves = { 1: 0, 2: 0, 3: 0 };

    const initPlayerPeriodStat = (map, playerId) => {
      if (!map[playerId]) map[playerId] = { 1: 0, 2: 0, 3: 0 };
    };

    // Helper to record a goal
    function generateGoalEvent(teamId, teamType, period, skaters, opposingGoalie) {
      const scorer = pickScorer(skaters);
      const excludeFromAssist1 = [scorer.player_id];

      let assist1 = null;
      let assist2 = null;

      // ~80% chance of primary assist
      if (rand() < 0.8) {
        assist1 = pickAssist(skaters, excludeFromAssist1);
      }

      // ~50% chance of secondary assist (only if primary exists)
      if (assist1 && rand() < 0.5) {
        assist2 = pickAssist(skaters, [scorer.player_id, assist1.player_id]);
      }

      const isPP = rand() < 0.15;
      const isSH = !isPP && rand() < 0.03;
      const isLastTwoMinP3 = period === 3 && rand() < 0.05;
      const isEN = isLastTwoMinP3;

      // Game time: random within period (0-1199 seconds), but if empty net, last 2 minutes
      let gameTimeSeconds;
      if (isEN) {
        gameTimeSeconds = randInt(PERIOD_LENGTH_SECONDS - 120, PERIOD_LENGTH_SECONDS - 1);
      } else {
        gameTimeSeconds = randInt(0, PERIOD_LENGTH_SECONDS - 1);
      }

      // Track stats
      playerGoals[scorer.player_id] = (playerGoals[scorer.player_id] || 0) + 1;
      initPlayerPeriodStat(playerPeriodGoals, scorer.player_id);
      playerPeriodGoals[scorer.player_id][period]++;

      if (isPP) playerPPGoals[scorer.player_id] = (playerPPGoals[scorer.player_id] || 0) + 1;
      if (isSH) playerSHGoals[scorer.player_id] = (playerSHGoals[scorer.player_id] || 0) + 1;
      if (isEN) playerENGoals[scorer.player_id] = (playerENGoals[scorer.player_id] || 0) + 1;

      if (assist1) {
        playerAssists[assist1.player_id] = (playerAssists[assist1.player_id] || 0) + 1;
        initPlayerPeriodStat(playerPeriodAssists, assist1.player_id);
        playerPeriodAssists[assist1.player_id][period]++;
      }
      if (assist2) {
        playerAssists[assist2.player_id] = (playerAssists[assist2.player_id] || 0) + 1;
        initPlayerPeriodStat(playerPeriodAssists, assist2.player_id);
        playerPeriodAssists[assist2.player_id][period]++;
      }

      // Track goalie period shots (goals against = shots that got through)
      if (opposingGoalie) {
        if (teamType === 'home') {
          // Home team scored, so away goalie was in net
          awayGoaliePeriodShots[period]++;
        } else {
          // Away team scored, so home goalie was in net
          homeGoaliePeriodShots[period]++;
        }
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
        entered_by: scorekeeper.scorekeeper_id,
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

    // Generate home goals
    for (const period of homeGoalPeriods) {
      const evt = generateGoalEvent(
        homeTeamId,
        'home',
        period,
        homeRoster.skaters,
        awayGoalie
      );
      allGameEvents.push(evt);
      totalGoalEvents++;
    }

    // Generate away goals
    for (const period of awayGoalPeriods) {
      const evt = generateGoalEvent(
        awayTeamId,
        'away',
        period,
        awayRoster.skaters,
        homeGoalie
      );
      allGameEvents.push(evt);
      totalGoalEvents++;
    }

    // -------------------------------------------------------------------
    // 3b: Generate penalty events
    // -------------------------------------------------------------------

    const penaltyCount = randInt(2, 4);
    for (let p = 0; p < penaltyCount; p++) {
      const isHome = rand() < 0.5;
      const teamId = isHome ? homeTeamId : awayTeamId;
      const teamType = isHome ? 'home' : 'away';
      const skaters = isHome ? homeRoster.skaters : awayRoster.skaters;

      const penaltyPlayer = pick(skaters);
      const period = pick([1, 2, 3]);
      const gameTimeSeconds = randInt(0, PERIOD_LENGTH_SECONDS - 1);

      playerPIM[penaltyPlayer.player_id] = (playerPIM[penaltyPlayer.player_id] || 0) + 2;

      allGameEvents.push({
        game_id: game.id,
        client_event_id: pseudoUUID(),
        league_id: league.id,
        team_id: teamId,
        team_type: teamType,
        event_type: 'penalty',
        period,
        game_time_seconds: gameTimeSeconds,
        entered_by: scorekeeper.scorekeeper_id,
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

    // -------------------------------------------------------------------
    // 3c: Generate player stats (one row per skater per game)
    // -------------------------------------------------------------------

    const generatePlayerStatRows = (skaters, teamId, teamScore, opponentScore) => {
      for (const skater of skaters) {
        const pid = skater.player_id;
        const goals = playerGoals[pid] || 0;
        const assists = playerAssists[pid] || 0;
        const pim = playerPIM[pid] || 0;
        const ppGoals = playerPPGoals[pid] || 0;
        const shGoals = playerSHGoals[pid] || 0;
        const enGoals = playerENGoals[pid] || 0;

        // Shots: goals + random missed shots (1-5)
        const shots = goals + randInt(1, 5);

        // Plus/minus: simplified
        // Players who scored get a slight positive bias
        let plusMinus;
        if (goals > 0 || assists > 0) {
          plusMinus = teamScore - opponentScore + randInt(-1, 1);
        } else {
          plusMinus = randInt(-2, 2);
        }
        // Clamp to reasonable range
        plusMinus = Math.max(-5, Math.min(5, plusMinus));

        // Game-winning goal: if this player scored the goal that gave the team
        // the lead that was never relinquished. Simplified: award to one random
        // scorer on the winning team. We handle this in a second pass below.
        // For now, set to 0.
        const gwg = 0;

        // Period-level stats
        const pg = playerPeriodGoals[pid] || { 1: 0, 2: 0, 3: 0 };
        const pa = playerPeriodAssists[pid] || { 1: 0, 2: 0, 3: 0 };

        // Power play assists: if player had an assist on a PP goal
        // Simplified: proportional to assists and team PP rate
        const ppAssists = assists > 0 && rand() < 0.15 ? 1 : 0;
        const shAssists = assists > 0 && rand() < 0.03 ? 1 : 0;

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
          power_play_goals: ppGoals,
          short_handed_goals: shGoals,
          empty_net_goals: enGoals,
          game_winning_goals: gwg,
          power_play_assists: ppAssists,
          short_handed_assists: shAssists,
          period_1_goals: pg[1],
          period_2_goals: pg[2],
          period_3_goals: pg[3],
          period_1_assists: pa[1],
          period_2_assists: pa[2],
          period_3_assists: pa[3],
        });
        totalPlayerStatRows++;
      }
    };

    generatePlayerStatRows(homeRoster.skaters, homeTeamId, homeScore, awayScore);
    generatePlayerStatRows(awayRoster.skaters, awayTeamId, awayScore, homeScore);

    // Second pass: award game-winning goals
    // The GWG goes to one scorer on the winning team
    if (homeScore !== awayScore) {
      const winningTeamId = homeScore > awayScore ? homeTeamId : awayTeamId;
      const winningTeamSkaters = homeScore > awayScore ? homeRoster.skaters : awayRoster.skaters;

      // Find all scorers on winning team
      const scorers = winningTeamSkaters.filter((s) => (playerGoals[s.player_id] || 0) > 0);

      if (scorers.length > 0) {
        const gwgScorer = pick(scorers);
        // Find and update the player_stats row we just pushed
        const statRow = allPlayerStats.find(
          (ps) =>
            ps.game_id === game.id &&
            ps.player_id === gwgScorer.player_id &&
            ps.team_id === winningTeamId
        );
        if (statRow) {
          statRow.game_winning_goals = 1;
        }
      }
    }

    // -------------------------------------------------------------------
    // 3d: Generate goalie stats (one row per starting goalie per game)
    // -------------------------------------------------------------------

    // Home goalie faces away team's shots
    const awayTotalShots = awayScore + randInt(15, 30);
    const homeSaves = awayTotalShots - awayScore;

    // Distribute away shots across periods proportionally
    // The goals per period are already tracked in homeGoaliePeriodShots
    // We just need to add saves per period
    for (let p = 1; p <= 3; p++) {
      const periodGoals = homeGoaliePeriodShots[p]; // goals scored against home goalie this period
      const periodExtraShots = randInt(4, 12);
      homeGoaliePeriodShots[p] += periodExtraShots; // total shots this period
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
      saves: homeSaves,
      shutout: awayScore === 0,
      game_result: homeScore > awayScore ? 'W' : 'L',
      period_1_shots: homeGoaliePeriodShots[1],
      period_1_saves: homeGoaliePeriodSaves[1],
      period_2_shots: homeGoaliePeriodShots[2],
      period_2_saves: homeGoaliePeriodSaves[2],
      period_3_shots: homeGoaliePeriodShots[3],
      period_3_saves: homeGoaliePeriodSaves[3],
    });
    totalGoalieStatRows++;

    // Away goalie faces home team's shots
    const homeTotalShots = homeScore + randInt(15, 30);
    const awaySaves = homeTotalShots - homeScore;

    for (let p = 1; p <= 3; p++) {
      const periodGoals = awayGoaliePeriodShots[p];
      const periodExtraShots = randInt(4, 12);
      awayGoaliePeriodShots[p] += periodExtraShots;
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
      saves: awaySaves,
      shutout: homeScore === 0,
      game_result: awayScore > homeScore ? 'W' : 'L',
      period_1_shots: awayGoaliePeriodShots[1],
      period_1_saves: awayGoaliePeriodSaves[1],
      period_2_shots: awayGoaliePeriodShots[2],
      period_2_saves: awayGoaliePeriodSaves[2],
      period_3_shots: awayGoaliePeriodShots[3],
      period_3_saves: awayGoaliePeriodSaves[3],
    });
    totalGoalieStatRows++;

    // -------------------------------------------------------------------
    // 3e: Scorekeeper assignment
    // -------------------------------------------------------------------

    allAssignments.push({
      game_id: game.id,
      league_id: league.id,
      scorekeeper_id: scorekeeper.scorekeeper_id,
      assigned_by: adminUserId,
      assigned_at: game.scheduled_at,
      completed_at: game.game_ended_at || game.scheduled_at,
      duration_minutes: 75,
    });

    // Progress logging every 10 games
    if ((gameIdx + 1) % 10 === 0 || gameIdx === completedGames.length - 1) {
      console.log(
        '  Processed %d / %d games (%d events, %d player stats, %d goalie stats)',
        gameIdx + 1,
        completedGames.length,
        allGameEvents.length,
        allPlayerStats.length,
        allGoalieStats.length
      );
    }
  }

  // -----------------------------------------------------------------------
  // Step 4: Batch insert all data
  // -----------------------------------------------------------------------

  console.log('\n--- Inserting data ---\n');

  console.log('Inserting %d game events...', allGameEvents.length);
  const eventsInserted = await batchInsert('game_events', allGameEvents, 'game_events');
  console.log('  Inserted %d / %d game events', eventsInserted, allGameEvents.length);

  console.log('Inserting %d player stats...', allPlayerStats.length);
  const playerStatsInserted = await batchInsert('player_stats', allPlayerStats, 'player_stats');
  console.log('  Inserted %d / %d player stat rows', playerStatsInserted, allPlayerStats.length);

  console.log('Inserting %d goalie stats...', allGoalieStats.length);
  const goalieStatsInserted = await batchInsert('goalie_stats', allGoalieStats, 'goalie_stats');
  console.log('  Inserted %d / %d goalie stat rows', goalieStatsInserted, allGoalieStats.length);

  console.log('Inserting %d scorekeeper assignments...', allAssignments.length);
  const assignmentsInserted = await batchInsert(
    'game_scorekeeper_assignments',
    allAssignments,
    'scorekeeper_assignments'
  );
  console.log(
    '  Inserted %d / %d scorekeeper assignments',
    assignmentsInserted,
    allAssignments.length
  );

  // -----------------------------------------------------------------------
  // Step 5: Summary
  // -----------------------------------------------------------------------

  console.log('\n=== Demo Results Seeded Successfully ===');
  console.log('  Games processed:        %d', completedGames.length);
  console.log('  Goal events:            %d', totalGoalEvents);
  console.log('  Penalty events:         %d', totalPenaltyEvents);
  console.log('  Total game events:      %d', allGameEvents.length);
  console.log('  Player stat rows:       %d', totalPlayerStatRows);
  console.log('  Goalie stat rows:       %d', totalGoalieStatRows);
  console.log('  Scorekeeper assigns:    %d', allAssignments.length);
  console.log('  League:                 %s (%s)', league.name, league.id);
  console.log('  Season:                 %s (%s)', season.name, season.id);

  // Per-scorekeeper breakdown
  console.log('\n  Scorekeeper Assignment Breakdown:');
  for (const sk of scorekeepers) {
    const count = allAssignments.filter(
      (a) => a.scorekeeper_id === sk.scorekeeper_id
    ).length;
    console.log('    %s: %d games', sk.display_name || sk.scorekeeper_id, count);
  }
}

try {
  await seedDemoResults();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
