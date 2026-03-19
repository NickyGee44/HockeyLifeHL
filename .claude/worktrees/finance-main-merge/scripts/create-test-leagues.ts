/**
 * Test Data Generation Script
 *
 * Creates multiple test leagues with different branding and configurations
 * for testing the multi-instance architecture.
 *
 * Usage:
 *   npm run test:data:create  - Create test leagues
 *   npm run test:data:reset   - Delete test leagues
 *
 * Author: Agent 4 - Testing & Integration Specialist
 * Date: January 26, 2026
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Test league configurations
const TEST_LEAGUES = [
  {
    name: 'Test League Alpha',
    slug: 'alpha',
    subdomain: 'alpha',
    description: 'Alpha test league for multi-instance testing',
    tagline: 'Where Champions Are Made',
    primary_color: '#FF0000',
    secondary_color: '#0000FF',
    accent_color: '#00FF00',
    logo_url: '/test-logos/alpha-logo.png',
    banner_url: '/test-banners/alpha-banner.jpg',
    font_family: 'Inter, system-ui, sans-serif',
    city: 'Toronto',
    province: 'Ontario',
    country: 'Canada',
    timezone: 'America/Toronto',
    is_public: true,
    status: 'active',
  },
  {
    name: 'Test League Beta',
    slug: 'beta',
    subdomain: 'beta',
    description: 'Beta test league for multi-instance testing',
    tagline: 'Play Hard, Have Fun',
    primary_color: '#800080',
    secondary_color: '#FFA500',
    accent_color: '#FF69B4',
    logo_url: '/test-logos/beta-logo.png',
    banner_url: '/test-banners/beta-banner.jpg',
    font_family: 'Roboto, sans-serif',
    city: 'Vancouver',
    province: 'British Columbia',
    country: 'Canada',
    timezone: 'America/Vancouver',
    is_public: true,
    status: 'active',
  },
  {
    name: 'Test League Gamma',
    slug: 'gamma',
    custom_domain: 'gamma.local',
    custom_domain_verified: true,
    description: 'Gamma test league with custom domain',
    tagline: 'Excellence in Every Game',
    primary_color: '#008080',
    secondary_color: '#FFD700',
    accent_color: '#DC143C',
    logo_url: '/test-logos/gamma-logo.png',
    banner_url: '/test-banners/gamma-banner.jpg',
    font_family: 'Open Sans, sans-serif',
    city: 'Montreal',
    province: 'Quebec',
    country: 'Canada',
    timezone: 'America/Montreal',
    is_public: true,
    status: 'active',
  },
];

// Test user configurations
const TEST_USERS = [
  {
    email: 'admin@alpha.test',
    password: 'TestPassword123!',
    full_name: 'Alpha Admin',
    role: 'owner',
    league_slug: 'alpha',
  },
  {
    email: 'scorekeeper@alpha.test',
    password: 'TestPassword123!',
    full_name: 'Alpha Scorekeeper',
    role: 'scorekeeper',
    league_slug: 'alpha',
  },
  {
    email: 'player@alpha.test',
    password: 'TestPassword123!',
    full_name: 'Alpha Player',
    role: 'player',
    league_slug: 'alpha',
  },
  {
    email: 'admin@beta.test',
    password: 'TestPassword123!',
    full_name: 'Beta Admin',
    role: 'owner',
    league_slug: 'beta',
  },
  {
    email: 'scorekeeper@beta.test',
    password: 'TestPassword123!',
    full_name: 'Beta Scorekeeper',
    role: 'scorekeeper',
    league_slug: 'beta',
  },
  {
    email: 'player@beta.test',
    password: 'TestPassword123!',
    full_name: 'Beta Player',
    role: 'player',
    league_slug: 'beta',
  },
  {
    email: 'admin@gamma.test',
    password: 'TestPassword123!',
    full_name: 'Gamma Admin',
    role: 'owner',
    league_slug: 'gamma',
  },
];

/**
 * Create test leagues with sample data
 */
