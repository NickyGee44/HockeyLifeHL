/**
 * Seed Demo Schedule: Full season schedule for Hockey Life HL demo league
 *
 * Generates ~112 games for the Winter 2026 season:
 *   - 8 teams, round-robin: 28 unique matchups x 4 meetings = 112 games
 *   - Game days: Tuesdays and Thursdays
 *   - Time slots: 7:00 PM, 8:15 PM, 9:30 PM, 10:45 PM Atlantic (UTC-4)
 *   - 4 games per game day (one per time slot)
 *   - 4 venues rotated across games
 *   - Weeks 1-10 (Jan 6 - Mar 12): completed with scores
 *   - Weeks 11-14 (Mar 17 - Apr 10): scheduled, no scores
 *
 * Usage:
 *   node scripts/seed-demo-schedule.mjs           # Create (skip if games exist)
 *   node scripts/seed-demo-schedule.mjs --reset    # Delete existing games and recreate
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

const DEMO_SLUG = 'demo';

// Time slots in Atlantic Standard Time (UTC-4 in winter)
const TIME_SLOTS = ['19:00', '20:15', '21:30', '22:45'];
const TZ_OFFSET = '-04:00'; // AST (Atlantic Standard Time)

// Venue names for rotation (must match what was seeded in seed-demo-league.mjs)
const VENUE_NAMES = [
  'Halifax Forum',
  'Dartmouth Sportsplex',
  'BMO Centre',
  'Cole Harbour Place',
];

// Season boundary: weeks 1-10 are completed, weeks 11-14 are scheduled
const COMPLETED_CUTOFF_DATE = new Date('2026-03-13'); // Games before this are completed

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seeded pseudo-random number generator (Mulberry32) for deterministic scores.
 * This ensures the same scores are generated on every run.
 */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260105); // Seeded with season start date

/**
 * Generate a realistic beer league score (2-7 goals).
 */
function randomScore() {
  return Math.floor(rng() * 6) + 2; // 2 to 7
}

/**
 * Generate all 28 unique matchups for 8 teams (round-robin).
 * Returns array of [homeIndex, awayIndex] pairs.
 */
function generateRoundRobinMatchups(teamCount) {
  const matchups = [];
  for (let i = 0; i < teamCount; i++) {
    for (let j = i + 1; j < teamCount; j++) {
      matchups.push([i, j]);
    }
  }
  return matchups;
}

/**
 * Expand matchups to 4 meetings each, alternating home/away for balance.
 * Returns array of { homeIdx, awayIdx } objects.
 */
function expandMatchups(matchups) {
  const expanded = [];
  for (const [a, b] of matchups) {
    // Meeting 1: a home, b away
    expanded.push({ homeIdx: a, awayIdx: b });
    // Meeting 2: b home, a away
    expanded.push({ homeIdx: b, awayIdx: a });
    // Meeting 3: a home, b away
    expanded.push({ homeIdx: a, awayIdx: b });
    // Meeting 4: b home, a away
    expanded.push({ homeIdx: b, awayIdx: a });
  }
  return expanded;
}

/**
 * Shuffle an array in-place using Fisher-Yates with seeded RNG.
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate all game days (Tuesdays and Thursdays) from Jan 6 to Apr 10, 2026.
 * Returns array of Date objects (midnight UTC for the date).
 */
