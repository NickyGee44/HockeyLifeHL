require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LEAGUE_ID = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';

// ────────────────────────────────────────────────────────────────────────────
// SOURCE DATA — 2026 Winter Thursdays (seasonid=82)
// ────────────────────────────────────────────────────────────────────────────

const TEAM_ABBR = {
  FGL: 'First General London',
  FRF: 'FitzRays Flyers',
  FRP: 'FitzRays Premier',
  LEM: 'London Eco Metal',
};

// Goalies: { last, first, gp, ga, wins, losses, ties, shutouts, team_abbr (null = free agent) }
const GOALIE_DATA = [
  { last: 'Bolman',               first: 'Cody',  gp: 8,  ga: 37, wins: 4, losses: 4, ties: 0, shutouts: 0, team: 'FRP' },
  { last: 'Buehler',              first: 'Aaron', gp: 11, ga: 43, wins: 5, losses: 5, ties: 1, shutouts: 0, team: 'LEM' },
  { last: 'Fucile',               first: 'Shawn', gp: 1,  ga: 8,  wins: 0, losses: 1, ties: 0, shutouts: 0, team: null },
  { last: 'Geraghty',             first: 'Connor',gp: 7,  ga: 36, wins: 3, losses: 3, ties: 1, shutouts: 0, team: 'FRF' },
  { last: 'Keenleyside-Richter',  first: 'JC',    gp: 1,  ga: 2,  wins: 0, losses: 1, ties: 0, shutouts: 0, team: null },
  { last: 'Leipala',              first: 'Erik',  gp: 4,  ga: 18, wins: 2, losses: 2, ties: 0, shutouts: 0, team: null },
  { last: 'Lunnen',               first: 'Leaf',  gp: 1,  ga: 3,  wins: 0, losses: 0, ties: 1, shutouts: 0, team: null },
  { last: 'Mitalas',              first: 'Vince', gp: 1,  ga: 1,  wins: 1, losses: 0, ties: 0, shutouts: 0, team: null },
  { last: 'Wild',                 first: 'Steven',gp: 10, ga: 33, wins: 5, losses: 4, ties: 1, shutouts: 0, team: 'FGL' },
];

