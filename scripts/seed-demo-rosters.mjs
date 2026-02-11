/**
 * Seed Demo Rosters: Import Legacy Players into Demo League Teams
 *
 * Queries the legacy_players table for historical players, creates auth users
 * and profiles for them, then distributes them across the 8 demo league teams.
 *
 * Prerequisites:
 *   - Demo league must exist (run seed-demo-league.mjs first)
 *   - legacy_players table must have data
 *
 * Usage:
 *   node scripts/seed-demo-rosters.mjs           # Create (skip if rosters exist)
 *   node scripts/seed-demo-rosters.mjs --reset    # Delete demo rosters and recreate
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEAM_COUNT = 8;
const SKATERS_PER_TEAM = 13;
const GOALIES_PER_TEAM = 2;
const PLAYERS_PER_TEAM = SKATERS_PER_TEAM + GOALIES_PER_TEAM; // 15
const TOTAL_PLAYERS = TEAM_COUNT * PLAYERS_PER_TEAM; // 120

const EMAIL_DOMAIN = 'demo.hockeylifehl.com';
const DEFAULT_PASSWORD = 'DemoPlayer2026!';

const SKATER_POSITIONS = ['Forward', 'Forward', 'Forward', 'Defense', 'Defense'];
// Weighted distribution: ~60% Forward, ~40% Defense (round-robin through this array)

const SEASON_START_DATE = '2026-01-05';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a unique jersey number for a team, avoiding duplicates.
 * Goalies get numbers 1-35, skaters get 2-99.
 */
function generateJerseyNumber(isGoalie, usedNumbers) {
  const min = isGoalie ? 1 : 2;
  const max = isGoalie ? 35 : 99;

  let attempts = 0;
  while (attempts < 200) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!usedNumbers.has(num)) {
      usedNumbers.add(num);
      return num;
    }
    attempts++;
  }

  // Fallback: find any available number in range
  for (let n = min; n <= max; n++) {
    if (!usedNumbers.has(n)) {
      usedNumbers.add(n);
      return n;
    }
  }

  // Last resort
  return null;
}

/**
 * Distribute players round-robin across teams for balanced skill.
 * Players should already be sorted by skill (points DESC or wins DESC).
 * Snake draft order: 0,1,2,...,7,7,6,...,0,0,1,... for fairness.
 */
