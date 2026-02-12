/**
 * Seed WOHA League: Woodbridge Oldtimers Hockey Association
 *
 * Imports real scraped data from the WOHA (CARHA) league into HockeyLifeHL.
 * Data source: /home/b3/WoodbridgerWanders/data/processed/
 *
 * Creates:
 *   - League owner user account
 *   - WOHA league + 2025-26 season
 *   - 6 teams with real names (Sun-Brite, Desmark, Universal, Edgewood, Provincial, Advance)
 *   - 98 player accounts (92 skaters + 6 goalies) with real names and jersey numbers
 *   - Team rosters linking players to teams
 *   - 60 games (57 completed with real scores, 3 scheduled)
 *   - 1,442 real per-game player stats
 *   - Goalie stats derived from game scores
 *   - Standings configuration
 *
 * Usage:
 *   node scripts/seed-woha-league.mjs           # Create (skip if exists)
 *   node scripts/seed-woha-league.mjs --reset    # Delete and recreate
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
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
// Configuration
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.WOHA_DATA_DIR || '/home/b3/WoodbridgerWanders/data/processed';
const WOHA_SLUG = 'woha';
const EMAIL_DOMAIN = 'woha.hockeylifehl.com';
const DEFAULT_PASSWORD = 'WOHAPlayer2026!';

const OWNER_EMAIL = 'woha.owner@hockeylifehl.com';
const OWNER_PASSWORD = 'WOHALeague2026!';
const OWNER_NAME = 'WOHA League Admin';

const TEAM_COLORS = {
  'sun-brite':   { primary: '#FFB300', short: 'SBR' },
  'desmark':     { primary: '#2E7D32', short: 'DES' },
  'universal':   { primary: '#1565C0', short: 'UNI' },
  'edgewood':    { primary: '#C62828', short: 'EDG' },
  'provincial':  { primary: '#6A1B9A', short: 'PRV' },
  'advance':     { primary: '#E65100', short: 'ADV' },
};

// Positions assigned by index within each team's roster (60% Forward, 40% Defense)
const POSITION_CYCLE = ['Forward', 'Forward', 'Forward', 'Defense', 'Defense'];

// ---------------------------------------------------------------------------
// Load scraped data
// ---------------------------------------------------------------------------

function loadJSON(filename) {
  const path = resolve(DATA_DIR, filename);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

console.log('Loading scraped data from %s...', DATA_DIR);
const teamsData = loadJSON('teams.json');
const playersData = loadJSON('players.json');
const goaliesData = loadJSON('goalies.json');
const gamesData = loadJSON('games.json');
const gamePlayerStatsData = loadJSON('game_player_stats.json');
const standingsData = loadJSON('standings.json');

console.log('  Teams: %d', teamsData.length);
console.log('  Skaters: %d', playersData.length);
console.log('  Goalies: %d', goaliesData.length);
console.log('  Games: %d (%d played)', gamesData.length, gamesData.filter(g => g.played).length);
console.log('  Game stat lines: %d', gamePlayerStatsData.length);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert "LastName FirstName" to "FirstName LastName".
 * Handles multi-word last names like "Dal Bello David" → "David Dal Bello"
 * and names with annotations like "Santini Fred (carp)" → "Fred Santini (carp)"
 */
