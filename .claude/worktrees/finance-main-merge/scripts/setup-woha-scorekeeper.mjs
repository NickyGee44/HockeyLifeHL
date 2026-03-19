/**
 * Set up a scorekeeper for the WOHA league and assign all games.
 *
 * Usage:
 *   node scripts/setup-woha-scorekeeper.mjs
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

const SCOREKEEPER_EMAIL = 'woha.scorekeeper@woha.hockeylifehl.com';
const SCOREKEEPER_PASSWORD = 'WOHAScorer2026!';
const SCOREKEEPER_NAME = 'WOHA Scorekeeper';

async function main() {
  console.log('=== Setting up WOHA Scorekeeper ===\n');

  // 1. Get WOHA league
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('slug', 'woha')
    .single();

  if (leagueErr || !league) {
    console.error('WOHA league not found. Run: node scripts/seed-woha-league.mjs');
    process.exit(1);
  }
  console.log(`League: ${league.name} (${league.id})`);

  // 2. Get the current season
  const { data: season } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('league_id', league.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!season) {
    console.error('No season found for WOHA league');
    process.exit(1);
  }
  console.log(`Season: ${season.name} (${season.id})`);

  // 3. Create or find scorekeeper auth user
  let scorekeeperId;

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === SCOREKEEPER_EMAIL);

  if (existingUser) {
    scorekeeperId = existingUser.id;
    console.log(`Scorekeeper user already exists: ${scorekeeperId}`);
  } else {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: SCOREKEEPER_EMAIL,
      password: SCOREKEEPER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: SCOREKEEPER_NAME },
    });

    if (authErr) {
      console.error('Failed to create scorekeeper user:', authErr.message);
      process.exit(1);
    }
    scorekeeperId = authData.user.id;
    console.log(`Created scorekeeper user: ${scorekeeperId}`);
  }

  // 4. Ensure profile exists (role is an enum — use 'player' as base role; scorekeeper access is via league_memberships)
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id: scorekeeperId,
      email: SCOREKEEPER_EMAIL,
      full_name: SCOREKEEPER_NAME,
      role: 'player',
    }, { onConflict: 'id' });

  if (profileErr) {
    console.error('Failed to upsert profile:', profileErr.message);
  } else {
    console.log('Profile ensured');
  }

  // 5. Add to league_scorekeepers
  const { data: existingSk } = await supabase
    .from('league_scorekeepers')
    .select('id')
    .eq('league_id', league.id)
    .eq('scorekeeper_id', scorekeeperId)
    .maybeSingle();

  let leagueScorekeeperId;
  if (existingSk) {
    leagueScorekeeperId = existingSk.id;
    console.log(`Already registered as league scorekeeper: ${leagueScorekeeperId}`);
  } else {
    const { data: newSk, error: skErr } = await supabase
      .from('league_scorekeepers')
      .insert({
        league_id: league.id,
        scorekeeper_id: scorekeeperId,
        status: 'active',
        is_active: true,
        display_name: SCOREKEEPER_NAME,
        email: SCOREKEEPER_EMAIL,
        can_edit_games: true,
        can_verify_games: true,
        hired_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (skErr) {
      console.error('Failed to add league scorekeeper:', skErr.message);
      process.exit(1);
    }
    leagueScorekeeperId = newSk.id;
    console.log(`Registered as league scorekeeper: ${leagueScorekeeperId}`);
  }

  // 6. Add league membership as scorekeeper role
  await supabase
    .from('league_memberships')
    .upsert({
      league_id: league.id,
      user_id: scorekeeperId,
      role: 'scorekeeper',
    }, { onConflict: 'league_id,user_id' });
  console.log('League membership ensured (role: scorekeeper)');

  // 7. Get all WOHA games
  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select('id, scheduled_at')
    .eq('season_id', season.id)
    .order('scheduled_at', { ascending: true });

  if (gamesErr || !games) {
    console.error('Failed to fetch games:', gamesErr?.message);
    process.exit(1);
  }
  console.log(`\nFound ${games.length} games to assign\n`);

  // 8. Assign scorekeeper to all games
  let assigned = 0;
  let skipped = 0;

  for (const game of games) {
    const { error: assignErr } = await supabase
      .from('game_scorekeeper_assignments')
      .upsert({
        game_id: game.id,
        scorekeeper_id: scorekeeperId,
        league_id: league.id,
        assigned_by: scorekeeperId,
        assigned_at: new Date().toISOString(),
        payment_status: 'pending',
      }, { onConflict: 'game_id,scorekeeper_id' });

    if (assignErr) {
      console.warn(`  Skip game ${game.id}: ${assignErr.message}`);
      skipped++;
    } else {
      assigned++;
    }
  }

  console.log(`Assigned: ${assigned} games`);
  if (skipped > 0) console.log(`Skipped: ${skipped} games`);

  // 9. Update total_assignments count
  await supabase
    .from('league_scorekeepers')
    .update({ total_assignments: assigned })
    .eq('id', leagueScorekeeperId);

  console.log('\n=== WOHA Scorekeeper Setup Complete ===\n');
  console.log('Login credentials:');
  console.log(`  Email:    ${SCOREKEEPER_EMAIL}`);
  console.log(`  Password: ${SCOREKEEPER_PASSWORD}`);
  console.log(`  URL:      https://beerleaguehockey.ca/en/login`);
  console.log(`\nAfter login, you'll be redirected to /scorekeeper dashboard.`);
  console.log(`Games assigned: ${assigned}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