function snakeDraft(players, teamCount) {
  const teams = Array.from({ length: teamCount }, () => []);
  let forward = true;

  let teamIndex = 0;
  for (const player of players) {
    teams[teamIndex].push(player);

    if (forward) {
      if (teamIndex === teamCount - 1) {
        forward = false;
        // Stay on last team (snake turn)
      } else {
        teamIndex++;
      }
    } else {
      if (teamIndex === 0) {
        forward = true;
        // Stay on first team (snake turn)
      } else {
        teamIndex--;
      }
    }
  }

  return teams;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedDemoRosters() {
  console.log('=== Seed Demo Rosters: Legacy Players ===\n');

  // Step 1: Find the demo league
  console.log('Looking up demo league...');
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', 'demo')
    .single();

  if (leagueErr || !league) {
    console.error('Demo league not found. Run seed-demo-league.mjs first.');
    console.error('Error:', leagueErr?.message);
    process.exit(1);
  }
  console.log('  League: %s', league.id);

  // Step 2: Find the active season
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

  // Step 3: Get the teams
  console.log('Looking up teams...');
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', league.id)
    .order('name');

  if (teamsErr || !teams || teams.length === 0) {
    console.error('No teams found for demo league.');
    console.error('Error:', teamsErr?.message);
    process.exit(1);
  }

  if (teams.length !== TEAM_COUNT) {
    console.warn('  Warning: Expected %d teams, found %d. Adjusting.', TEAM_COUNT, teams.length);
  }
  for (const t of teams) {
    console.log('  Team: %s (%s)', t.name, t.id);
  }

  const teamCount = teams.length;

  // Step 4: Check for existing rosters
  console.log('\nChecking for existing demo rosters...');
  const { count: existingCount } = await supabase
    .from('team_rosters')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', league.id)
    .eq('season_id', season.id);

  if (existingCount > 0 && !RESET) {
    console.log(
      'Demo rosters already exist (%d entries). Use --reset to recreate.',
      existingCount
    );
    return;
  }

  if (existingCount > 0 && RESET) {
    console.log('--reset flag detected. Cleaning up %d existing roster entries...', existingCount);

    // Get all player_ids from existing rosters to clean up auth users and profiles
    const { data: existingRosters } = await supabase
      .from('team_rosters')
      .select('player_id')
      .eq('league_id', league.id)
      .eq('season_id', season.id);

    const playerIds = existingRosters?.map((r) => r.player_id) || [];

    // Delete roster entries
    const { error: rosterDelErr } = await supabase
      .from('team_rosters')
      .delete()
      .eq('league_id', league.id)
      .eq('season_id', season.id);

    if (rosterDelErr) {
      console.error('Failed to delete existing rosters:', rosterDelErr);
      process.exit(1);
    }
    console.log('  Deleted roster entries.');

    // Delete profiles and auth users created by this script
    // Identify them by the demo email pattern
    if (playerIds.length > 0) {
      const { data: demoProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', playerIds)
        .like('email', `%@${EMAIL_DOMAIN}`);

      if (demoProfiles && demoProfiles.length > 0) {
        const demoIds = demoProfiles.map((p) => p.id);

        // Delete profiles
        const { error: profDelErr } = await supabase
          .from('profiles')
          .delete()
          .in('id', demoIds);

        if (profDelErr) {
          console.error('Failed to delete demo profiles:', profDelErr);
        } else {
          console.log('  Deleted %d demo profiles.', demoIds.length);
        }

        // Delete auth users
        let authDeleted = 0;
        for (const uid of demoIds) {
          const { error: authErr } = await supabase.auth.admin.deleteUser(uid);
          if (!authErr) authDeleted++;
        }
        console.log('  Deleted %d auth users.', authDeleted);
      }
    }

    // Also clean up any legacy_player matched_to_profile_id references
    const { error: unmatchErr } = await supabase
      .from('legacy_players')
      .update({ matched_to_profile_id: null, matched_at: null })
      .not('matched_to_profile_id', 'is', null);

    if (unmatchErr) {
      console.warn('  Warning: Could not clear legacy player matches:', unmatchErr.message);
    } else {
      console.log('  Cleared legacy player match references.');
    }

    console.log('  Cleanup complete.\n');
  }

  // Step 5: Fetch legacy players
  console.log('Fetching legacy players...');
  const { data: allLegacy, error: legacyErr } = await supabase
    .from('legacy_players')
    .select('*')
    .order('points', { ascending: false, nullsFirst: false });

  if (legacyErr) {
    console.error('Failed to fetch legacy players:', legacyErr);
    process.exit(1);
  }

  if (!allLegacy || allLegacy.length === 0) {
    console.error('No legacy players found in the database. Import legacy data first.');
    process.exit(1);
  }
  console.log('  Found %d legacy players total.', allLegacy.length);

  // Step 6: Separate goalies and skaters, then pick top players
  const goalies = allLegacy
    .filter((p) => p.is_goalie === true)
    .sort((a, b) => {
      // Sort goalies by wins DESC, then games_played DESC
      const aWins = a.wins ?? 0;
      const bWins = b.wins ?? 0;
      if (bWins !== aWins) return bWins - aWins;
      return (b.games_played ?? 0) - (a.games_played ?? 0);
    });

  const skaters = allLegacy
    .filter((p) => p.is_goalie !== true)
    .sort((a, b) => {
      // Sort skaters by points DESC
      const aPoints = a.points ?? 0;
      const bPoints = b.points ?? 0;
      return bPoints - aPoints;
    });

  const goaliesNeeded = teamCount * GOALIES_PER_TEAM;
  const skatersNeeded = teamCount * SKATERS_PER_TEAM;

  if (goalies.length < goaliesNeeded) {
    console.error(
      'Not enough goalies: need %d, found %d.',
      goaliesNeeded,
      goalies.length
    );
    process.exit(1);
  }

  if (skaters.length < skatersNeeded) {
    console.error(
      'Not enough skaters: need %d, found %d.',
      skatersNeeded,
      skaters.length
    );
    process.exit(1);
  }

  const selectedGoalies = goalies.slice(0, goaliesNeeded);
  const selectedSkaters = skaters.slice(0, skatersNeeded);

  console.log('  Selected %d goalies and %d skaters.', selectedGoalies.length, selectedSkaters.length);

  // Step 7: Snake draft to distribute players across teams
  console.log('\nDistributing players via snake draft...');
  const goalieTeams = snakeDraft(selectedGoalies, teamCount);
  const skaterTeams = snakeDraft(selectedSkaters, teamCount);

  // Step 8: Create auth users, profiles, and roster entries
  console.log('Creating auth users, profiles, and roster entries...\n');

  let totalCreated = 0;
  let totalSkipped = 0;
  let playerIndex = 0;
  const allRosterInserts = [];

  for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
    const team = teams[teamIdx];
    const teamGoalies = goalieTeams[teamIdx] || [];
    const teamSkaters = skaterTeams[teamIdx] || [];
    const teamPlayers = [...teamGoalies, ...teamSkaters];
    const usedJerseyNumbers = new Set();

    console.log('  Team: %s (%d players)', team.name, teamPlayers.length);

    let isFirstSkater = true;

    for (let i = 0; i < teamPlayers.length; i++) {
      const legacy = teamPlayers[i];
      const isGoalie = legacy.is_goalie === true;
      playerIndex++;

      const email = `legacy.${playerIndex}@${EMAIL_DOMAIN}`;
      const fullName =
        legacy.full_name || `${legacy.first_name} ${legacy.last_name}`.trim();

      // Create auth user
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          legacy_player_id: legacy.id,
        },
      });

      if (authErr) {
        console.warn('    Skipping %s: auth error: %s', fullName, authErr.message);
        totalSkipped++;
        continue;
      }

      const userId = authData.user.id;

      // Determine position and player type
      let position;
      let playerType;
      if (isGoalie) {
        position = 'Goalie';
        playerType = 'goalie';
      } else {
        // Cycle through Forward/Defense distribution
        const posIndex = i - teamGoalies.length; // index among skaters on this team
        position = SKATER_POSITIONS[posIndex % SKATER_POSITIONS.length];
        playerType = 'skater';
      }

      const jerseyNumber = generateJerseyNumber(isGoalie, usedJerseyNumbers);

      // Assign captain to the first skater (highest-pointed skater on team)
      let leadershipRole = null;
      if (!isGoalie && isFirstSkater) {
        leadershipRole = 'captain';
        isFirstSkater = false;
      }

      // Create profile
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: fullName,
        position,
        jersey_number: jerseyNumber,
        role: 'player',
        is_platform_admin: false,
      });

      if (profileErr) {
        console.warn('    Warning: profile upsert failed for %s: %s', fullName, profileErr.message);
      }

      // Update legacy_player to link to this profile
      const { error: matchErr } = await supabase
        .from('legacy_players')
        .update({
          matched_to_profile_id: userId,
          matched_at: new Date().toISOString(),
        })
        .eq('id', legacy.id);

      if (matchErr) {
        console.warn('    Warning: could not match legacy player %s: %s', legacy.id, matchErr.message);
      }

      // Prepare roster entry
      allRosterInserts.push({
        player_id: userId,
        team_id: team.id,
        season_id: season.id,
        league_id: league.id,
        status: 'active',
        player_type: playerType,
        position,
        jersey_number: jerseyNumber,
        is_goalie: isGoalie,
        leadership_role: leadershipRole,
        start_date: SEASON_START_DATE,
      });

      totalCreated++;
    }
  }

  // Step 9: Batch insert roster entries
  if (allRosterInserts.length > 0) {
    console.log('\nInserting %d roster entries...', allRosterInserts.length);

    // Insert in batches of 50 to avoid payload limits
    const BATCH_SIZE = 50;
    let insertedCount = 0;

    for (let i = 0; i < allRosterInserts.length; i += BATCH_SIZE) {
      const batch = allRosterInserts.slice(i, i + BATCH_SIZE);
      const { error: rosterErr } = await supabase.from('team_rosters').insert(batch);

      if (rosterErr) {
        console.error(
          'Failed to insert roster batch %d-%d: %s',
          i,
          i + batch.length - 1,
          rosterErr.message
        );
        // Log first failing record for debugging
        console.error('First record in batch:', JSON.stringify(batch[0], null, 2));
      } else {
        insertedCount += batch.length;
      }
    }

    console.log('  Inserted %d roster entries.', insertedCount);
  }

  // Step 10: Summary
  console.log('\n=== Demo Rosters Seeded Successfully ===');
  console.log('  League:    %s', league.id);
  console.log('  Season:    %s (%s)', season.name, season.id);
  console.log('  Teams:     %d', teamCount);
  console.log('  Created:   %d players', totalCreated);
  console.log('  Skipped:   %d players', totalSkipped);
  console.log('  Rosters:   %d entries', allRosterInserts.length);
  console.log('\n  Per team:  ~%d skaters + %d goalies', SKATERS_PER_TEAM, GOALIES_PER_TEAM);
  console.log('  Email:     legacy.{1-%d}@%s', playerIndex, EMAIL_DOMAIN);
  console.log('  Password:  %s', DEFAULT_PASSWORD);

  // Print per-team breakdown
  console.log('\n  Team Breakdown:');
  for (let teamIdx = 0; teamIdx < teamCount; teamIdx++) {
    const team = teams[teamIdx];
    const teamRosters = allRosterInserts.filter((r) => r.team_id === team.id);
    const captains = teamRosters.filter((r) => r.leadership_role === 'captain');
    const goalieCount = teamRosters.filter((r) => r.is_goalie).length;
    const skaterCount = teamRosters.length - goalieCount;

    console.log(
      '    %s: %d skaters, %d goalies%s',
      team.name.padEnd(22),
      skaterCount,
      goalieCount,
      captains.length > 0 ? ' (captain assigned)' : ''
    );
  }
}

try {
  await seedDemoRosters();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
