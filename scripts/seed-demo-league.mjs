/**
 * Seed Demo League: Hockey Life HL
 *
 * Creates the demo league with season, 8 teams, and 4 venues.
 * Uses Supabase service role client to bypass RLS.
 *
 * Usage:
 *   node scripts/seed-demo-league.mjs           # Create (skip if exists)
 *   node scripts/seed-demo-league.mjs --reset    # Delete and recreate
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
// Data definitions
// ---------------------------------------------------------------------------

const leagueData = {
  name: 'Hockey Life HL',
  slug: 'demo',
  description:
    'The original Hockey Life HL - over a decade of beer league hockey in Halifax. This demo showcases all platform features with real legacy player data.',
  city: 'Halifax',
  state_province: 'Nova Scotia',
  country: 'CA',
  timezone: 'America/Halifax',
  primary_color: '#E31837',
  secondary_color: '#0066CC',
  accent_color: '#FFD700',
  contact_email: 'demo@beerleaguehockey.ca',
  is_public: true,
  status: 'active',
  settings: {
    scorekeepingMode: 'standard',
    statEntryMode: 'scorekeeper',
    allowPlayerRegistration: true,
    requireApproval: false,
    emailNotifications: false,
    website: {
      themePreset: 'dark',
      visiblePages: {
        schedule: true,
        standings: true,
        teams: true,
        stats: true,
        news: true,
        gallery: false,
        about: true,
        scores: true,
        history: true,
        suspensions: true,
        venues: true,
        players: true,
      },
    },
  },
};

const seasonData = {
  name: 'Winter 2026',
  start_date: '2026-01-05T00:00:00-04:00',
  end_date: '2026-04-13T23:59:59-03:00',
  registration_type: 'open_registration',
  status: 'active',
  game_duration_minutes: 60,
  period_count: 3,
};

const teams = [
  { name: 'Mooseheads', short_name: 'MOO', primary_color: '#1B5E20' },
  { name: 'Harbour Wolves', short_name: 'WLV', primary_color: '#37474F' },
  { name: 'Citadel Knights', short_name: 'KNT', primary_color: '#1A237E' },
  { name: 'North End Bruins', short_name: 'BRU', primary_color: '#F57F17' },
  { name: 'Dartmouth Destroyers', short_name: 'DES', primary_color: '#B71C1C' },
  { name: 'Bedford Blizzard', short_name: 'BLZ', primary_color: '#0097A7' },
  { name: 'Sackville Storm', short_name: 'STM', primary_color: '#4A148C' },
  { name: 'Cole Harbour Comets', short_name: 'CMT', primary_color: '#E65100' },
];

const venues = [
  {
    name: 'Halifax Forum',
    address: '2901 Windsor St',
    city: 'Halifax',
    state_province: 'Nova Scotia',
    country: 'CA',
    postal_code: 'B3K 5E5',
    number_of_rinks: 2,
  },
  {
    name: 'Dartmouth Sportsplex',
    address: '110 Wyse Rd',
    city: 'Dartmouth',
    state_province: 'Nova Scotia',
    country: 'CA',
    postal_code: 'B3A 1M1',
    number_of_rinks: 2,
  },
  {
    name: 'BMO Centre',
    address: '61 Gary Martin Dr',
    city: 'Bedford',
    state_province: 'Nova Scotia',
    country: 'CA',
    postal_code: 'B4A 0G8',
    number_of_rinks: 2,
  },
  {
    name: 'Cole Harbour Place',
    address: '51 Forest Hills Pkwy',
    city: 'Cole Harbour',
    state_province: 'Nova Scotia',
    country: 'CA',
    postal_code: 'B2V 1A6',
    number_of_rinks: 1,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function findAdminUser() {
  // Try to find a platform admin first
  const { data: admin } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('is_platform_admin', true)
    .limit(1)
    .single();

  if (admin) return admin;

  // Fall back to first user in profiles
  const { data: firstUser } = await supabase
    .from('profiles')
    .select('id, email')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return firstUser;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedDemoLeague() {
  console.log('=== Seed Demo League: Hockey Life HL ===\n');

  // Step 0: Check if demo league already exists
  const { data: existing } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', 'demo')
    .single();

  if (existing && !RESET) {
    console.log('Demo league already exists (id: %s). Use --reset to recreate.', existing.id);
    return;
  }

  if (existing && RESET) {
    console.log('--reset flag detected. Deleting existing demo league...');
    const { error: delErr } = await supabase.from('leagues').delete().eq('id', existing.id);
    if (delErr) {
      console.error('Failed to delete existing league:', delErr);
      return;
    }
    console.log('Existing demo league deleted.\n');
  }

  // Step 1: Find an admin user to own the league
  const adminUser = await findAdminUser();
  if (!adminUser) {
    console.error('No users found in profiles table. Create a user first.');
    return;
  }
  console.log('Using admin user: %s (%s)\n', adminUser.email, adminUser.id);

  // Step 2: Create the league
  console.log('Creating league...');
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .insert({
      ...leagueData,
      created_by: adminUser.id,
    })
    .select('id')
    .single();

  if (leagueErr || !league) {
    console.error('Failed to create league:', leagueErr);
    return;
  }
  console.log('  League created: %s', league.id);

  // Step 3: Create league membership (owner)
  console.log('Creating league membership...');
  const { error: memberErr } = await supabase.from('league_memberships').insert({
    league_id: league.id,
    user_id: adminUser.id,
    role: 'owner',
    status: 'active',
  });

  if (memberErr) {
    console.error('Failed to create membership:', memberErr);
    // Continue anyway - league is already created
  } else {
    console.log('  Membership created (owner)');
  }

  // Step 4: Create season
  console.log('Creating season...');
  const { data: season, error: seasonErr } = await supabase
    .from('seasons')
    .insert({
      league_id: league.id,
      ...seasonData,
    })
    .select('id')
    .single();

  if (seasonErr || !season) {
    console.error('Failed to create season:', seasonErr);
    return;
  }
  console.log('  Season created: %s', season.id);

  // Step 5: Create teams
  console.log('Creating teams...');
  const teamsToInsert = teams.map((t) => ({
    league_id: league.id,
    name: t.name,
    short_name: t.short_name,
    slug: generateSlug(t.name),
    primary_color: t.primary_color,
  }));

  const { data: createdTeams, error: teamsErr } = await supabase
    .from('teams')
    .insert(teamsToInsert)
    .select('id, name');

  if (teamsErr || !createdTeams) {
    console.error('Failed to create teams:', teamsErr);
    return;
  }

  const teamIds = createdTeams.map((t) => t.id);
  for (const t of createdTeams) {
    console.log('  Team created: %s (%s)', t.name, t.id);
  }

  // Step 6: Link teams to season via season_teams
  console.log('Linking teams to season...');
  const seasonTeamInserts = teamIds.map((teamId) => ({
    season_id: season.id,
    team_id: teamId,
  }));

  const { error: stErr } = await supabase.from('season_teams').insert(seasonTeamInserts);

  if (stErr) {
    console.error('Failed to link teams to season:', stErr);
    // Continue anyway
  } else {
    console.log('  Linked %d teams to season', teamIds.length);
  }

  // Step 7: Create venues
  console.log('Creating venues...');
  const venuesToInsert = venues.map((v) => ({
    league_id: league.id,
    ...v,
  }));

  const { data: createdVenues, error: venuesErr } = await supabase
    .from('venues')
    .insert(venuesToInsert)
    .select('id, name');

  if (venuesErr || !createdVenues) {
    console.error('Failed to create venues:', venuesErr);
    // Continue anyway
  } else {
    const venueIds = createdVenues.map((v) => v.id);
    for (const v of createdVenues) {
      console.log('  Venue created: %s (%s)', v.name, v.id);
    }

    // Print summary
    console.log('\n=== Demo League Seeded Successfully ===');
    console.log('  league_id:  %s', league.id);
    console.log('  season_id:  %s', season.id);
    console.log('  team_ids:   %s', JSON.stringify(teamIds));
    console.log('  venue_ids:  %s', JSON.stringify(venueIds));
    return;
  }

  // Summary (if venues failed)
  console.log('\n=== Demo League Seeded (venues may have errors) ===');
  console.log('  league_id:  %s', league.id);
  console.log('  season_id:  %s', season.id);
  console.log('  team_ids:   %s', JSON.stringify(teamIds));
}

try {
  await seedDemoLeague();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