// Players: { last, first, gp, goals, assists, wins, ties, team_abbr }
const PLAYER_DATA = [
  { last: 'Almond',       first: 'Steve',     gp: 10, goals: 2,  assists: 5,  wins: 5, ties: 1, team: 'FRF' },
  { last: 'Bedard',       first: 'Mitch',     gp: 10, goals: 7,  assists: 4,  wins: 6, ties: 1, team: 'FGL' },
  { last: 'Bettridge',    first: 'Craig',     gp: 11, goals: 4,  assists: 9,  wins: 5, ties: 1, team: 'FRF' },
  { last: 'Bloxam',       first: 'Jim',       gp: 11, goals: 0,  assists: 1,  wins: 5, ties: 1, team: 'FRF' },
  { last: 'Brougham',     first: 'Jonathan',  gp: 9,  goals: 10, assists: 3,  wins: 3, ties: 1, team: 'FRF' },
  { last: 'Bulda',        first: 'Lyndon',    gp: 11, goals: 8,  assists: 14, wins: 5, ties: 1, team: 'LEM' },
  { last: 'Carducci',     first: 'Vince',     gp: 8,  goals: 0,  assists: 6,  wins: 3, ties: 1, team: 'FRP' },
  { last: 'Carruthers',   first: 'Andre',     gp: 6,  goals: 0,  assists: 0,  wins: 3, ties: 0, team: 'FGL' },
  { last: 'Cervoni',      first: 'Cris',      gp: 8,  goals: 5,  assists: 11, wins: 4, ties: 1, team: 'FGL' },
  { last: 'Drew',         first: 'Terry',     gp: 9,  goals: 1,  assists: 6,  wins: 4, ties: 1, team: 'FRF' },
  { last: 'Gibson',       first: 'Paul',      gp: 10, goals: 6,  assists: 7,  wins: 4, ties: 1, team: 'LEM' },
  { last: 'Grossi',       first: 'Matt',      gp: 10, goals: 12, assists: 7,  wins: 5, ties: 1, team: 'FRF' },
  { last: 'Haight',       first: 'Sam',       gp: 9,  goals: 8,  assists: 7,  wins: 4, ties: 1, team: 'FRF' },
  { last: 'Hanke',        first: 'Marty',     gp: 10, goals: 4,  assists: 7,  wins: 4, ties: 1, team: 'FRP' },
  { last: 'Hartley',      first: 'Eric',      gp: 8,  goals: 2,  assists: 4,  wins: 3, ties: 1, team: 'FRP' },
  { last: 'Hartley',      first: 'Adrian',    gp: 8,  goals: 5,  assists: 5,  wins: 2, ties: 1, team: 'FRP' },
  { last: 'Hatfield',     first: 'Cooper',    gp: 11, goals: 1,  assists: 5,  wins: 4, ties: 1, team: 'FRP' },
  { last: 'Hatfield',     first: 'Tristan',   gp: 11, goals: 14, assists: 5,  wins: 4, ties: 1, team: 'FRP' },
  { last: 'Ismaili',      first: 'Dhurim',    gp: 7,  goals: 2,  assists: 1,  wins: 2, ties: 1, team: 'FRP' },
  { last: 'Klimowicz',    first: 'Marek',     gp: 10, goals: 0,  assists: 10, wins: 4, ties: 1, team: 'FRP' },
  { last: 'Klimowicz',    first: 'Adam',      gp: 11, goals: 9,  assists: 14, wins: 6, ties: 1, team: 'FGL' },
  { last: 'Kowlessar',    first: 'Stefan',    gp: 11, goals: 2,  assists: 7,  wins: 5, ties: 1, team: 'LEM' },
  { last: 'Kwasek',       first: 'Adrian',    gp: 11, goals: 1,  assists: 8,  wins: 4, ties: 1, team: 'FRP' },
  { last: 'Lobodzinski',  first: 'Jeff',      gp: 11, goals: 6,  assists: 8,  wins: 6, ties: 1, team: 'FGL' },
  { last: 'Macgillavray', first: 'Dan',       gp: 9,  goals: 12, assists: 4,  wins: 4, ties: 0, team: 'FRP' },
  { last: 'Mcinerney',    first: 'Garrett',   gp: 11, goals: 8,  assists: 6,  wins: 5, ties: 1, team: 'LEM' },
  { last: 'Miskus',       first: 'David',     gp: 10, goals: 11, assists: 11, wins: 6, ties: 1, team: 'FGL' },
  { last: 'Morston',      first: 'Eric',      gp: 10, goals: 11, assists: 6,  wins: 5, ties: 1, team: 'LEM' },
  { last: 'Nott',         first: 'Cory',      gp: 11, goals: 0,  assists: 1,  wins: 6, ties: 1, team: 'FGL' },
  { last: 'Paterson',     first: 'Trevor',    gp: 9,  goals: 1,  assists: 4,  wins: 5, ties: 1, team: 'LEM' },
  { last: 'Patterson',    first: 'Daryl',     gp: 9,  goals: 0,  assists: 4,  wins: 4, ties: 0, team: 'FRF' },
  { last: 'Raphael',      first: 'Adam',      gp: 2,  goals: 1,  assists: 1,  wins: 1, ties: 0, team: 'FRF' },
  { last: 'Reginier',     first: 'Hayden',    gp: 9,  goals: 0,  assists: 4,  wins: 5, ties: 1, team: 'LEM' },
  { last: 'Sawchuk',      first: 'Andrew',    gp: 9,  goals: 1,  assists: 3,  wins: 5, ties: 1, team: 'FGL' },
  { last: 'Sheppard',     first: 'Cameron',   gp: 11, goals: 2,  assists: 7,  wins: 6, ties: 1, team: 'FGL' },
  { last: 'Teale',        first: 'Sonny',     gp: 11, goals: 1,  assists: 8,  wins: 5, ties: 1, team: 'FRF' },
  { last: 'Teasdale',     first: 'Sean',      gp: 9,  goals: 0,  assists: 1,  wins: 5, ties: 1, team: 'LEM' },
  { last: 'Wallace',      first: 'Cameron',   gp: 11, goals: 6,  assists: 9,  wins: 5, ties: 1, team: 'LEM' },
  { last: 'Watson',       first: 'David',     gp: 10, goals: 0,  assists: 5,  wins: 5, ties: 1, team: 'FGL' },
  { last: 'Zaplatar',     first: 'Nathan',    gp: 5,  goals: 0,  assists: 1,  wins: 3, ties: 0, team: 'LEM' },
  // Free agents
  { last: 'Austin',       first: 'Ben',       gp: 1,  goals: 0,  assists: 0,  wins: 0, ties: 0, team: null },
  { last: 'Bowman',       first: 'Max',       gp: 2,  goals: 0,  assists: 0,  wins: 1, ties: 0, team: null },
  { last: 'Cook',         first: 'Caleb',     gp: 3,  goals: 1,  assists: 3,  wins: 2, ties: 0, team: null },
  { last: 'DeBoer',       first: 'Cameron',   gp: 3,  goals: 1,  assists: 1,  wins: 0, ties: 0, team: null },
  { last: 'Foote',        first: 'Jack',      gp: 1,  goals: 2,  assists: 2,  wins: 1, ties: 0, team: null },
  { last: 'Gagliardi',    first: 'Eric',      gp: 2,  goals: 0,  assists: 1,  wins: 1, ties: 0, team: null },
  { last: 'Geraghty',     first: 'Kyle',      gp: 4,  goals: 0,  assists: 2,  wins: 1, ties: 0, team: null },
  { last: 'Jackson',      first: 'Daniel',    gp: 1,  goals: 0,  assists: 0,  wins: 0, ties: 0, team: null },
  { last: 'Jennison',     first: 'Jeremy',    gp: 5,  goals: 1,  assists: 2,  wins: 1, ties: 1, team: null },
  { last: 'Killburn',     first: 'Randy',     gp: 2,  goals: 0,  assists: 2,  wins: 2, ties: 0, team: null },
  { last: 'Lobodzinski',  first: 'Steve',     gp: 1,  goals: 0,  assists: 1,  wins: 1, ties: 0, team: null },
  { last: 'Mati',         first: 'Steve',     gp: 2,  goals: 0,  assists: 3,  wins: 0, ties: 0, team: null },
  { last: 'Moore',        first: 'Ash',       gp: 4,  goals: 6,  assists: 5,  wins: 4, ties: 0, team: null },
  { last: 'Morden',       first: 'Matt',      gp: 2,  goals: 0,  assists: 0,  wins: 2, ties: 0, team: null },
  { last: 'Murphy',       first: 'Aidan',     gp: 4,  goals: 4,  assists: 3,  wins: 2, ties: 1, team: null },
  { last: 'Murphy',       first: 'Troy',      gp: 2,  goals: 0,  assists: 0,  wins: 0, ties: 0, team: null },
  { last: 'Myatte',       first: 'Jared',     gp: 1,  goals: 0,  assists: 0,  wins: 0, ties: 1, team: null },
  { last: 'Neufeld',      first: 'Blake',     gp: 1,  goals: 0,  assists: 0,  wins: 0, ties: 0, team: null },
  { last: 'Pilon',        first: 'John',      gp: 2,  goals: 0,  assists: 1,  wins: 0, ties: 1, team: null },
  { last: 'Robinson',     first: 'Torey',     gp: 3,  goals: 1,  assists: 2,  wins: 2, ties: 0, team: null },
  { last: 'Schuh',        first: 'Kelly',     gp: 4,  goals: 4,  assists: 2,  wins: 2, ties: 0, team: null },
  { last: 'Simon',        first: 'Casey',     gp: 2,  goals: 0,  assists: 1,  wins: 1, ties: 0, team: null },
];

