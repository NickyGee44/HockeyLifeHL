require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LEAGUE_ID = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const SEASON_ID = '30ee2c0b-5981-4df4-b0cc-d7cae05b9e37';
const FREE_AGENT_TEAM_NAME = 'Winter 2026 Free Agents';

const FREE_AGENT_SKATERS = [
  'Ben Austin','Max Bowman','Caleb Cook','Cameron DeBoer','Jack Foote','Eric Gagliardi','Kyle Geraghty','Daniel Jackson','Jeremy Jennison','Randy Killburn','Steve Lobodzinski','Steve Mati','Ash Moore','Matt Morden','Aidan Murphy','Troy Murphy','Jared Myatte','Blake Neufeld','John Pilon','Torey Robinson','Kelly Schuh','Casey Simon'
];

const FREE_AGENT_GOALIES = [
  'Shawn Fucile','JC Keenleyside-Richter','Erik Leipala','Leaf Lunnen','Vince Mitalas'
];

async function ensureFreeAgentTeam() {
  const existing = await supabase
    .from('teams')
    .select('id,name,status')
    .eq('league_id', LEAGUE_ID)
    .eq('name', FREE_AGENT_TEAM_NAME)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data;

  const insert = await supabase
    .from('teams')
    .insert({
      id: randomUUID(),
      league_id: LEAGUE_ID,
      name: FREE_AGENT_TEAM_NAME,
      short_name: 'FA26',
      slug: 'winter-2026-free-agents',
      status: 'inactive',
    })
    .select('id,name,status')
    .single();

  if (insert.error) throw insert.error;
  return insert.data;
}

async function getProfileIds(names) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('full_name', names);

  if (error) throw error;
  const map = new Map((data || []).map((row) => [row.full_name, row.id]));
  const missing = names.filter((name) => !map.has(name));
  if (missing.length) throw new Error(`Missing profiles: ${missing.join(', ')}`);
  return map;
}

(async () => {
  const freeAgentTeam = await ensureFreeAgentTeam();
  const skaterProfiles = await getProfileIds(FREE_AGENT_SKATERS);
  const goalieProfiles = await getProfileIds(FREE_AGENT_GOALIES);

  // move roster rows for free-agent skaters onto inactive free-agent team
  const skaterIds = [...skaterProfiles.values()];
  const goalieIds = [...goalieProfiles.values()];
  const allIds = [...skaterIds, ...goalieIds];

  const rosterUpdate = await supabase
    .from('team_rosters')
    .update({ team_id: freeAgentTeam.id })
    .eq('league_id', LEAGUE_ID)
    .eq('season_id', SEASON_ID)
    .in('player_id', allIds);
  if (rosterUpdate.error) throw rosterUpdate.error;

  const playerStatsUpdate = await supabase
    .from('player_stats')
    .update({ team_id: freeAgentTeam.id })
    .eq('league_id', LEAGUE_ID)
    .eq('season_id', SEASON_ID)
    .in('player_id', skaterIds);
  if (playerStatsUpdate.error) throw playerStatsUpdate.error;

  const goalieStatsUpdate = await supabase
    .from('goalie_stats')
    .update({ team_id: freeAgentTeam.id })
    .eq('league_id', LEAGUE_ID)
    .eq('season_id', SEASON_ID)
    .in('player_id', goalieIds);
  if (goalieStatsUpdate.error) throw goalieStatsUpdate.error;

  const gamesUpdate = await supabase
    .from('games')
    .update({ home_team_id: freeAgentTeam.id })
    .eq('league_id', LEAGUE_ID)
    .eq('season_id', SEASON_ID)
    .in('id', [
      ...(
        (await supabase.from('player_stats').select('game_id').eq('league_id', LEAGUE_ID).eq('season_id', SEASON_ID).in('player_id', skaterIds)).data || []
      ).map(r => r.game_id),
      ...(
        (await supabase.from('goalie_stats').select('game_id').eq('league_id', LEAGUE_ID).eq('season_id', SEASON_ID).in('player_id', goalieIds)).data || []
      ).map(r => r.game_id),
    ]);
  if (gamesUpdate.error) throw gamesUpdate.error;

  const verification = {
    free_agent_team: freeAgentTeam,
    free_agent_skaters: (await supabase.from('player_stats').select('id', { count: 'exact', head: true }).eq('season_id', SEASON_ID).eq('team_id', freeAgentTeam.id)).count || 0,
    free_agent_goalies: (await supabase.from('goalie_stats').select('id', { count: 'exact', head: true }).eq('season_id', SEASON_ID).eq('team_id', freeAgentTeam.id)).count || 0,
    free_agent_rosters: (await supabase.from('team_rosters').select('id', { count: 'exact', head: true }).eq('season_id', SEASON_ID).eq('team_id', freeAgentTeam.id)).count || 0,
    active_teams_in_league: (await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('league_id', LEAGUE_ID).neq('status', 'inactive')).count || 0,
  };

  console.log(JSON.stringify({ status: 'ok', verification }, null, 2));
  process.exit(0);
})().catch((error) => {
  console.error(JSON.stringify({ status: 'error', message: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
