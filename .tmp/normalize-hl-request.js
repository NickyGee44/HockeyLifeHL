require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const requestId = 'dc0d9ce4-82ef-40e2-8390-1f66293d7033';
const leagueId = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const basePath = `${leagueId}/${requestId}`;
const bucket = 'league-migration-assets';

function parseSqlDumpInserts(content, tableName) {
  const rows = [];
  const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const insertPattern = new RegExp(
    `INSERT\\s+INTO\\s+(?:[\\w".\`\\[\\]]+\\.)?[\\s"'\`\\[\\]]*${escapedTable}[\\s"'\`\\]]*\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?)\\s*;`,
    'gi'
  );
  let match;
  while ((match = insertPattern.exec(content)) !== null) {
    const columns = match[1].split(',').map((c) => c.replace(/[`"\[\]\s]/g, '').trim()).filter(Boolean);
    const valueTuples = [];
    let depth = 0, current = '', inString = false, stringChar = '';
    for (let i = 0; i < match[2].length; i++) {
      const char = match[2][i];
      if (inString) {
        current += char;
        if (char === stringChar) {
          if (i + 1 < match[2].length && match[2][i + 1] === stringChar) { current += match[2][++i]; }
          else inString = false;
        } else if (char === '\\' && i + 1 < match[2].length) current += match[2][++i];
        continue;
      }
      if (char === "'" || char === '"') { inString = true; stringChar = char; current += char; continue; }
      if (char === '(') { depth++; if (depth === 1) { current = ''; continue; } }
      if (char === ')') { depth--; if (depth === 0) { valueTuples.push(current); current=''; continue; } }
      if (depth > 0) current += char;
    }
    for (const tuple of valueTuples) {
      const values = [];
      let cur = '', inStr = false;
      for (let i = 0; i < tuple.length; i++) {
        const ch = tuple[i];
        if (inStr) {
          if (ch === "'") {
            if (i + 1 < tuple.length && tuple[i + 1] === "'") { cur += "'"; i++; }
            else inStr = false;
          } else if (ch === '\\' && i + 1 < tuple.length) cur += tuple[++i];
          else cur += ch;
          continue;
        }
        if (ch === "'") { inStr = true; continue; }
        if (ch === ',') { values.push(cur.trim().toUpperCase() === 'NULL' ? '' : cur.trim()); cur=''; continue; }
        cur += ch;
      }
      values.push(cur.trim().toUpperCase() === 'NULL' ? '' : cur.trim());
      if (values.length !== columns.length) continue;
      const row = {};
      for (let i = 0; i < columns.length; i++) row[columns[i]] = values[i];
      rows.push(row);
    }
  }
  return rows;
}
function csvEscape(v) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; }
function toCsv(rows) { const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))]; return [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n'); }
function sampleColumns(rows, fallback) { return rows.length ? Object.keys(rows[0]) : fallback; }
async function downloadText(path) { const {data,error}=await supabase.storage.from(bucket).download(path); if(error||!data) throw new Error(error?.message||'download failed'); return data.text(); }

(async()=>{
  const {data:row,error}=await supabase.from('league_migration_requests').select('*').eq('id',requestId).eq('league_id',leagueId).single();
  if(error||!row) throw error || new Error('request not found');
  const uploaded_assets = Array.isArray(row.uploaded_assets) ? row.uploaded_assets : [];
  const normalization_profile = row.normalization_profile || {};
  const byName = new Map(uploaded_assets.map(a=>[a.name,a]));

  const arenas = parseSqlDumpInserts(await downloadText(byName.get('HL_arenas.sql').path), 'HL_arenas');
  const teams = parseSqlDumpInserts(await downloadText(byName.get('HL_teams.sql').path), 'HL_teams');
  const games = parseSqlDumpInserts(await downloadText(byName.get('HL_games.sql').path), 'HL_games');
  const players = parseSqlDumpInserts(await downloadText(byName.get('HL_players.sql').path), 'HL_players');
  const arenaNameById = new Map(arenas.map(r => [String(r.HLarenaID), String(r.arenaName || '')]));
  const teamNameById = new Map(teams.map(r => [String(r.HLteamID), String(r.teamName || '')]));

  const normalizedTeams = teams.map(r => ({ legacy_team_id:String(r.HLteamID||''), legacy_season_id:String(r.HLseasonID||''), team_name:String(r.teamName||'').trim(), team_abbr:String(r.teamAbbr||'').trim() })).filter(r=>r.team_name);
  const normalizedPlayers = players.map(r => ({ legacy_player_id:String(r.HLplayerID||''), first_name:String(r.firstName||'').trim(), last_name:String(r.lastName||'').trim(), full_name:`${String(r.firstName||'').trim()} ${String(r.lastName||'').trim()}`.trim() })).filter(r=>r.full_name);
  const normalizedGames = games.map(r => {
    const dt = String(r.dateandtime||'').trim(); const [game_date,time=''] = dt.split(' ');
    return { legacy_game_id:String(r.HLgameID||''), legacy_season_id:String(r.HLseasonID||''), legacy_arena_id:String(r.HLarenaID||''), home_team:teamNameById.get(String(r.team1||''))||'', away_team:teamNameById.get(String(r.team2||''))||'', game_date, start_time:time.slice(0,5), venue_name:arenaNameById.get(String(r.HLarenaID||''))||'', home_score:String(r.score1||'').trim(), away_score:String(r.score2||'').trim(), event_name:String(r.eventWhat||'').trim() };
  }).filter(r=>r.home_team && r.away_team && r.game_date);

  const generatedAt = Date.now();
  const specs = [
    {name:'HL_teams.normalized.csv', rows:normalizedTeams, note:'Generated from HL_teams.sql for executable migration import.', scope:'teams', target:'teams', source_object:'HL_teams_normalized', import_mode:'merge_upsert', field_mappings:[{source_field:'team_name',target_field:'team_name',required:true,confidence:'confirmed'}]},
    {name:'HL_players.normalized.csv', rows:normalizedPlayers, note:'Generated from HL_players.sql with full_name synthesis for executable migration import.', scope:'players', target:'players', source_object:'HL_players_normalized', import_mode:'merge_upsert', field_mappings:[{source_field:'first_name',target_field:'first_name',required:false,confidence:'confirmed'},{source_field:'last_name',target_field:'last_name',required:false,confidence:'confirmed'},{source_field:'full_name',target_field:'full_name',required:true,confidence:'confirmed'}]},
    {name:'HL_games.normalized.csv', rows:normalizedGames, note:'Generated from HL_games.sql + HL_teams.sql + HL_arenas.sql with IDs resolved to names.', scope:'schedule', target:'schedule_games', source_object:'HL_games_normalized', import_mode:'append_only', field_mappings:[{source_field:'home_team',target_field:'home_team',required:true,confidence:'confirmed'},{source_field:'away_team',target_field:'away_team',required:true,confidence:'confirmed'},{source_field:'game_date',target_field:'game_date',required:true,confidence:'confirmed'},{source_field:'start_time',target_field:'start_time',required:true,confidence:'confirmed'},{source_field:'venue_name',target_field:'venue_name',required:false,confidence:'confirmed'},{source_field:'home_score',target_field:'home_score',required:false,confidence:'confirmed'},{source_field:'away_score',target_field:'away_score',required:false,confidence:'confirmed'}]},
  ];

  const newAssets = [];
  const newMappings = [];
  for (const spec of specs) {
    const content = toCsv(spec.rows);
    const path = `${basePath}/${generatedAt}-${spec.name.toLowerCase()}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, Buffer.from(content,'utf8'), { upsert:true, contentType:'text/csv' });
    if (uploadError) throw uploadError;
    const asset = { id: randomUUID(), name: spec.name, path, size_bytes: Buffer.byteLength(content,'utf8'), mime_type:'text/csv', uploaded_at:new Date().toISOString(), uploaded_by:row.requested_by || null, note:spec.note, analysis:{ source_format:'csv_export', sql_engine:null, detected_scopes:[spec.scope], detected_tables:[spec.source_object], sample_columns:sampleColumns(spec.rows, spec.field_mappings.map(m=>m.source_field)), estimated_rows:spec.rows.length, notes:[spec.note] } };
    newAssets.push(asset);
    newMappings.push({ asset_id: asset.id, scope: spec.scope, target_entity: spec.target, source_object: spec.source_object, import_mode: spec.import_mode, field_mappings: spec.field_mappings, notes:[spec.note], blockers:[], ready_for_import:true, updated_at:new Date().toISOString() });
  }

  const mergedAssets = [...uploaded_assets, ...newAssets];
  const import_mappings = [...(normalization_profile.import_mappings || []), ...newMappings];
  const import_ready_scopes = [...new Set(import_mappings.filter(m=>m.ready_for_import).map(m=>m.scope).filter(Boolean))];
  const import_blockers = import_mappings.flatMap((m) => (m.blockers || []).map((b) => {
    const asset = mergedAssets.find(a => a.id === m.asset_id); return `${asset?.name || m.asset_id}: ${b}`;
  }));
  const source_formats = [...new Set(mergedAssets.map(a => a.analysis?.source_format).filter(Boolean))];
  const detected_tables = [...new Set(mergedAssets.flatMap(a => a.analysis?.detected_tables || []))];
  const suggested_scope = [...new Set(mergedAssets.flatMap(a => a.analysis?.detected_scopes || []))];
  const notes = [...new Set([...(normalization_profile.notes || []), 'Normalized CSV assets generated from Hockey Life SQL dumps for executable import.'])];
  const nextProfile = { ...normalization_profile, source_formats, detected_tables, suggested_scope, notes, ready_for_review:true, import_mappings, import_ready_scopes, import_blockers };

  const { error: updateError } = await supabase.from('league_migration_requests').update({ uploaded_assets: mergedAssets, normalization_profile: nextProfile }).eq('id',requestId).eq('league_id',leagueId);
  if (updateError) throw updateError;
  console.log(JSON.stringify({ createdAssets: newAssets.map(a => ({name:a.name, rows:a.analysis.estimated_rows, path:a.path})), readyMappings: newMappings.map(m => ({target:m.target_entity, ready:m.ready_for_import})), import_ready_scopes }, null, 2));
})();