async function createTestLeagues() {
  console.log('🏒 Creating test leagues for multi-instance testing...\n');

  const createdLeagues: { [key: string]: any } = {};

  for (const leagueConfig of TEST_LEAGUES) {
    console.log(`📋 Creating league: ${leagueConfig.name}`);

    try {
      // Check if league already exists
      const { data: existingLeague } = await supabase
        .from('leagues')
        .select('id, name')
        .eq('slug', leagueConfig.slug)
        .single();

      if (existingLeague) {
        console.log(`   ⚠️  League already exists: ${existingLeague.name} (${existingLeague.id})`);
        createdLeagues[leagueConfig.slug] = existingLeague;
        continue;
      }

      // Create league
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .insert(leagueConfig)
        .select()
        .single();

      if (leagueError) {
        console.error(`   ❌ Failed to create league: ${leagueError.message}`);
        continue;
      }

      console.log(`   ✓ Created league: ${league.name} (${league.id})`);
      createdLeagues[leagueConfig.slug] = league;

      // Create 2 teams for this league
      const teams = [
        {
          league_id: league.id,
          name: `${leagueConfig.name} Team Red`,
          slug: `${leagueConfig.slug}-team-red`,
          primary_color: leagueConfig.primary_color,
          secondary_color: '#FFFFFF',
          logo_url: `/test-logos/${leagueConfig.slug}-red.png`,
          status: 'active',
        },
        {
          league_id: league.id,
          name: `${leagueConfig.name} Team Blue`,
          slug: `${leagueConfig.slug}-team-blue`,
          primary_color: leagueConfig.secondary_color,
          secondary_color: '#FFFFFF',
          logo_url: `/test-logos/${leagueConfig.slug}-blue.png`,
          status: 'active',
        },
      ];

      const { data: createdTeams, error: teamsError } = await supabase
        .from('teams')
        .insert(teams)
        .select();

      if (teamsError) {
        console.error(`   ❌ Failed to create teams: ${teamsError.message}`);
        continue;
      }

      console.log(`   ✓ Created ${createdTeams.length} teams`);

      // Create a season for this league
      const season = {
        league_id: league.id,
        name: '2025-2026 Season',
        slug: '2025-2026',
        start_date: new Date('2025-09-01').toISOString(),
        end_date: new Date('2026-04-30').toISOString(),
        status: 'active',
        is_current: true,
      };

      const { data: createdSeason, error: seasonError } = await supabase
        .from('seasons')
        .insert(season)
        .select()
        .single();

      if (seasonError) {
        console.error(`   ❌ Failed to create season: ${seasonError.message}`);
      } else {
        console.log(`   ✓ Created season: ${createdSeason.name}`);
      }

      // Create a division
      const division = {
        league_id: league.id,
        season_id: createdSeason?.id,
        name: 'Division A',
        slug: 'division-a',
        max_teams: 10,
        description: 'Primary division for test league',
      };

      const { data: createdDivision, error: divisionError } = await supabase
        .from('divisions')
        .insert(division)
        .select()
        .single();

      if (divisionError) {
        console.error(`   ❌ Failed to create division: ${divisionError.message}`);
      } else {
        console.log(`   ✓ Created division: ${createdDivision.name}`);
      }

      // Create a venue
      const venue = {
        league_id: league.id,
        name: `${leagueConfig.name} Arena`,
        slug: `${leagueConfig.slug}-arena`,
        address: '123 Hockey Lane',
        city: leagueConfig.city,
        province: leagueConfig.province,
        postal_code: 'A1A 1A1',
        country: leagueConfig.country,
        rink_count: 2,
      };

      const { data: createdVenue, error: venueError } = await supabase
        .from('venues')
        .insert(venue)
        .select()
        .single();

      if (venueError) {
        console.error(`   ❌ Failed to create venue: ${venueError.message}`);
      } else {
        console.log(`   ✓ Created venue: ${createdVenue.name}`);
      }

      // Create a sample game
      if (createdTeams.length >= 2 && createdSeason && createdVenue) {
        const game = {
          league_id: league.id,
          season_id: createdSeason.id,
          home_team_id: createdTeams[0].id,
          away_team_id: createdTeams[1].id,
          venue_id: createdVenue.id,
          scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          status: 'scheduled',
          game_type: 'regular',
        };

        const { data: createdGame, error: gameError } = await supabase
          .from('games')
          .insert(game)
          .select()
          .single();

        if (gameError) {
          console.error(`   ❌ Failed to create game: ${gameError.message}`);
        } else {
          console.log(`   ✓ Created sample game: ${createdTeams[0].name} vs ${createdTeams[1].name}`);
        }
      }

      console.log(`   ✅ League "${league.name}" setup complete\n`);
    } catch (error: any) {
      console.error(`   ❌ Error creating league: ${error.message}\n`);
    }
  }

  console.log('✅ Test league creation complete!\n');
  console.log('📊 Summary:');
  console.log(`   - Leagues created: ${Object.keys(createdLeagues).length}`);
  console.log(`   - Alpha: http://alpha.beerleaguehockey.local:3000/`);
  console.log(`   - Beta: http://beta.beerleaguehockey.local:3000/`);
  console.log(`   - Gamma: http://gamma.local:3000/`);
  console.log('\n💡 Don\'t forget to add these to your hosts file:');
  console.log('   127.0.0.1 alpha.beerleaguehockey.local');
  console.log('   127.0.0.1 beta.beerleaguehockey.local');
  console.log('   127.0.0.1 gamma.local');
  console.log('\n📖 See docs/testing/MULTI_INSTANCE_TEST_SUITE.md for testing instructions');

  return createdLeagues;
}

