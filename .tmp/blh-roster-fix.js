require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const leagueId = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const requestId = 'dc0d9ce4-82ef-40e2-8390-1f66293d7033';

function parseSqlDumpInserts(content, tableName) {
  const rows = [];
  const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`INSERT\\s+INTO\\s+(?:[\\w".\`\\[\\]]+\\.)?[\\s"'\`\\[\\]]*${escapedTable}[\\s"'\`\\]]*\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?)\\s*;`, 'gi');
  let m; while ((m = re.exec(content)) !== null) {
    const cols = m[1].split(',').map(c => c.replace(/[`"\[\]\s]/g, '').trim()).filter(Boolean);
    const tuples=[]; let depth=0,cur='',ins=false,q='';
    for (let i=0;i<m[2].length;i++) { const ch=m[2][i]; if (ins) { cur+=ch; if(ch===q){ if(i+1<m[2].length&&m[2][i+1]===q){cur+=m[2][++i];} else ins=false; } else if(ch==='\\'&&i+1<m[2].length) cur+=m[2][++i]; continue; } if(ch==="'"||ch==='"'){ins=true;q=ch;cur+=ch;continue;} if(ch==='('){depth++; if(depth===1){cur='';continue;}} if(ch===')'){depth--; if(depth===0){tuples.push(cur);cur='';continue;}} if(depth>0) cur+=ch; }
    for (const tuple of tuples) { const vals=[]; let c='',qs=false; for (let i=0;i<tuple.length;i++){ const ch=tuple[i]; if(qs){ if(ch==="'"){ if(i+1<tuple.length&&tuple[i+1]==="'"){c+="'";i++;} else qs=false; } else if(ch==='\\'&&i+1<tuple.length)c+=tuple[++i]; else c+=ch; continue; } if(ch==="'"){qs=true;continue;} if(ch===','){ vals.push(c.trim().toUpperCase()==='NULL'?'':c.trim()); c=''; continue; } c+=ch; } vals.push(c.trim().toUpperCase()==='NULL'?'':c.trim()); if(vals.length!==cols.length) continue; const row={}; cols.forEach((col,i)=>row[col]=vals[i]); rows.push(row);} }
  return rows;
}

function chooseProfile(matches) {
  if (!matches?.length) return null;
  if (matches.length === 1) return matches[0];
  const legacyDemo = matches.filter(p => (p.email || '').includes('legacy.') && (p.email || '').endsWith('@demo.hockeylifehl.com'));
  if (legacyDemo.length === 1) return legacyDemo[0];
  const legacyHist = matches.filter(p => (p.email || '').includes('legacy_') && (p.email || '').endsWith('@hockeylifehl.com'));
  if (legacyHist.length === 1) return legacyHist[0];
  return null;
}

(async()=>{
  const {data:req}=await db.from('league_migration_requests').select('uploaded_assets').eq('id',requestId).single();
  const assets=new Map((req.uploaded_assets||[]).map(a=>[a.name,a]));
  async function dl(path){ const {data,error}=await db.storage.from('league-migration-assets').download(path); if(error) throw error; return data.text(); }
  const [teamsSql, playersSql, pointsSql] = await Promise.all([
    dl(assets.get('HL_teams.sql').path),
    dl(assets.get('HL_players.sql').path),
    dl(assets.get('HL_points.sql').path),
  ]);
  const teamRows = parseSqlDumpInserts(teamsSql, 'HL_teams');
  const playerRows = parseSqlDumpInserts(playersSql, 'HL_players');
  const pointRows = parseSqlDumpInserts(pointsSql, 'HL_points');
  const teamNameByLegacyId = new Map(teamRows.map(r => [String(r.HLteamID), String(r.teamName || '').trim()]));
  const playerNameByLegacyId = new Map(playerRows.map(r => [String(r.HLplayerID), `${String(r.firstName || '').trim()} ${String(r.lastName || '').trim()}`.trim()]));
  const {data:teams}=await db.from('teams').select('id,name').eq('league_id',leagueId);
  const teamIdByName = new Map((teams||[]).map(t => [t.name.toLowerCase(), t.id]));
  const activeSeason = (await db.from('seasons').select('id').eq('league_id',leagueId).eq('status','active').single()).data;

  const rosterChoice = new Map();
  for (const row of pointRows) {
    const fullName = playerNameByLegacyId.get(String(row.HLplayerID || '')); if (!fullName) continue;
    const teamName = teamNameByLegacyId.get(String(row.HLteamID || '')) || null; if (!teamName) continue;
    const gamesPlayed = Number(row.gamesPlayed || 0) || 0;
    const prev = rosterChoice.get(fullName.toLowerCase());
    if (!prev || gamesPlayed > prev.gamesPlayed) rosterChoice.set(fullName.toLowerCase(), { fullName, teamName, gamesPlayed, isGoalie: String(row.goalie||'0')==='1' });
  }

  const names = [...new Set([...rosterChoice.values()].map(v => v.fullName))];
  const {data:profiles}=await db.from('profiles').select('id,full_name,email').in('full_name', names);
  const byName=new Map(); for(const p of profiles||[]){ const k=(p.full_name||'').toLowerCase(); const arr=byName.get(k)||[]; arr.push(p); byName.set(k,arr);} 

  const before = (await db.from('team_rosters').select('*',{count:'exact',head:true}).eq('league_id',leagueId)).count;
  let created=0, skippedNoProfile=0, skippedNoChoice=0;
  for (const choice of rosterChoice.values()) {
    const teamId = teamIdByName.get(choice.teamName.toLowerCase());
    if (!teamId) { skippedNoChoice++; continue; }
    const profile = chooseProfile(byName.get(choice.fullName.toLowerCase()) || []);
    if (!profile) { skippedNoProfile++; continue; }
    const {data:existing}=await db.from('team_rosters').select('id').eq('league_id',leagueId).eq('season_id',activeSeason.id).eq('team_id',teamId).eq('player_id',profile.id).maybeSingle();
    if (existing) continue;
    const {error}=await db.from('team_rosters').insert({ league_id:leagueId, season_id:activeSeason.id, team_id:teamId, player_id:profile.id, is_goalie: choice.isGoalie });
    if (!error) created++;
  }
  const after = (await db.from('team_rosters').select('*',{count:'exact',head:true}).eq('league_id',leagueId)).count;
  const {data:sample}=await db.from('team_rosters').select('player_id,team_id,season_id,is_goalie').eq('league_id',leagueId).limit(10);
  console.log(JSON.stringify({before,after,created,skippedNoProfile,skippedNoChoice,sample},null,2));
})();
