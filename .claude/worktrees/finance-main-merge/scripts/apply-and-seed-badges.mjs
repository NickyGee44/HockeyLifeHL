import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

// Supabase project connection via transaction pooler
const DB_HOST = 'aws-1-us-east-1.pooler.supabase.com';
const DB_PORT = 5432;
const DB_NAME = 'postgres';
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
const DB_USER = `postgres.${PROJECT_REF}`;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set them in .env.local or pass them inline.');
  process.exit(1);
}
const LEAGUE_ID = 'b0000000-0000-0000-0000-000000000002';
const SEASON_ID = 'b0000000-0000-0000-0000-000000000003';

async function applyMigration() {
  if (!DB_PASSWORD) {
    console.log('No SUPABASE_DB_PASSWORD env var set. Trying Supabase JS client to check table...');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await supabase.from('player_badges').select('id').limit(0);

    if (!error) {
      console.log('player_badges table already exists! Skipping migration.');
      return true;
    }

    console.log('Table does not exist:', error.message);
    console.log('\nTo apply the migration, either:');
    console.log('  1. Set SUPABASE_DB_PASSWORD env var and rerun this script');
    console.log('  2. Go to Supabase Dashboard > SQL Editor and paste the migration SQL');
    console.log('  3. Run: SUPABASE_DB_PASSWORD=yourpassword node scripts/apply-and-seed-badges.mjs');
    return false;
  }

  console.log('Connecting to database...');
  console.log('Host:', DB_HOST, 'Port:', DB_PORT, 'User:', DB_USER);
  const client = new Client({
    connectionString: `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
    ssl: { rejectUnauthorized: false, servername: DB_HOST },
  });

  await client.connect();
  console.log('Connected!');

  // Check if table already exists
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'player_badges' LIMIT 1`
  );
  if (rows.length > 0) {
    console.log('player_badges table already exists! Skipping migration.');
    await client.end();
    return true;
  }

  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260209_create_player_badges.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration...');
  await client.query(sql);
  console.log('Migration applied successfully!');

  await client.end();
  return true;
}

async function seedBadges() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Verify table exists
  const { error: checkError } = await supabase.from('player_badges').select('id').limit(0);
  if (checkError) {
    console.log('player_badges table not found:', checkError.message);
    return;
  }

  // Clear existing test badges for this league/season
  console.log('\nClearing existing badges...');
  await supabase.from('player_badges').delete().eq('league_id', LEAGUE_ID).eq('season_id', SEASON_ID);

  // Get teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, slug')
    .eq('league_id', LEAGUE_ID)
    .order('name');

  if (!teams || teams.length === 0) {
    console.log('No teams found in BMHL league');
    return;
  }
  console.log(`Found ${teams.length} teams`);

  // Get top scorers
  const { data: scorers } = await supabase
    .from('player_season_stats')
    .select('player_id, full_name, team_id, team_name, goals, assists, points, games_played')
    .eq('season_id', SEASON_ID)
    .order('points', { ascending: false })
    .limit(30);

  console.log(`Found ${scorers?.length || 0} players with stats`);

  // Get goalies
  const { data: goalieRows } = await supabase
    .from('goalie_stats')
    .select('player_id, team_id, saves, goals_against, game_result, player:profiles(full_name)')
    .eq('season_id', SEASON_ID);

  const goalieMap = {};
  for (const g of goalieRows || []) {
    const pid = g.player_id;
    if (!goalieMap[pid]) {
      const profile = Array.isArray(g.player) ? g.player[0] : g.player;
      goalieMap[pid] = { name: profile?.full_name, team_id: g.team_id, gp: 0, saves: 0, ga: 0, wins: 0 };
    }
    goalieMap[pid].gp++;
    goalieMap[pid].saves += g.saves || 0;
    goalieMap[pid].ga += g.goals_against || 0;
    if (g.game_result === 'W') goalieMap[pid].wins++;
  }

  const goalies = Object.entries(goalieMap)
    .map(([pid, g]) => ({
      player_id: pid,
      ...g,
      sv_pct: g.saves + g.ga > 0 ? g.saves / (g.saves + g.ga) : 0,
      gaa: g.gp > 0 ? g.ga / g.gp : 99,
    }))
    .sort((a, b) => b.sv_pct - a.sv_pct);

  // Get rosters for championship
  const { data: rosterEntries } = await supabase
    .from('team_rosters')
    .select('player_id, team_id')
    .eq('season_id', SEASON_ID)
    .in('team_id', teams.map(t => t.id));

  // Build badges
  const badges = [];

  // 1. CHAMPIONSHIP - pick a team with players
  const teamsWithPlayers = teams.filter(t => rosterEntries?.some(r => r.team_id === t.id));
  const champTeam = teamsWithPlayers[Math.floor(Math.random() * teamsWithPlayers.length)];
  if (champTeam) {
    const champRoster = rosterEntries?.filter(r => r.team_id === champTeam.id) || [];
    for (const player of champRoster) {
      badges.push({
        player_id: player.player_id,
        league_id: LEAGUE_ID,
        season_id: SEASON_ID,
        team_id: champTeam.id,
        badge_type: 'championship',
        metadata: { team_name: champTeam.name },
      });
    }
    console.log(`\nChampionship: ${champTeam.name} (${champRoster.length} players)`);
  }

  // 2. TOP SCORER - most goals
  if (scorers && scorers.length > 0) {
    const topGoalScorer = [...scorers].sort((a, b) => b.goals - a.goals)[0];
    badges.push({
      player_id: topGoalScorer.player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: topGoalScorer.team_id,
      badge_type: 'top_scorer',
      metadata: { goals: topGoalScorer.goals, games_played: topGoalScorer.games_played },
    });
    console.log(`Top Scorer: ${topGoalScorer.full_name} (${topGoalScorer.goals}g)`);

    // 3. POINTS LEADER
    const pointsLeader = scorers[0];
    badges.push({
      player_id: pointsLeader.player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: pointsLeader.team_id,
      badge_type: 'points_leader',
      metadata: { points: pointsLeader.points, goals: pointsLeader.goals, assists: pointsLeader.assists },
    });
    console.log(`Points Leader: ${pointsLeader.full_name} (${pointsLeader.points}pts)`);

    // 4. IRON MAN - give to several players across different teams
    const ironManCandidates = scorers.filter(s => s.games_played >= 3);
    const ironManTeams = new Set();
    for (const player of ironManCandidates) {
      if (ironManTeams.size >= 6) break;
      if (ironManTeams.has(player.team_id)) continue;
      ironManTeams.add(player.team_id);
      badges.push({
        player_id: player.player_id,
        league_id: LEAGUE_ID,
        season_id: SEASON_ID,
        team_id: player.team_id,
        badge_type: 'iron_man',
        metadata: { games_played: player.games_played },
      });
      console.log(`Iron Man: ${player.full_name} (${player.games_played}gp - ${player.team_name})`);
    }
  }

  // 5. TOP GOALIE
  if (goalies.length > 0) {
    const topGoalie = goalies[0];
    badges.push({
      player_id: topGoalie.player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: topGoalie.team_id,
      badge_type: 'top_goalie',
      metadata: {
        save_percentage: Math.round(topGoalie.sv_pct * 1000) / 10,
        goals_against_average: Math.round(topGoalie.gaa * 100) / 100,
        games_played: topGoalie.gp,
      },
    });
    console.log(`Top Goalie: ${topGoalie.name} (SV% ${(topGoalie.sv_pct * 100).toFixed(1)}%)`);
  }

  // 6. MOST ASSISTS
  if (scorers && scorers.length > 0) {
    const assistLeader = [...scorers].sort((a, b) => b.assists - a.assists)[0];
    badges.push({
      player_id: assistLeader.player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: assistLeader.team_id,
      badge_type: 'most_assists',
      metadata: { assists: assistLeader.assists, games_played: assistLeader.games_played },
    });
    console.log(`Most Assists: ${assistLeader.full_name} (${assistLeader.assists}a)`);

    // 7. BEST PLUS/MINUS - give to 2nd place scorer as sample
    if (scorers.length > 1) {
      badges.push({
        player_id: scorers[1].player_id,
        league_id: LEAGUE_ID,
        season_id: SEASON_ID,
        team_id: scorers[1].team_id,
        badge_type: 'best_plus_minus',
        metadata: { plus_minus: 12 },
      });
      console.log(`Best +/-: ${scorers[1].full_name} (+12)`);
    }

    // 8. PENALTY FREE - give to a player with many games
    const cleanPlayers = scorers.filter(s => s.games_played >= 3);
    if (cleanPlayers.length > 2) {
      badges.push({
        player_id: cleanPlayers[2].player_id,
        league_id: LEAGUE_ID,
        season_id: SEASON_ID,
        team_id: cleanPlayers[2].team_id,
        badge_type: 'penalty_free',
        metadata: { games_played: cleanPlayers[2].games_played, penalty_minutes: 0 },
      });
      console.log(`Penalty Free: ${cleanPlayers[2].full_name} (${cleanPlayers[2].games_played}gp, 0 PIM)`);
    }

    // 9. TEAM MVP - top scorer per team (up to 4 teams)
    const teamMVPs = new Set();
    for (const player of scorers) {
      if (teamMVPs.size >= 4) break;
      if (teamMVPs.has(player.team_id)) continue;
      teamMVPs.add(player.team_id);
      badges.push({
        player_id: player.player_id,
        league_id: LEAGUE_ID,
        season_id: SEASON_ID,
        team_id: player.team_id,
        badge_type: 'team_mvp',
        metadata: { points: player.points, goals: player.goals, assists: player.assists },
      });
      console.log(`Team MVP: ${player.full_name} (${player.points}pts - ${player.team_name})`);
    }
  }

  // 10. SHUTOUT KING (if we have goalies with shutouts)
  if (goalies.length > 0) {
    badges.push({
      player_id: goalies[0].player_id,
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      team_id: goalies[0].team_id,
      badge_type: 'shutout_king',
      metadata: { shutouts: 3, games_played: goalies[0].gp },
    });
    console.log(`Shutout King: ${goalies[0].name} (3 SO)`);
  }

  // Insert all badges - split into original types and new types
  const ORIGINAL_TYPES = ['championship', 'top_scorer', 'points_leader', 'top_goalie', 'iron_man'];
  const originalBadges = badges.filter(b => ORIGINAL_TYPES.includes(b.badge_type));
  const newBadges = badges.filter(b => !ORIGINAL_TYPES.includes(b.badge_type));

  console.log(`\n--- Inserting ${originalBadges.length} original badges ---`);

  const { data: inserted, error: insertError } = await supabase
    .from('player_badges')
    .upsert(originalBadges, { onConflict: 'player_id,season_id,badge_type' })
    .select();

  if (insertError) {
    console.log('Insert error:', insertError.message);
    console.log('Details:', JSON.stringify(insertError, null, 2));
    return;
  }

  console.log(`Successfully inserted ${inserted?.length || 0} original badges!`);

  // Try inserting new badge types (requires 20260210_expand_badge_types.sql migration)
  if (newBadges.length > 0) {
    console.log(`\n--- Inserting ${newBadges.length} new badge types ---`);
    const { data: newInserted, error: newError } = await supabase
      .from('player_badges')
      .upsert(newBadges, { onConflict: 'player_id,season_id,badge_type' })
      .select();

    if (newError) {
      console.log(`\nNew badge types not yet in DB enum. Apply migration first:`);
      console.log(`  supabase/migrations/20260210_expand_badge_types.sql`);
      console.log(`Skipped ${newBadges.length} new badges (${[...new Set(newBadges.map(b => b.badge_type))].join(', ')})`);
    } else {
      console.log(`Successfully inserted ${newInserted?.length || 0} new badges!`);
    }
  }

  // Verify
  const { data: allBadges } = await supabase
    .from('player_badges')
    .select('badge_type, player_id, metadata, player:profiles(full_name), team:teams(name)')
    .eq('league_id', LEAGUE_ID)
    .eq('season_id', SEASON_ID);

  console.log(`\n=== BMHL Badges Summary (${allBadges?.length || 0} total) ===`);
  const byType = {};
  for (const b of allBadges || []) {
    if (!byType[b.badge_type]) byType[b.badge_type] = [];
    const profile = Array.isArray(b.player) ? b.player[0] : b.player;
    const team = Array.isArray(b.team) ? b.team[0] : b.team;
    byType[b.badge_type].push(`${profile?.full_name || '?'} (${team?.name || '?'})`);
  }
  for (const [type, players] of Object.entries(byType)) {
    console.log(`\n${type} (${players.length}):`);
    players.forEach(p => console.log(`  - ${p}`));
  }
}

async function main() {
  const migrationApplied = await applyMigration();
  if (migrationApplied) {
    await seedBadges();
  }
}

main().catch(console.error);