// IDs of the 18 historical junk teams to mark inactive (NOT the 4 real, NOT the 2 baseline)
const JUNK_TEAM_IDS = [
  'cc380b93-a0e7-4636-8c4c-7a5f3feeb1b5', // White
  '934160b1-1b6a-490b-b46e-1db8c05fefb4', // Green
  '226adb94-47c2-4e59-b29d-69c30d11e5fd', // Blue
  '65f6979a-cc2d-49a1-a8e9-14de60c3bb33', // Orange
  'ab2f47a5-3e7a-4bae-8fd2-c27e05c69aaf', // Whites
  'b1cb32d5-c9fe-45eb-9e8c-1ada0ae57b3f', // Darks
  'dd1d391a-e04b-4e2c-97f6-8a9a9e55ab5c', // AB Transport
  'dd0193e1-a127-4a97-bf63-ff4a80e9e1e9', // Precision Auto Works
  '92d81fb9-b1cf-4b32-9a08-42b4c5ac6e00', // Fitz Rays
  '02a06732-6a52-40d9-bc21-1b6e7b208fe9', // CB Teez
  'a757aac9-7cdc-4527-94c3-ec3dcf5a4df6', // Yellow
  'fa5e5c6d-7d7a-4e9e-8e36-57a9ed3e2e43', // Red
  '2d7f68c4-fb8d-4f05-8ad9-d0f0eca15399', // CBTeez.com
  'b2c4f5c6-2a3e-4b3e-8a9c-7d3a5e1b9f6d', // Sponsor 1
  'e3d59360-9f3a-4b3e-9a0c-3d7e6a4b2f9c', // Sponsor 2
  '62761930-3a7b-4a1d-8b3c-5a6e2f3b9c7d', // Pizza Hut
];