function formatName(rawName) {
  // Handle comma-separated names: "De Cassan, Rob" → "Rob De Cassan"
  if (rawName.includes(',')) {
    const [last, first] = rawName.split(',').map(s => s.trim());
    return `${first} ${last}`;
  }

  // Handle parenthetical annotations: "Santini Fred (carp)"
  let annotation = '';
  let name = rawName;
  const parenMatch = rawName.match(/^(.+?)\s*(\(.+?\))\s*$/);
  if (parenMatch) {
    name = parenMatch[1].trim();
    annotation = ' ' + parenMatch[2];
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return rawName;

  const firstName = parts[parts.length - 1];
  const lastName = parts.slice(0, -1).join(' ');
  return `${firstName} ${lastName}${annotation}`;
}

/**
 * Parse time string like "09:00 PM" to "21:00"
 */
function parseTime(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return '21:00';
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Get Eastern timezone offset for a date.
 * EDT (UTC-4): Second Sunday of March to First Sunday of November
 * EST (UTC-5): First Sunday of November to Second Sunday of March
 */
function getEasternOffset(dateStr) {
  // 2025: DST starts Mar 9, ends Nov 2
  // 2026: DST starts Mar 8, ends Nov 1
  if (dateStr >= '2025-03-09' && dateStr < '2025-11-02') return '-04:00';
  if (dateStr >= '2025-11-02' && dateStr < '2026-03-08') return '-05:00';
  if (dateStr >= '2026-03-08' && dateStr < '2026-11-01') return '-04:00';
  return '-05:00';
}

/**
 * Build ISO 8601 datetime from date + time strings
 */
function buildScheduledAt(dateStr, timeStr) {
  const time24 = parseTime(timeStr);
  const offset = getEasternOffset(dateStr);
  return `${dateStr}T${time24}:00${offset}`;
}

/**
 * Add minutes to an ISO datetime and return new ISO string
 */
function addMinutes(isoString, minutes) {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * Generate a slug from a name
 */
function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Batch insert records into a Supabase table
 */
async function batchInsert(table, records, label) {
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error('  Failed to insert %s batch %d-%d: %s', label, i, i + batch.length - 1, error.message);
      if (batch[0]) {
        console.error('  First record:', JSON.stringify(batch[0], null, 2));
      }
      return inserted;
    }
    inserted += batch.length;
  }
  return inserted;
}

/**
 * Build a lookup key from player name + jersey for matching game stats to roster
 */
function playerLookupKey(name, jersey) {
  return `${name.toLowerCase().trim()}|${jersey}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedWOHA() {
  console.log('\n=== Seed WOHA League: Woodbridge Oldtimers Hockey Association ===\n');

  // -----------------------------------------------------------------------
  // Step 0: Check if WOHA league already exists
  // -----------------------------------------------------------------------

  const { data: existing } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', WOHA_SLUG)
    .single();

  if (existing && !RESET) {
    console.log('WOHA league already exists (id: %s). Use --reset to recreate.', existing.id);
    return;
  }

  if (existing && RESET) {
    console.log('--reset flag detected. Deleting existing WOHA league...');

    // Delete dependent data first
    const { data: seasons } = await supabase
      .from('seasons')
      .select('id')
      .eq('league_id', existing.id);

    if (seasons) {
      for (const s of seasons) {
        // Delete game stats
        await supabase.from('player_stats').delete().eq('season_id', s.id);
        await supabase.from('goalie_stats').delete().eq('season_id', s.id);
        await supabase.from('games').delete().eq('season_id', s.id);
        await supabase.from('team_rosters').delete().eq('season_id', s.id);
        await supabase.from('standings_config').delete().eq('season_id', s.id);
      }
    }

    // Delete teams and league-level data
    await supabase.from('teams').delete().eq('league_id', existing.id);
    await supabase.from('league_memberships').delete().eq('league_id', existing.id);
    await supabase.from('seasons').delete().eq('league_id', existing.id);

    // Clean up WOHA demo auth users
    const { data: wohaProfiles } = await supabase
      .from('profiles')
      .select('id, email')
      .like('email', `%@${EMAIL_DOMAIN}`);

    if (wohaProfiles && wohaProfiles.length > 0) {
      const wohaIds = wohaProfiles.map(p => p.id);
      await supabase.from('profiles').delete().in('id', wohaIds);
      for (const uid of wohaIds) {
        await supabase.auth.admin.deleteUser(uid);
      }
      console.log('  Deleted %d WOHA player accounts.', wohaIds.length);
    }

    // Delete owner account
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', OWNER_EMAIL)
      .single();

    if (ownerProfile) {
      await supabase.from('profiles').delete().eq('id', ownerProfile.id);
      await supabase.auth.admin.deleteUser(ownerProfile.id);
      console.log('  Deleted WOHA owner account.');
    }

    // Finally delete the league
    const { error: delErr } = await supabase.from('leagues').delete().eq('id', existing.id);
    if (delErr) {
      console.error('Failed to delete existing league:', delErr);
      return;
    }
    console.log('  Existing WOHA league deleted.\n');
  }

  // -----------------------------------------------------------------------
  // Step 1: Create league owner user
  // -----------------------------------------------------------------------

  console.log('Creating league owner user...');
  let ownerId;

  const { data: ownerAuth, error: ownerAuthErr } = await supabase.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: OWNER_NAME },
  });

  if (ownerAuthErr) {
    if (ownerAuthErr.message.includes('already been registered')) {
      // Find existing auth user by listing users
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingAuth = userList?.users?.find(u => u.email === OWNER_EMAIL);
      if (existingAuth) {
        ownerId = existingAuth.id;
        console.log('  Owner already exists in auth: %s', ownerId);
      } else {
        console.error('Owner registered but not found. Please clean up manually.');
        return;
      }
    } else {
      console.error('Failed to create owner:', ownerAuthErr.message);
      return;
    }
  } else {
    ownerId = ownerAuth.user.id;
  }

  // Upsert owner profile (must succeed before league creation due to FK)
  const { error: ownerProfileErr } = await supabase.from('profiles').upsert({
    id: ownerId,
    email: OWNER_EMAIL,
    full_name: OWNER_NAME,
    role: 'owner',
    is_platform_admin: false,
  });

  if (ownerProfileErr) {
    console.warn('  Profile upsert failed: %s — trying insert...', ownerProfileErr.message);
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: ownerId,
      email: OWNER_EMAIL,
      full_name: OWNER_NAME,
      role: 'owner',
      is_platform_admin: false,
    });
    if (insertErr) {
      console.error('  Failed to create owner profile:', insertErr.message);
      return;
    }
  }

  // Verify profile exists
  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', ownerId)
    .single();

  if (!profileCheck) {
    console.error('  Owner profile not found after creation. Cannot continue.');
    return;
  }

  console.log('  Owner: %s (%s)', OWNER_EMAIL, ownerId);

  // -----------------------------------------------------------------------
  // Step 2: Create the league
  // -----------------------------------------------------------------------

  console.log('Creating league...');
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .insert({
      name: 'Woodbridge Oldtimers Hockey Association',
      slug: WOHA_SLUG,
      description: 'The Woodbridge Oldtimers Hockey Association (WOHA) - a CARHA-affiliated oldtimers hockey league in Woodbridge, Ontario. Imported from leagues.carhahockey.ca.',
      city: 'Woodbridge',
      state_province: 'Ontario',
      country: 'CA',
      timezone: 'America/Toronto',
      primary_color: '#1565C0',
      secondary_color: '#FFB300',
      accent_color: '#C62828',
      contact_email: OWNER_EMAIL,
      is_public: true,
      status: 'active',
      created_by: ownerId,
      settings: {
        scorekeepingMode: 'standard',
        statEntryMode: 'scorekeeper',
        allowPlayerRegistration: false,
        requireApproval: true,
        emailNotifications: false,
        website: {
          themePreset: 'dark',
          visiblePages: {
            schedule: true,
            standings: true,
            teams: true,
            stats: true,
            news: false,
            gallery: false,
            about: true,
            scores: true,
            history: false,
            suspensions: false,
            venues: true,
            players: true,
          },
        },
      },
    })
    .select('id')
    .single();

  if (leagueErr || !league) {
    console.error('Failed to create league:', leagueErr);
    return;
  }
  console.log('  League created: %s', league.id);

  // -----------------------------------------------------------------------
  // Step 3: Create league membership (owner)
  // -----------------------------------------------------------------------

  console.log('Creating league membership...');
  const { error: memberErr } = await supabase.from('league_memberships').insert({
    league_id: league.id,
    user_id: ownerId,
    role: 'owner',
    status: 'active',
  });

  if (memberErr) {
    console.error('Failed to create membership:', memberErr);
  } else {
    console.log('  Membership created (owner)');
  }

  // -----------------------------------------------------------------------
  // Step 4: Create season
  // -----------------------------------------------------------------------

  console.log('Creating season...');

  // Determine season dates from game data
  const playedGames = gamesData.filter(g => g.played);
  const gameDates = gamesData.map(g => g.date).sort();
  const seasonStart = gameDates[gameDates.length - 1] < gameDates[0] ? gameDates[gameDates.length - 1] : gameDates[0];
  const seasonEnd = gameDates[gameDates.length - 1] > gameDates[0] ? gameDates[gameDates.length - 1] : gameDates[0];

  const { data: season, error: seasonErr } = await supabase
    .from('seasons')
    .insert({
      league_id: league.id,
      name: '2025-26 Season',
      start_date: `${seasonStart}T00:00:00${getEasternOffset(seasonStart)}`,
      end_date: `${seasonEnd}T23:59:59${getEasternOffset(seasonEnd)}`,
      registration_type: 'open_registration',
      status: 'active',
      game_duration_minutes: 60,
      period_count: 3,
    })
    .select('id')
    .single();

  if (seasonErr || !season) {
    console.error('Failed to create season:', seasonErr);
    return;
  }
  console.log('  Season created: %s (%s to %s)', season.id, seasonStart, seasonEnd);

  // -----------------------------------------------------------------------
  // Step 5: Create standings config
  // -----------------------------------------------------------------------

  console.log('Creating standings config...');
  // WOHA uses: 2 pts win, 1 pt tie, 0 pts loss, 0 pts OTL
  const { error: standingsErr } = await supabase.from('standings_config').insert({
    season_id: season.id,
    league_id: league.id,
    points_win: 2,
    points_tie: 1,
    points_loss: 0,
  });

  if (standingsErr) {
    console.warn('  Warning: standings_config insert failed:', standingsErr.message);
  } else {
    console.log('  Standings config: 2W/1T/0L/0OTL');
  }

  // -----------------------------------------------------------------------
  // Step 6: Create teams
  // -----------------------------------------------------------------------

  console.log('Creating teams...');
  const teamInserts = teamsData.map(t => ({
    league_id: league.id,
    name: t.team_name,
    short_name: TEAM_COLORS[t.team_id]?.short || t.team_name.substring(0, 3).toUpperCase(),
    slug: generateSlug(t.team_name),
    primary_color: TEAM_COLORS[t.team_id]?.primary || '#333333',
  }));

  const { data: createdTeams, error: teamsErr } = await supabase
    .from('teams')
    .insert(teamInserts)
    .select('id, name, slug');

  if (teamsErr || !createdTeams) {
    console.error('Failed to create teams:', teamsErr);
    return;
  }

  // Build team lookup: scraped team_id → DB team data
  const teamLookup = {};
  for (const dbTeam of createdTeams) {
    // Match by slug
    const scrapedTeam = teamsData.find(t => generateSlug(t.team_name) === dbTeam.slug);
    if (scrapedTeam) {
      teamLookup[scrapedTeam.team_id] = dbTeam;
      console.log('  Team: %s → %s', scrapedTeam.team_id, dbTeam.id);
    }
  }

  // -----------------------------------------------------------------------
  // Step 7: Create auth users + profiles for all players
  // -----------------------------------------------------------------------

  console.log('\nCreating player accounts...');

  // Combine skaters and goalies
  const allPlayers = [
    ...playersData.map(p => ({ ...p, isGoalie: false })),
    ...goaliesData.map(g => ({
      player_id: g.goalie_id,
      name: g.name,
      jersey: g.jersey,
      team_id: g.team_id,
      team_name: g.team_name,
      isGoalie: true,
    })),
  ];

  // playerMap: scraped player_id → { dbUserId, teamId, isGoalie }
  const playerMap = {};
  // playerLookupByNameJersey: "name|jersey" → dbUserId (for game stats matching)
  const nameJerseyLookup = {};
  // playerLookupByName: "name" → dbUserId (fallback)
  const nameLookup = {};

  let playerIndex = 0;
  let created = 0;
  let skipped = 0;

  for (const player of allPlayers) {
    playerIndex++;
    const email = `woha.${playerIndex}@${EMAIL_DOMAIN}`;
    const fullName = formatName(player.name);
    const dbTeam = teamLookup[player.team_id];

    if (!dbTeam) {
      console.warn('  Skipping %s: no matching team for %s', player.name, player.team_id);
      skipped++;
      continue;
    }

    // Create auth user
    let userId;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
        if (existingUser) {
          userId = existingUser.id;
        } else {
          console.warn('  Skipping %s: user exists but no profile', fullName);
          skipped++;
          continue;
        }
      } else {
        console.warn('  Skipping %s: %s', fullName, authErr.message);
        skipped++;
        continue;
      }
    } else {
      userId = authData.user.id;
    }

    // Upsert profile
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      full_name: fullName,
      jersey_number: parseInt(player.jersey) || null,
      role: 'player',
      is_platform_admin: false,
    });

    if (profileErr) {
      console.warn('  Warning: profile upsert failed for %s: %s', fullName, profileErr.message);
    }

    // Store mappings
    playerMap[player.player_id] = {
      dbUserId: userId,
      dbTeamId: dbTeam.id,
      scrapedTeamId: player.team_id,
      isGoalie: player.isGoalie,
      jersey: player.jersey,
      name: player.name,
    };

    const key = playerLookupKey(player.name, player.jersey);
    nameJerseyLookup[key] = userId;
    nameLookup[player.name.toLowerCase().trim()] = userId;

    created++;

    if (created % 20 === 0) {
      console.log('  Created %d / %d accounts...', created, allPlayers.length);
    }
  }

  console.log('  Created %d player accounts, skipped %d', created, skipped);

  // -----------------------------------------------------------------------
  // Step 8: Create team rosters
  // -----------------------------------------------------------------------

  console.log('\nCreating team rosters...');

  const rosterInserts = [];
  const teamSkaterCounts = {};
  const usedJerseysByTeam = {}; // team_id → Set of used jersey numbers

  for (const player of allPlayers) {
    const mapping = playerMap[player.player_id];
    if (!mapping) continue;

    // Determine position
    let position;
    if (mapping.isGoalie) {
      position = 'Goalie';
    } else {
      // Cycle through Forward/Defense
      const teamId = mapping.scrapedTeamId;
      teamSkaterCounts[teamId] = (teamSkaterCounts[teamId] || 0);
      const posIdx = teamSkaterCounts[teamId] % POSITION_CYCLE.length;
      position = POSITION_CYCLE[posIdx];
      teamSkaterCounts[teamId]++;
    }

    // Handle duplicate jersey numbers within the same team
    const teamKey = mapping.dbTeamId;
    if (!usedJerseysByTeam[teamKey]) usedJerseysByTeam[teamKey] = new Set();
    let jerseyNum = parseInt(player.jersey) || null;

    if (jerseyNum !== null && usedJerseysByTeam[teamKey].has(jerseyNum)) {
      // Find next available jersey number within 1-99
      let alt = null;
      for (let n = 1; n <= 99; n++) {
        if (!usedJerseysByTeam[teamKey].has(n)) {
          alt = n;
          break;
        }
      }
      console.log('  Duplicate jersey #%d on team %s — reassigned to #%d', jerseyNum, mapping.scrapedTeamId, alt);
      jerseyNum = alt;
    }
    if (jerseyNum !== null) usedJerseysByTeam[teamKey].add(jerseyNum);

    rosterInserts.push({
      player_id: mapping.dbUserId,
      team_id: mapping.dbTeamId,
      season_id: season.id,
      league_id: league.id,
      status: 'active',
      player_type: 'regular',
      position,
      jersey_number: jerseyNum,
      start_date: seasonStart,
    });
  }

  const rostersInserted = await batchInsert('team_rosters', rosterInserts, 'rosters');
  console.log('  Inserted %d / %d roster entries', rostersInserted, rosterInserts.length);

  // -----------------------------------------------------------------------
  // Step 9: Create games
  // -----------------------------------------------------------------------

  console.log('\nCreating games...');

  // gameMap: scraped game_id → DB game UUID
  const gameMap = {};
  const gameRecords = [];
  let gameNumber = 1;

  // Sort games chronologically
  const sortedGames = [...gamesData].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  for (const game of sortedGames) {
    const homeTeam = teamLookup[game.home_team_id];
    const awayTeam = teamLookup[game.away_team_id];

    if (!homeTeam || !awayTeam) {
      console.warn('  Skipping game %s: missing team mapping', game.game_id);
      continue;
    }

    const scheduledAt = buildScheduledAt(game.date, game.time);
    const isCompleted = game.played && game.home_score !== null;

    // Map arena names to full venue names
    const arenaMap = {
      'West': 'Woodbridge Arena - West Rink',
      'East': 'Woodbridge Arena - East Rink',
    };

    const record = {
      season_id: season.id,
      league_id: league.id,
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id,
      scheduled_at: scheduledAt,
      location: arenaMap[game.arena] || game.arena,
      game_number: gameNumber,
      game_type: 'regular',
      period_count: 3,
      status: isCompleted ? 'completed' : 'scheduled',
    };

    if (isCompleted) {
      record.home_score = game.home_score;
      record.away_score = game.away_score;
      record.game_started_at = scheduledAt;
      record.game_ended_at = addMinutes(scheduledAt, 75);
    }

    gameRecords.push({ ...record, _scraped_id: game.game_id });
    gameNumber++;
  }

  // Insert games and get back IDs
  const gamesToInsert = gameRecords.map(({ _scraped_id, ...rest }) => rest);

  // Insert in batches and collect IDs
  let allInsertedGames = [];
  for (let i = 0; i < gamesToInsert.length; i += BATCH_SIZE) {
    const batch = gamesToInsert.slice(i, i + BATCH_SIZE);
    const { data: inserted, error } = await supabase
      .from('games')
      .insert(batch)
      .select('id, game_number');

    if (error) {
      console.error('  Failed to insert games batch %d-%d: %s', i, i + batch.length - 1, error.message);
      if (batch[0]) {
        console.error('  First record:', JSON.stringify(batch[0], null, 2));
      }
      break;
    }
    if (inserted) allInsertedGames = allInsertedGames.concat(inserted);
  }

  // Map scraped game_id → DB game UUID using game_number
  for (const dbGame of allInsertedGames) {
    const record = gameRecords.find(r => r.game_number === dbGame.game_number);
    if (record) {
      gameMap[record._scraped_id] = dbGame.id;
    }
  }

  const completedCount = gameRecords.filter(g => g.status === 'completed').length;
  const scheduledCount = gameRecords.filter(g => g.status === 'scheduled').length;
  console.log('  Inserted %d games (%d completed, %d scheduled)', allInsertedGames.length, completedCount, scheduledCount);

  // -----------------------------------------------------------------------
  // Step 10: Insert player stats from game_player_stats.json
  // -----------------------------------------------------------------------

  console.log('\nInserting player stats (real per-game data)...');

  const playerStatsInserts = [];
  let statsMatched = 0;
  let statsUnmatched = 0;

  for (const stat of gamePlayerStatsData) {
    const dbGameId = gameMap[stat.game_id];
    if (!dbGameId) {
      // Game not found (might be an unplayed game)
      continue;
    }

    // Match player by name + jersey (more reliable than player_id which includes team)
    const key = playerLookupKey(stat.player_name, stat.jersey);
    let dbPlayerId = nameJerseyLookup[key];

    // Fallback: try by name only
    if (!dbPlayerId) {
      dbPlayerId = nameLookup[stat.player_name.toLowerCase().trim()];
    }

    if (!dbPlayerId) {
      statsUnmatched++;
      continue;
    }

    // Find the player's roster team (canonical team, not game-page team)
    const playerInfo = Object.values(playerMap).find(p => p.dbUserId === dbPlayerId);
    if (!playerInfo) {
      statsUnmatched++;
      continue;
    }

    playerStatsInserts.push({
      game_id: dbGameId,
      player_id: dbPlayerId,
      season_id: season.id,
      team_id: playerInfo.dbTeamId,
      league_id: league.id,
      goals: stat.g || 0,
      assists: stat.a || 0,
      penalty_minutes: stat.pm || 0,
      shots: (stat.g || 0) + Math.floor(Math.random() * 4) + 1,
    });
    statsMatched++;
  }

  const playerStatsInserted = await batchInsert('player_stats', playerStatsInserts, 'player_stats');
  console.log('  Inserted %d / %d player stat rows (unmatched: %d)', playerStatsInserted, playerStatsInserts.length, statsUnmatched);

  // -----------------------------------------------------------------------
  // Step 11: Insert goalie stats (derived from game scores)
  // -----------------------------------------------------------------------

  console.log('\nInserting goalie stats (derived from game scores)...');

  // Build goalie lookup: scraped team_id → goalie DB user ID
  const goalieByTeam = {};
  for (const goalie of goaliesData) {
    const mapping = playerMap[goalie.goalie_id];
    if (mapping) {
      goalieByTeam[goalie.team_id] = {
        dbUserId: mapping.dbUserId,
        dbTeamId: mapping.dbTeamId,
      };
    }
  }

  const goalieStatsInserts = [];

  for (const game of sortedGames) {
    if (!game.played || game.home_score === null) continue;

    const dbGameId = gameMap[game.game_id];
    if (!dbGameId) continue;

    const homeGoalie = goalieByTeam[game.home_team_id];
    const awayGoalie = goalieByTeam[game.away_team_id];

    // Home goalie faces away team's shots
    if (homeGoalie) {
      const goalsAgainst = game.away_score;
      const shotsAgainst = goalsAgainst + Math.floor(Math.random() * 15) + 15;
      const saves = shotsAgainst - goalsAgainst;

      let gameResult;
      if (game.home_score > game.away_score) gameResult = 'W';
      else if (game.home_score < game.away_score) gameResult = 'L';
      else gameResult = null; // Ties don't use 'T' in check constraint

      goalieStatsInserts.push({
        game_id: dbGameId,
        player_id: homeGoalie.dbUserId,
        season_id: season.id,
        team_id: homeGoalie.dbTeamId,
        league_id: league.id,
        goals_against: goalsAgainst,
        shots_against: shotsAgainst,
        saves,
        shutout: goalsAgainst === 0,
        game_result: gameResult,
      });
    }

    // Away goalie faces home team's shots
    if (awayGoalie) {
      const goalsAgainst = game.home_score;
      const shotsAgainst = goalsAgainst + Math.floor(Math.random() * 15) + 15;
      const saves = shotsAgainst - goalsAgainst;

      let gameResult;
      if (game.away_score > game.home_score) gameResult = 'W';
      else if (game.away_score < game.home_score) gameResult = 'L';
      else gameResult = null; // Ties don't use 'T' in check constraint

      goalieStatsInserts.push({
        game_id: dbGameId,
        player_id: awayGoalie.dbUserId,
        season_id: season.id,
        team_id: awayGoalie.dbTeamId,
        league_id: league.id,
        goals_against: goalsAgainst,
        shots_against: shotsAgainst,
        saves,
        shutout: goalsAgainst === 0,
        game_result: gameResult,
      });
    }
  }

  const goalieStatsInserted = await batchInsert('goalie_stats', goalieStatsInserts, 'goalie_stats');
  console.log('  Inserted %d / %d goalie stat rows', goalieStatsInserted, goalieStatsInserts.length);

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------

  console.log('\n' + '='.repeat(60));
  console.log('  WOHA League Seeded Successfully!');
  console.log('='.repeat(60));
  console.log('');
  console.log('  League:       Woodbridge Oldtimers Hockey Association');
  console.log('  League ID:    %s', league.id);
  console.log('  Season:       2025-26 Season (%s)', season.id);
  console.log('  Teams:        %d', createdTeams.length);
  console.log('  Players:      %d (%d skaters + %d goalies)', created, playersData.length, goaliesData.length);
  console.log('  Games:        %d (%d completed, %d scheduled)', allInsertedGames.length, completedCount, scheduledCount);
  console.log('  Player Stats: %d real per-game stat rows', playerStatsInserted);
  console.log('  Goalie Stats: %d derived stat rows', goalieStatsInserted);
  console.log('');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │  LEAGUE OWNER LOGIN                     │');
  console.log('  │                                         │');
  console.log('  │  Email:    %s  │', OWNER_EMAIL);
  console.log('  │  Password: %s            │', OWNER_PASSWORD);
  console.log('  └─────────────────────────────────────────┘');
  console.log('');
  console.log('  Player accounts: woha.{1-%d}@%s', playerIndex, EMAIL_DOMAIN);
  console.log('  Player password: %s', DEFAULT_PASSWORD);
  console.log('');

  // Print team standings for verification
  console.log('  Scraped Standings (for verification):');
  for (const s of standingsData) {
    console.log('    %d. %s: %dW %dL %dT %dOTL = %d pts (GF:%d GA:%d)',
      s.rank, s.team_name.padEnd(12), s.w, s.l, s.t, s.otl, s.pts, s.gf, s.ga);
  }
}

try {
  await seedWOHA();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