function generateGameDays() {
  const days = [];
  // Start: Jan 6, 2026 (Tuesday)
  const start = new Date('2026-01-06');
  // End: Apr 10, 2026 (Thursday/Friday)
  const end = new Date('2026-04-10');

  const current = new Date(start);
  while (current <= end) {
    const dow = current.getUTCDay();
    // Tuesday = 2, Thursday = 4
    if (dow === 2 || dow === 4) {
      days.push(new Date(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

/**
 * Format a game day + time slot into ISO 8601 with Atlantic timezone.
 * @param {Date} day - The game day (UTC midnight)
 * @param {string} timeSlot - Time in HH:MM format
 * @returns {string} ISO 8601 datetime string
 */
function formatScheduledAt(day, timeSlot) {
  const yyyy = day.getUTCFullYear();
  const mm = String(day.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(day.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${timeSlot}:00${TZ_OFFSET}`;
}

/**
 * Add minutes to an ISO 8601 datetime string, returning a new ISO 8601 string.
 */
function addMinutes(isoString, minutes) {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  // Return in the same Atlantic format
  const original = isoString;
  const offsetPart = original.slice(-6); // e.g., "-04:00"
  // Calculate the local time at offset
  const utcMs = date.getTime();
  // Parse offset to minutes
  const sign = offsetPart[0] === '-' ? -1 : 1;
  const offsetH = parseInt(offsetPart.slice(1, 3), 10);
  const offsetM = parseInt(offsetPart.slice(4, 6), 10);
  const totalOffsetMs = sign * (offsetH * 60 + offsetM) * 60 * 1000;
  const localMs = utcMs + totalOffsetMs;
  const localDate = new Date(localMs);
  const yyyy = localDate.getUTCFullYear();
  const mm = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(localDate.getUTCDate()).padStart(2, '0');
  const hh = String(localDate.getUTCHours()).padStart(2, '0');
  const min = String(localDate.getUTCMinutes()).padStart(2, '0');
  const ss = String(localDate.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${offsetPart}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedDemoSchedule() {
  console.log('=== Seed Demo Schedule: Hockey Life HL ===\n');

  // Step 1: Look up the demo league
  console.log('Looking up demo league...');
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('slug', DEMO_SLUG)
    .single();

  if (leagueErr || !league) {
    console.error('Demo league not found. Run seed-demo-league.mjs first.');
    console.error('Error:', leagueErr);
    process.exit(1);
  }
  console.log('  League: %s (%s)', league.name, league.id);

  // Step 2: Look up the active season
  console.log('Looking up active season...');
  const { data: season, error: seasonErr } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('league_id', league.id)
    .eq('status', 'active')
    .single();

  if (seasonErr || !season) {
    console.error('Active season not found for demo league.');
    console.error('Error:', seasonErr);
    process.exit(1);
  }
  console.log('  Season: %s (%s)', season.name, season.id);

  // Step 3: Look up teams for this league
  console.log('Looking up teams...');
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .eq('league_id', league.id)
    .order('name');

  if (teamsErr || !teams || teams.length === 0) {
    console.error('No teams found for demo league.');
    console.error('Error:', teamsErr);
    process.exit(1);
  }

  if (teams.length !== 8) {
    console.warn('WARNING: Expected 8 teams, found %d. Schedule may not be balanced.', teams.length);
  }
  console.log('  Teams (%d):', teams.length);
  for (const t of teams) {
    console.log('    %s (%s) - %s', t.short_name, t.name, t.id);
  }

  // Step 4: Look up venues
  console.log('Looking up venues...');
  const { data: venues, error: venuesErr } = await supabase
    .from('venues')
    .select('id, name')
    .eq('league_id', league.id)
    .order('name');

  if (venuesErr || !venues || venues.length === 0) {
    console.error('No venues found for demo league.');
    console.error('Error:', venuesErr);
    process.exit(1);
  }
  console.log('  Venues (%d):', venues.length);
  for (const v of venues) {
    console.log('    %s - %s', v.name, v.id);
  }

  // Step 5: Check for existing games
  console.log('\nChecking for existing games...');
  const { count: existingCount, error: countErr } = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', season.id);

  if (countErr) {
    console.error('Failed to check existing games:', countErr);
    process.exit(1);
  }

  if (existingCount > 0 && !RESET) {
    console.log(
      'Season already has %d games. Use --reset to delete and recreate.',
      existingCount
    );
    return;
  }

  if (existingCount > 0 && RESET) {
    console.log('--reset flag detected. Deleting %d existing games...', existingCount);
    const { error: delErr } = await supabase
      .from('games')
      .delete()
      .eq('season_id', season.id);
    if (delErr) {
      console.error('Failed to delete existing games:', delErr);
      process.exit(1);
    }
    console.log('Existing games deleted.\n');
  }

  // Step 6: Generate the schedule
  console.log('Generating schedule...');

  // Build venue lookup by name
  const venueByName = {};
  for (const v of venues) {
    venueByName[v.name] = v;
  }

  // Generate matchups: 28 unique x 4 meetings = 112 games
  const roundRobinMatchups = generateRoundRobinMatchups(teams.length);
  console.log('  Unique matchups: %d', roundRobinMatchups.length);

  const allGames = expandMatchups(roundRobinMatchups);
  console.log('  Total games (4 meetings each): %d', allGames.length);

  // Shuffle to distribute matchups across the season
  shuffle(allGames);

  // Generate game days
  const gameDays = generateGameDays();
  console.log('  Game days (Tue/Thu): %d', gameDays.length);

  // We need ceil(112 / 4) = 28 game days. Verify we have enough.
  const gameDaysNeeded = Math.ceil(allGames.length / 4);
  if (gameDays.length < gameDaysNeeded) {
    console.error(
      'Not enough game days (%d) for %d games at 4 per day (need %d).',
      gameDays.length,
      allGames.length,
      gameDaysNeeded
    );
    process.exit(1);
  }
  console.log('  Game days needed: %d (available: %d)', gameDaysNeeded, gameDays.length);

  // Assign games to slots
  const gameRecords = [];
  let gameNumber = 1;
  let completedCount = 0;
  let scheduledCount = 0;

  for (let dayIdx = 0; dayIdx < gameDaysNeeded; dayIdx++) {
    const gameDay = gameDays[dayIdx];

    for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
      const gameIdx = dayIdx * 4 + slotIdx;
      if (gameIdx >= allGames.length) break;

      const matchup = allGames[gameIdx];
      const homeTeam = teams[matchup.homeIdx];
      const awayTeam = teams[matchup.awayIdx];
      const timeSlot = TIME_SLOTS[slotIdx];
      const venueName = VENUE_NAMES[slotIdx % VENUE_NAMES.length];
      const scheduledAt = formatScheduledAt(gameDay, timeSlot);

      // Determine if this game is completed (before cutoff) or scheduled
      const isCompleted = gameDay < COMPLETED_CUTOFF_DATE;

      const record = {
        season_id: season.id,
        league_id: league.id,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        scheduled_at: scheduledAt,
        location: venueName,
        game_number: gameNumber,
        game_type: 'regular',
        period_count: 3,
        period_length_minutes: 20,
        status: isCompleted ? 'completed' : 'scheduled',
      };

      if (isCompleted) {
        record.home_score = randomScore();
        record.away_score = randomScore();
        record.game_started_at = scheduledAt;
        record.game_ended_at = addMinutes(scheduledAt, 75);
        completedCount++;
      } else {
        scheduledCount++;
      }

      gameRecords.push(record);
      gameNumber++;
    }
  }

  console.log('\n  Games generated: %d', gameRecords.length);
  console.log('    Completed: %d', completedCount);
  console.log('    Scheduled: %d', scheduledCount);

  // Step 7: Insert games in batches (Supabase has row limits per insert)
  console.log('\nInserting games into database...');
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < gameRecords.length; i += BATCH_SIZE) {
    const batch = gameRecords.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await supabase.from('games').insert(batch);

    if (insertErr) {
      console.error('Failed to insert batch starting at game %d:', i + 1, insertErr);
      process.exit(1);
    }

    inserted += batch.length;
    console.log('  Inserted %d / %d games', inserted, gameRecords.length);
  }

  // Step 8: Verify home/away balance
  console.log('\nHome/Away balance check:');
  const homeCount = {};
  const awayCount = {};
  for (const t of teams) {
    homeCount[t.id] = 0;
    awayCount[t.id] = 0;
  }
  for (const g of gameRecords) {
    homeCount[g.home_team_id]++;
    awayCount[g.away_team_id]++;
  }
  for (const t of teams) {
    console.log(
      '  %s: %d home, %d away, %d total',
      t.short_name.padEnd(3),
      homeCount[t.id],
      awayCount[t.id],
      homeCount[t.id] + awayCount[t.id]
    );
  }

  // Summary
  console.log('\n=== Demo Schedule Seeded Successfully ===');
  console.log('  Total games:  %d', gameRecords.length);
  console.log('  Completed:    %d', completedCount);
  console.log('  Scheduled:    %d', scheduledCount);
  console.log('  Season:       %s (%s)', season.name, season.id);
  console.log('  Game days:    %d (Tue/Thu)', gameDaysNeeded);
  console.log('  First game:   %s', gameRecords[0]?.scheduled_at);
  console.log('  Last game:    %s', gameRecords[gameRecords.length - 1]?.scheduled_at);
}

try {
  await seedDemoSchedule();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
