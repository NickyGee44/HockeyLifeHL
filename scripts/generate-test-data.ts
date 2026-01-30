/**
 * Generate Test Data for Specific League
 *
 * Generates test players, teams, games, and stats for a league
 * Can be run from platform domain without league context
 *
 * Usage:
 *   npm run generate:testdata -- <leagueId>
 *
 * Example:
 *   npm run generate:testdata -- 123e4567-e89b-12d3-a456-426614174000
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Get league ID from command line args
const leagueId = process.argv[2];

if (!leagueId) {
  console.error('❌ Please provide a league ID');
  console.log('\nUsage: npm run generate:testdata -- <leagueId>');
  console.log('\nTo find your league ID:');
  console.log('  1. Go to Supabase Dashboard → SQL Editor');
  console.log('  2. Run: SELECT id, name, slug FROM leagues;');
  console.log('  3. Copy the ID of the league you want to generate data for\n');
  process.exit(1);
}

async function generateTestData() {
  console.log(`\n🏒 Generating test data for league: ${leagueId}\n`);

  try {
    // Verify league exists
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, slug')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      console.error('❌ League not found');
      process.exit(1);
    }

    console.log(`✓ Found league: ${league.name} (${league.slug})\n`);

    // Create a test season
    console.log('Creating test season...');
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .insert({
        league_id: leagueId,
        name: 'Test Season 2026',
        status: 'active',
        start_date: '2026-01-01',
        end_date: '2026-06-01',
      })
      .select()
      .single();

    if (seasonError) throw seasonError;
    console.log(`✓ Created season: ${season.name}\n`);

    // Create test teams
    console.log('Creating test teams...');
    const teams = [];
    const teamNames = ['Ice Hawks', 'Thunder Pucks', 'Lightning Skates', 'Blizzard Blades'];

    for (const teamName of teamNames) {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          league_id: leagueId,
          name: teamName,
          short_name: teamName.split(' ')[0],
          primary_color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          secondary_color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        })
        .select()
        .single();

      if (teamError) throw teamError;
      teams.push(team);
      console.log(`  ✓ ${teamName}`);
    }
    console.log();

    // Create test players
    console.log('Creating test players...');
    const players = [];
    const firstNames = ['John', 'Mike', 'Steve', 'Dave', 'Tom', 'Chris', 'Matt', 'Dan'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson'];

    for (let i = 0; i < 16; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@test.com`;

      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      if (authError) {
        console.log(`  ⚠️  Skipping ${email} (may already exist)`);
        continue;
      }

      players.push(authUser.user);

      // Add to team roster
      const teamIndex = Math.floor(i / 4); // 4 players per team
      await supabase.from('team_rosters').insert({
        team_id: teams[teamIndex].id,
        player_id: authUser.user.id,
        season_id: season.id,
        league_id: leagueId,
        status: 'active',
      });

      console.log(`  ✓ ${firstName} ${lastName} → ${teams[teamIndex].name}`);
    }
    console.log();

    // Create test games
    console.log('Creating test games...');
    const startDate = new Date('2026-02-01');

    for (let i = 0; i < 6; i++) {
      const gameDate = new Date(startDate);
      gameDate.setDate(gameDate.getDate() + i * 7);

      const homeTeam = teams[i % teams.length];
      const awayTeam = teams[(i + 1) % teams.length];

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          league_id: leagueId,
          season_id: season.id,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          scheduled_at: gameDate.toISOString(),
          status: i < 2 ? 'completed' : 'scheduled',
          home_score: i < 2 ? Math.floor(Math.random() * 6) : null,
          away_score: i < 2 ? Math.floor(Math.random() * 6) : null,
          location: 'Test Arena',
        })
        .select()
        .single();

      if (gameError) throw gameError;
      console.log(`  ✓ ${homeTeam.name} vs ${awayTeam.name} (${gameDate.toDateString()})`);
    }

    console.log('\n✅ Test data generated successfully!\n');
    console.log('Next steps:');
    console.log(`  1. Visit https://${league.slug}.beerleaguehockey.ca`);
    console.log('  2. Log in with any test player (password: TestPassword123!)');
    console.log('  3. Explore the league dashboard with test data\n');

  } catch (error) {
    console.error('\n❌ Error generating test data:', error);
    process.exit(1);
  }
}

generateTestData();