/**
 * Create test users and assign them to leagues
 */
async function createTestUsers(leagues: { [key: string]: any }) {
  console.log('\n👥 Creating test users...\n');

  for (const userConfig of TEST_USERS) {
    console.log(`📧 Creating user: ${userConfig.email}`);

    try {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', userConfig.email)
        .single();

      if (existingProfile) {
        console.log(`   ⚠️  User already exists: ${existingProfile.email}`);
        continue;
      }

      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userConfig.email,
        password: userConfig.password,
        email_confirm: true,
        user_metadata: {
          full_name: userConfig.full_name,
        },
      });

      if (authError) {
        console.error(`   ❌ Failed to create auth user: ${authError.message}`);
        continue;
      }

      console.log(`   ✓ Created auth user: ${authUser.user.id}`);

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: userConfig.email,
          full_name: userConfig.full_name,
        })
        .select()
        .single();

      if (profileError) {
        console.error(`   ❌ Failed to create profile: ${profileError.message}`);
        continue;
      }

      console.log(`   ✓ Created profile: ${profile.full_name}`);

      // Get league
      const league = leagues[userConfig.league_slug];
      if (!league) {
        console.error(`   ❌ League not found: ${userConfig.league_slug}`);
        continue;
      }

      // Create league membership
      const { error: membershipError } = await supabase
        .from('league_memberships')
        .insert({
          league_id: league.id,
          user_id: profile.id,
          role: userConfig.role,
          status: 'active',
        });

      if (membershipError) {
        console.error(`   ❌ Failed to create membership: ${membershipError.message}`);
        continue;
      }

      console.log(`   ✓ Added to league: ${league.name} as ${userConfig.role}`);

      // If scorekeeper, add to league_scorekeepers table
      if (userConfig.role === 'scorekeeper') {
        const { error: scorekeeperError } = await supabase
          .from('league_scorekeepers')
          .insert({
            league_id: league.id,
            scorekeeper_id: profile.id,
            hourly_rate: 30.00,
            status: 'active',
            can_edit_games: true,
            can_verify_games: false,
          });

        if (scorekeeperError) {
          console.error(`   ❌ Failed to add scorekeeper: ${scorekeeperError.message}`);
        } else {
          console.log(`   ✓ Added to league_scorekeepers with $30/hr rate`);
        }
      }

      console.log(`   ✅ User "${userConfig.full_name}" setup complete\n`);
    } catch (error: any) {
      console.error(`   ❌ Error creating user: ${error.message}\n`);
    }
  }

  console.log('✅ Test user creation complete!\n');
  console.log('🔐 Test User Credentials:');
  for (const user of TEST_USERS) {
    console.log(`   ${user.email} / ${user.password} (${user.role})`);
  }
}

/**
 * Reset test data (delete test leagues and users)
 */
async function resetTestData() {
  console.log('🗑️  Resetting test data...\n');

  // Confirm with user
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<void>((resolve) => {
    readline.question('⚠️  This will DELETE all test leagues and users. Continue? (yes/no): ', async (answer: string) => {
      readline.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Reset cancelled');
        resolve();
        return;
      }

      try {
        console.log('\n🗑️  Deleting test leagues...');

        // Delete test leagues (cascade will handle related data)
        const { error: leagueError } = await supabase
          .from('leagues')
          .delete()
          .in('slug', ['alpha', 'beta', 'gamma']);

        if (leagueError) {
          console.error(`❌ Failed to delete leagues: ${leagueError.message}`);
        } else {
          console.log('✓ Deleted test leagues (cascade deleted teams, games, etc.)');
        }

        // Delete test user profiles
        console.log('\n🗑️  Deleting test user profiles...');

        const testEmails = TEST_USERS.map(u => u.email);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .in('email', testEmails);

        if (profiles && profiles.length > 0) {
          for (const profile of profiles) {
            // Delete auth user (this will cascade to profile via trigger)
            const { error: authError } = await supabase.auth.admin.deleteUser(profile.id);

            if (authError) {
              console.error(`❌ Failed to delete auth user ${profile.id}: ${authError.message}`);
            } else {
              console.log(`✓ Deleted user: ${profile.id}`);
            }
          }
        }

        console.log('\n✅ Test data reset complete!');
      } catch (error: any) {
        console.error(`❌ Error resetting test data: ${error.message}`);
      }

      resolve();
    });
  });
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log('Usage:');
    console.log('  npm run test:data:create  - Create test leagues and users');
    console.log('  npm run test:data:reset   - Delete test leagues and users');
    process.exit(1);
  }

  if (command === 'create') {
    const leagues = await createTestLeagues();
    await createTestUsers(leagues);
  } else if (command === 'reset') {
    await resetTestData();
  } else {
    console.error(`Unknown command: ${command}`);
    console.log('Valid commands: create, reset');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
