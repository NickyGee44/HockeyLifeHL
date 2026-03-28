require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const leagueId = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const requestId = 'dc0d9ce4-82ef-40e2-8390-1f66293d7033';
const bucket = 'league-migration-assets';
const legacySeasonName = 'Historical Career Baseline (Pre-BLH)';

function parseSqlDumpInserts(content, tableName) {
  const rows = [];
  const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`INSERT\\s+INTO\\s+(?:[\\w".\`\\[\\]]+\\.)?[\\s"'\`\\[\\]]*${escapedTable}[\\s"'\`\\]]*\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?)\\s*;`, 'gi');
  let m;
  while ((m = re.exec(content)) !== null) {
    const columns = m[1].split(',').map((c) => c.replace(/[`"\[\]\s]/g, '').trim()).filter(Boolean);
    const tuples = [];
    let depth = 0, cur = '', inString = false, stringChar = '';
    for (let i = 0; i < m[2].length; i++) {
      const ch = m[2][i];
      if (inString) {
        cur += ch;
        if (ch === stringChar) {
          if (i + 1 < m[2].length && m[2][i + 1] === stringChar) cur += m[2][++i];
          else inString = false;
        } else if (ch === '\\' && i + 1 < m[2].length) cur += m[2][++i];
        continue;
      }
      if (ch === "'" || ch === '"') { inString = true; stringChar = ch; cur += ch; continue; }
      if (ch === '(') { depth++; if (depth === 1) { cur = ''; continue; } }
      if (ch === ')') { depth--; if (depth === 0) { tuples.push(cur); cur = ''; continue; } }
      if (depth > 0) cur += ch;
    }
    for (const tuple of tuples) {
      const vals = [];
      let c = '', qs = false;
      for (let i = 0; i < tuple.length; i++) {
        const ch = tuple[i];
        if (qs) {
          if (ch === "'") {
            if (i + 1 < tuple.length && tuple[i + 1] === "'") { c += "'"; i++; }
            else qs = false;
          } else if (ch === '\\' && i + 1 < tuple.length) c += tuple[++i];
          else c += ch;
          continue;
        }
        if (ch === "'") { qs = true; continue; }
        if (ch === ',') { vals.push(c.trim().toUpperCase() === 'NULL' ? '' : c.trim()); c = ''; continue; }
        c += ch;
      }
      vals.push(c.trim().toUpperCase() === 'NULL' ? '' : c.trim());
      if (vals.length !== columns.length) continue;
      const row = {};
      columns.forEach((col, i) => row[col] = vals[i]);
      rows.push(row);
    }
  }
  return rows;
}

async function downloadAsset(path) {
  const { data, error } = await db.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`download failed: ${path} ${error?.message || ''}`);
  return data.text();
}

(async () => {
  const before = {};
  for (const table of ['team_rosters','player_stats','goalie_stats','games','seasons']) {
    const q = db.from(table).select('*',{count:'exact',head:true});
    const scoped = table === 'seasons' ? q.eq('league_id', leagueId) : q.eq('league_id', leagueId);
    const { count } = await scoped;
    before[table] = count;
  }

  const { data: req, error: reqErr } = await db.from('league_migration_requests').select('uploaded_assets').eq('id',requestId).single();
  if (reqErr) throw reqErr;
  const assets = req.uploaded_assets || [];
  const assetByName = new Map(assets.map(a => [a.name, a]));
  const [teamsSql, playersSql, pointsSql] = await Promise.all([
    downloadAsset(assetByName.get('HL_teams.sql').path),
    downloadAsset(assetByName.get('HL_players.sql').path),
    downloadAsset(assetByName.get('HL_points.sql').path),
  ]);
  const teamRows = parseSqlDumpInserts(teamsSql, 'HL_teams');
  const playerRows = parseSqlDumpInserts(playersSql, 'HL_players');
  const pointRows = parseSqlDumpInserts(pointsSql, 'HL_points');

  const teamNameByLegacyId = new Map(teamRows.map(r => [String(r.HLteamID), String(r.teamName || '').trim()]));
  const playerNameByLegacyId = new Map(playerRows.map(r => [String(r.HLplayerID), `${String(r.firstName || '').trim()} ${String(r.lastName || '').trim()}`.trim()]));

  const { data: teams } = await db.from('teams').select('id,name').eq('league_id', leagueId);
  const teamIdByName = new Map((teams || []).map(t => [t.name.toLowerCase(), t.id]));

  const activeSeason = (await db.from('seasons').select('id,name,status').eq('league_id',leagueId).eq('status','active').maybeSingle()).data;
  if (!activeSeason?.id) throw new Error('No active season');

  // Build player/team aggregates from HL_points for roster linkage + historical totals
  const playerAgg = new Map();
  const rosterChoice = new Map();
  for (const row of pointRows) {
    const legacyPlayerId = String(row.HLplayerID || '');
    const fullName = playerNameByLegacyId.get(legacyPlayerId);
    if (!fullName) continue;
    const legacyTeamId = String(row.HLteamID || '');
    const teamName = teamNameByLegacyId.get(legacyTeamId) || null;
    const gamesPlayed = Number(row.gamesPlayed || 0) || 0;
    const goals = Number(row.goals || 0) || 0;
    const assists = Number(row.assists || 0) || 0;
    const wins = Number(row.wins || 0) || 0;
    const ties = Number(row.ties || 0) || 0;
    const saves = Number(row.saves || 0) || 0;
    const goalsAgainst = Number(row.goalsAgainst || 0) || 0;
    const shutouts = Number(row.shutouts || 0) || 0;
    const isGoalie = String(row.goalie || '0') === '1';
    const key = fullName.toLowerCase();
    const agg = playerAgg.get(key) || { fullName, goals:0, assists:0, gamesPlayed:0, wins:0, ties:0, saves:0, goalsAgainst:0, shutouts:0, isGoalie:false, teamName:null };
    agg.goals += goals;
    agg.assists += assists;
    agg.gamesPlayed += gamesPlayed;
    agg.wins += wins;
    agg.ties += ties;
    agg.saves += saves;
    agg.goalsAgainst += goalsAgainst;
    agg.shutouts += shutouts;
    agg.isGoalie = agg.isGoalie || isGoalie;
    if (teamName) {
      const prev = rosterChoice.get(key);
      if (!prev || gamesPlayed > prev.gamesPlayed) {
        rosterChoice.set(key, { teamName, gamesPlayed });
        agg.teamName = teamName;
      }
    }
    playerAgg.set(key, agg);
  }

  // Match profiles by exact full_name; skip ambiguous
  const fullNames = [...new Set([...playerAgg.values()].map(v => v.fullName))];
  const { data: profiles } = await db.from('profiles').select('id,full_name,email').in('full_name', fullNames);
  const profilesByName = new Map();
  for (const p of profiles || []) {
    const k = (p.full_name || '').toLowerCase();
    const arr = profilesByName.get(k) || [];
    arr.push(p);
    profilesByName.set(k, arr);
  }

  // Roster creation for active season
  let rostersCreated = 0, rosterSkippedAmbiguous = 0, rosterSkippedNoTeam = 0;
  for (const agg of playerAgg.values()) {
    const matches = profilesByName.get(agg.fullName.toLowerCase()) || [];
    if (matches.length !== 1) { rosterSkippedAmbiguous++; continue; }
    if (!agg.teamName) { rosterSkippedNoTeam++; continue; }
    const teamId = teamIdByName.get(agg.teamName.toLowerCase());
    if (!teamId) { rosterSkippedNoTeam++; continue; }
    const playerId = matches[0].id;
    const { data: existing } = await db.from('team_rosters').select('id').eq('league_id', leagueId).eq('season_id', activeSeason.id).eq('team_id', teamId).eq('player_id', playerId).maybeSingle();
    if (existing) continue;
    const { error } = await db.from('team_rosters').insert({
      league_id: leagueId,
      season_id: activeSeason.id,
      team_id: teamId,
      player_id: playerId,
      is_goalie: agg.isGoalie,
    });
    if (!error) rostersCreated++;
  }

  // Legacy baseline season
  let legacySeasonId;
  const seasonLookup = await db.from('seasons').select('id').eq('league_id',leagueId).eq('name',legacySeasonName).maybeSingle();
  if (seasonLookup.data?.id) legacySeasonId = seasonLookup.data.id;
  else {
    const { data: created, error } = await db.from('seasons').insert({
      league_id: leagueId,
      name: legacySeasonName,
      start_date: '2012-01-01',
      end_date: '2012-01-01',
      status: 'archived',
      registration_type: 'captain_invite_only',
      schedule_generated: true,
      season_summary: 'Synthetic baseline season for imported Hockey Life career totals.',
    }).select('id').single();
    if (error) throw error;
    legacySeasonId = created.id;
  }

  // Synthetic baseline opponent teams
  async function ensureTeam(name, short) {
    const existing = (await db.from('teams').select('id').eq('league_id',leagueId).eq('name',name).maybeSingle()).data;
    if (existing?.id) return existing.id;
    const { data, error } = await db.from('teams').insert({ league_id: leagueId, name, short_name: short }).select('id').single();
    if (error) throw error;
    return data.id;
  }
  const baselineHomeId = await ensureTeam('Historical Baseline Home', 'HBH');
  const baselineAwayId = await ensureTeam('Historical Baseline Away', 'HBA');

  let baselineGamesCreated = 0, playerStatsCreated = 0, goalieStatsCreated = 0, statsSkippedAmbiguous = 0;
  let idx = 0;
  for (const agg of [...playerAgg.values()].sort((a,b)=>a.fullName.localeCompare(b.fullName))) {
    const matches = profilesByName.get(agg.fullName.toLowerCase()) || [];
    if (matches.length !== 1) { statsSkippedAmbiguous++; continue; }
    const playerId = matches[0].id;
    const teamId = agg.teamName ? teamIdByName.get(agg.teamName.toLowerCase()) : null;
    if (!teamId) { statsSkippedAmbiguous++; continue; }
    // one synthetic verified completed game per player in archived baseline season
    const scheduledAt = new Date(Date.UTC(2012, 0, 1, 0, idx, 0)).toISOString();
    idx += 1;
    let gameId;
    const existingGame = (await db.from('games').select('id').eq('league_id',leagueId).eq('season_id',legacySeasonId).eq('scheduled_at',scheduledAt).maybeSingle()).data;
    if (existingGame?.id) gameId = existingGame.id;
    else {
      const { data, error } = await db.from('games').insert({
        league_id: leagueId,
        season_id: legacySeasonId,
        home_team_id: teamId,
        away_team_id: baselineAwayId,
        scheduled_at: scheduledAt,
        status: 'completed',
        home_score: 0,
        away_score: 0,
        home_captain_verified: true,
        away_captain_verified: true,
        home_verified_by_owner: true,
        away_verified_by_owner: true,
        game_type: 'regular',
        location: 'Historical import baseline',
      }).select('id').single();
      if (error) throw error;
      gameId = data.id;
      baselineGamesCreated++;
    }

    if (agg.isGoalie) {
      const existing = (await db.from('goalie_stats').select('id').eq('league_id',leagueId).eq('season_id',legacySeasonId).eq('game_id',gameId).eq('player_id',playerId).maybeSingle()).data;
      if (!existing) {
        const { error } = await db.from('goalie_stats').insert({
          league_id: leagueId,
          season_id: legacySeasonId,
          game_id: gameId,
          player_id: playerId,
          team_id: teamId,
          saves: agg.saves,
          goals_against: agg.goalsAgainst,
          shutout: agg.shutouts > 0,
        });
        if (error) throw error;
        goalieStatsCreated++;
      }
    } else {
      const existing = (await db.from('player_stats').select('id').eq('league_id',leagueId).eq('season_id',legacySeasonId).eq('game_id',gameId).eq('player_id',playerId).maybeSingle()).data;
      if (!existing) {
        const { error } = await db.from('player_stats').insert({
          league_id: leagueId,
          season_id: legacySeasonId,
          game_id: gameId,
          player_id: playerId,
          team_id: teamId,
          goals: agg.goals,
          assists: agg.assists,
        });
        if (error) throw error;
        playerStatsCreated++;
      }
    }
  }

  const after = {};
  for (const table of ['team_rosters','player_stats','goalie_stats','games','seasons']) {
    const q = db.from(table).select('*',{count:'exact',head:true}).eq('league_id', leagueId);
    const { count } = await q;
    after[table] = count;
  }
  const { data: careerSample } = await db.from('player_career_stats').select('player_id,full_name,games_played,goals,assists,points').limit(10);
  console.log(JSON.stringify({
    before,
    after,
    rostersCreated,
    rosterSkippedAmbiguous,
    rosterSkippedNoTeam,
    legacySeasonId,
    baselineGamesCreated,
    playerStatsCreated,
    goalieStatsCreated,
    statsSkippedAmbiguous,
    careerSample,
  }, null, 2));
})();