async function chunkInsert(table, rows, chunkSize = 400) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
}

function isoAt(minuteOffset) {
  return new Date(new Date('2026-01-08T19:00:00Z').getTime() + minuteOffset * 60000).toISOString();
}

(async () => {
  const log = {};

  // ── 1. LOAD REAL TEAM IDs ──────────────────────────────────────────────
  const { data: liveTeams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name, status')
    .eq('league_id', LEAGUE_ID)
    .in('name', ['First General London', 'FitzRays Flyers', 'FitzRays Premier', 'London Eco Metal']);
  if (teamsErr || !liveTeams?.length) throw teamsErr || new Error('Could not load real teams');

  const teamIdByName = new Map(liveTeams.map((t) => [t.name, t.id]));
  const teamIdByAbbr = new Map([
    ['FGL', teamIdByName.get('First General London')],
    ['FRF', teamIdByName.get('FitzRays Flyers')],
    ['FRP', teamIdByName.get('FitzRays Premier')],
    ['LEM', teamIdByName.get('London Eco Metal')],
  ]);

  // ── 2. DEACTIVATE JUNK TEAMS ──────────────────────────────────────────
  // Load full IDs from DB (we only have prefixes in our snapshot — query by name to be safe)
  const { data: junkTeams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', LEAGUE_ID)
    .not('name', 'in', `(${['First General London','FitzRays Flyers','FitzRays Premier','London Eco Metal','Historical Baseline Home','Historical Baseline Away'].map(n => `"${n}"`).join(',')})`);

  if (junkTeams?.length) {
    const { error: deactivateErr } = await supabase
      .from('teams')
      .update({ status: 'inactive' })
      .in('id', junkTeams.map((t) => t.id));
    if (deactivateErr) throw deactivateErr;
    log.deactivated_teams = junkTeams.map((t) => t.name);
  }

  // ── 3. CREATE 2026 WINTER SEASON ─────────────────────────────────────
  const existingSeason = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', LEAGUE_ID)
    .eq('name', '2026 Winter Thursdays')
    .maybeSingle();

  let seasonId;
  if (existingSeason.data?.id) {
    seasonId = existingSeason.data.id;
    log.season = 'existing';
  } else {
    const { data: newSeason, error: seasonErr } = await supabase
      .from('seasons')
      .insert({
        id: randomUUID(),
        league_id: LEAGUE_ID,
        name: '2026 Winter Thursdays',
        status: 'completed',
        start_date: '2026-01-08',
        end_date: '2026-03-20',
        registration_type: 'captain_invite_only',
      })
      .select('id')
      .single();
    if (seasonErr) throw seasonErr;
    seasonId = newSeason.id;
    log.season = 'created';
  }
  log.season_id = seasonId;

  // ── 4. RESOLVE PROFILES (name-match against profiles table) ──────────
  const allNames = [
    ...GOALIE_DATA.map((g) => `${g.first} ${g.last}`),
    ...PLAYER_DATA.map((p) => `${p.first} ${p.last}`),
  ];

  // Fetch existing profiles from legacy_players first (high quality matches)
  const { data: legacyMatches } = await supabase
    .from('legacy_players')
    .select('id, full_name, matched_to_profile_id')
    .not('matched_to_profile_id', 'is', null);

  const profileIdByName = new Map();
  const legacyByName = new Map((legacyMatches || []).map((lp) => [lp.full_name.trim().toLowerCase(), lp.matched_to_profile_id]));

  // Also fetch from profiles table for fallback
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email');

  const profilesByName = new Map();
  for (const p of allProfiles || []) {
    if (!p.full_name) continue;
    const key = p.full_name.trim().toLowerCase();
    if (!profilesByName.has(key)) profilesByName.set(key, []);
    profilesByName.get(key).push(p);
  }

  for (const name of allNames) {
    const key = name.trim().toLowerCase();
    // Try legacy match first
    if (legacyByName.has(key)) {
      profileIdByName.set(key, legacyByName.get(key));
      continue;
    }
    // Fallback: unique profiles match
    const candidates = profilesByName.get(key) || [];
    if (candidates.length === 1) {
      profileIdByName.set(key, candidates[0].id);
    } else if (candidates.length > 1) {
      // prefer non-demo profiles
      const real = candidates.filter((c) => c.email && !c.email.includes('demo.hockeylifehl.com'));
      if (real.length === 1) profileIdByName.set(key, real[0].id);
      else profileIdByName.set(key, candidates[0].id); // take first
    }
    // If no match, create a profile stub below
  }

  // Create stubs for unmatched players
  const newProfiles = [];
  for (const name of allNames) {
    const key = name.trim().toLowerCase();
    if (!profileIdByName.has(key)) {
      const id = randomUUID();
      const parts = name.trim().split(' ');
      const email = `legacy.w26.${parts.join('.').toLowerCase().replace(/[^a-z0-9.]/g, '')}@demo.hockeylifehl.com`;
      newProfiles.push({ id, full_name: name.trim(), email });
      profileIdByName.set(key, id);
    }
  }
  if (newProfiles.length > 0) {
    const { error: profileInsertErr } = await supabase.from('profiles').insert(newProfiles);
    if (profileInsertErr) throw new Error('profile stubs: ' + profileInsertErr.message);
    log.profiles_created = newProfiles.map((p) => p.full_name);
  }

  // ── 5. CLEAR EXISTING WINTER DATA (idempotency) ───────────────────────
  for (const table of ['player_stats', 'goalie_stats', 'team_rosters', 'games']) {
    const { error } = await supabase.from(table).delete().eq('season_id', seasonId);
    if (error) throw new Error(`clear ${table}: ${error.message}`);
  }

  // ── 6. CREATE SYNTHETIC GAMES (1 per player/goalie) ──────────────────
  const allEntries = [...GOALIE_DATA, ...PLAYER_DATA];
  const games = allEntries.map((entry, idx) => {
    const teamAbbr = entry.team;
    const homeTeamId = teamAbbr ? teamIdByAbbr.get(teamAbbr) : liveTeams[0].id;
    // Away = different team or same (doesn't matter for aggregate stat season)
    const awayTeamId = liveTeams.find((t) => t.id !== homeTeamId)?.id || liveTeams[0].id;
    return {
      id: randomUUID(),
      league_id: LEAGUE_ID,
      season_id: seasonId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      scheduled_at: isoAt(idx),
      status: 'completed',
      home_score: 0,
      away_score: 0,
    };
  });

  await chunkInsert('games', games);
  log.games_created = games.length;

  // ── 7. ROSTERS ────────────────────────────────────────────────────────
  // Unique per (player, team) in this season
  const rosterMap = new Map(); // `${playerId}:${teamId}` -> true
  const rosters = [];
  for (const entry of allEntries) {
    const fullName = `${entry.first} ${entry.last}`.trim();
    const profileId = profileIdByName.get(fullName.toLowerCase());
    const teamId = entry.team ? teamIdByAbbr.get(entry.team) : liveTeams[0].id;
    if (!profileId || !teamId) continue;
    const key = `${profileId}:${teamId}`;
    if (rosterMap.has(key)) continue;
    rosterMap.set(key, true);
    rosters.push({ id: randomUUID(), league_id: LEAGUE_ID, season_id: seasonId, team_id: teamId, player_id: profileId, status: 'active' });
  }

  await chunkInsert('team_rosters', rosters);
  log.rosters_created = rosters.length;

  // ── 8. PLAYER STATS ──────────────────────────────────────────────────
  const playerStats = PLAYER_DATA.map((p, idx) => {
    const gameIdx = GOALIE_DATA.length + idx;
    const fullName = `${p.first} ${p.last}`.trim();
    const profileId = profileIdByName.get(fullName.toLowerCase());
    const teamId = p.team ? teamIdByAbbr.get(p.team) : liveTeams[0].id;
    return {
      id: randomUUID(),
      game_id: games[gameIdx].id,
      player_id: profileId,
      team_id: teamId,
      season_id: seasonId,
      league_id: LEAGUE_ID,
      goals: p.goals,
      assists: p.assists,
      penalty_minutes: 0,
      shots: 0,
      plus_minus: 0,
      power_play_goals: 0,
      power_play_assists: 0,
      short_handed_goals: 0,
      short_handed_assists: 0,
      game_winning_goals: 0,
      empty_net_goals: 0,
    };
  });
  await chunkInsert('player_stats', playerStats);
  log.player_stats_created = playerStats.length;

  // ── 9. GOALIE STATS ──────────────────────────────────────────────────
  const goalieStats = GOALIE_DATA.map((g, idx) => {
    const fullName = `${g.first} ${g.last}`.trim();
    const profileId = profileIdByName.get(fullName.toLowerCase());
    const teamId = g.team ? teamIdByAbbr.get(g.team) : liveTeams[0].id;
    return {
      id: randomUUID(),
      game_id: games[idx].id,
      player_id: profileId,
      team_id: teamId,
      season_id: seasonId,
      league_id: LEAGUE_ID,
      goals_against: g.ga,
      saves: Math.round(g.ga / (1 - (g.wins / Math.max(g.gp, 1))) * g.wins) || g.gp * 25 - g.ga,
      shots_against: g.gp * 25,
      shutout: g.shutouts > 0,
      game_result: g.wins > g.losses ? 'W' : g.losses > g.wins ? 'L' : null,
    };
  });
  await chunkInsert('goalie_stats', goalieStats);
  log.goalie_stats_created = goalieStats.length;

  // ── 10. FINAL COUNT VERIFICATION ─────────────────────────────────────
  const [gC, rC, psC, gsC] = await Promise.all([
    supabase.from('games').select('id', { count: 'exact', head: true }).eq('season_id', seasonId),
    supabase.from('team_rosters').select('id', { count: 'exact', head: true }).eq('season_id', seasonId),
    supabase.from('player_stats').select('id', { count: 'exact', head: true }).eq('season_id', seasonId),
    supabase.from('goalie_stats').select('id', { count: 'exact', head: true }).eq('season_id', seasonId),
  ]);

  log.verified = { games: gC.count, rosters: rC.count, player_stats: psC.count, goalie_stats: gsC.count };

  // ── 11. ACTIVE TEAM COUNT AFTER CLEANUP ──────────────────────────────
  const { count: activeTeams } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('league_id', LEAGUE_ID).neq('status', 'inactive');
  log.active_teams_after_cleanup = activeTeams;

  console.log(JSON.stringify({ status: 'ok', season_id: seasonId, log }, null, 2));
  process.exit(0);
})().catch((err) => {
  console.error(JSON.stringify({ status: 'error', message: err.message, stack: err.stack }, null, 2));
  process.exit(1);
});
