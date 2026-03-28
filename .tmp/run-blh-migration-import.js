require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const requestId = 'dc0d9ce4-82ef-40e2-8390-1f66293d7033';
const leagueId = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const bucket = 'league-migration-assets';

function parseCsvContent(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headerLine = lines[0];
  const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';
  const parseCsvLine = (line) => {
    const values = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = false;
        } else current += char;
      } else if (char === '"') inQuotes = true;
      else if (char === delimiter) { values.push(current); current = ''; }
      else current += char;
    }
    values.push(current); return values;
  };
  const headers = parseCsvLine(headerLine).map((h) => h.replace(/^\uFEFF/, '').trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line); const row = {};
    headers.forEach((h, i) => { if (h) row[h] = (values[i] ?? '').trim(); });
    return row;
  });
}

function applyFieldMappings(sourceRow, fieldMap) {
  const mapped = {};
  for (const [sourceField, targetField] of fieldMap.entries()) {
    const value = sourceRow[sourceField];
    if (value !== undefined && value !== null && String(value).trim() !== '') mapped[targetField] = String(value).trim();
  }
  return mapped;
}
function makeShortName(name) { return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase() || name.slice(0,4).toUpperCase(); }
function makeSlug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function ensureRosterEntry(playerId, teamId, leagueId, seasonId, mapped) {
  const { data: existing } = await supabase.from('team_rosters').select('id').eq('player_id', playerId).eq('team_id', teamId).eq('league_id', leagueId).eq('season_id', seasonId).maybeSingle();
  if (existing) return;
  const { error } = await supabase.from('team_rosters').insert({
    player_id: playerId,
    team_id: teamId,
    league_id: leagueId,
    season_id: seasonId,
    jersey_number: mapped.jersey_number ? parseInt(mapped.jersey_number, 10) || null : null,
    position: mapped.position || null,
    status: 'active',
  });
  if (error) throw new Error(`Failed roster insert: ${error.message}`);
}

async function writeTeam(mapped, importMode) {
  const teamName = mapped.team_name?.trim();
  if (!teamName) throw new Error('Missing team_name');
  if (importMode === 'merge_upsert') {
    const { data: existing } = await supabase.from('teams').select('id').eq('league_id', leagueId).ilike('name', teamName).maybeSingle();
    if (existing) return 'updated';
  }
  const { error } = await supabase.from('teams').insert({
    league_id: leagueId,
    name: teamName,
    short_name: makeShortName(teamName),
    slug: makeSlug(teamName),
    status: 'active',
  });
  if (error) throw new Error(`Team insert failed for ${teamName}: ${error.message}`);
  return 'created';
}

async function writePlayer(mapped, seasonId, importMode) {
  const fullName = mapped.full_name?.trim() || [mapped.first_name?.trim(), mapped.last_name?.trim()].filter(Boolean).join(' ');
  if (!fullName) throw new Error('Missing full_name');
  let teamId = null;
  if (mapped.team_name) {
    const { data: team } = await supabase.from('teams').select('id').eq('league_id', leagueId).ilike('name', mapped.team_name.trim()).maybeSingle();
    teamId = team?.id ?? null;
  }
  let profileId = null;
  if (mapped.email?.trim()) {
    const { data } = await supabase.from('profiles').select('id').ilike('email', mapped.email.trim()).maybeSingle();
    profileId = data?.id ?? null;
  }
  if (!profileId) {
    const { data } = await supabase.from('profiles').select('id').ilike('full_name', fullName);
    if (data?.length === 1) profileId = data[0].id;
    else if (data?.length > 1) throw new Error(`Ambiguous player ${fullName}`);
  }
  if (profileId) {
    if (teamId && seasonId) await ensureRosterEntry(profileId, teamId, leagueId, seasonId, mapped);
    return 'updated';
  }
  const newId = crypto.randomUUID();
  const { error } = await supabase.from('profiles').insert({ id: newId, full_name: fullName, email: mapped.email || null, phone: mapped.phone || null });
  if (error) throw new Error(`Profile insert failed for ${fullName}: ${error.message}`);
  if (teamId && seasonId) await ensureRosterEntry(newId, teamId, leagueId, seasonId, mapped);
  return 'created';
}

async function writeGame(mapped, seasonId) {
  if (!seasonId) throw new Error('No season');
  const homeTeamName = mapped.home_team?.trim();
  const awayTeamName = mapped.away_team?.trim();
  const gameDate = mapped.game_date?.trim();
  const startTime = mapped.start_time?.trim();
  if (!homeTeamName || !awayTeamName || !gameDate) throw new Error('Missing game fields');
  const [{ data: homeTeam }, { data: awayTeam }] = await Promise.all([
    supabase.from('teams').select('id').eq('league_id', leagueId).ilike('name', homeTeamName).maybeSingle(),
    supabase.from('teams').select('id').eq('league_id', leagueId).ilike('name', awayTeamName).maybeSingle(),
  ]);
  if (!homeTeam) throw new Error(`Home team not found: ${homeTeamName}`);
  if (!awayTeam) throw new Error(`Away team not found: ${awayTeamName}`);
  const scheduledAt = startTime ? new Date(`${gameDate}T${startTime}`).toISOString() : new Date(`${gameDate}T00:00:00`).toISOString();
  const { data: existing } = await supabase.from('games').select('id').eq('league_id', leagueId).eq('season_id', seasonId).eq('home_team_id', homeTeam.id).eq('away_team_id', awayTeam.id).eq('scheduled_at', scheduledAt).maybeSingle();
  if (existing) return 'updated';
  const homeScore = mapped.home_score ? parseInt(mapped.home_score, 10) : null;
  const awayScore = mapped.away_score ? parseInt(mapped.away_score, 10) : null;
  const payload = {
    league_id: leagueId,
    season_id: seasonId,
    home_team_id: homeTeam.id,
    away_team_id: awayTeam.id,
    scheduled_at: scheduledAt,
    location: mapped.venue_name || null,
    status: Number.isInteger(homeScore) && Number.isInteger(awayScore) ? 'completed' : 'scheduled',
    home_score: Number.isInteger(homeScore) ? homeScore : null,
    away_score: Number.isInteger(awayScore) ? awayScore : null,
  };
  const { error } = await supabase.from('games').insert(payload);
  if (error) throw new Error(`Game insert failed: ${error.message}`);
  return 'created';
}

(async()=>{
  const before = {};
  for (const table of ['teams','games','team_rosters']) {
    const { count } = await supabase.from(table).select('*',{count:'exact',head:true}).eq('league_id',leagueId);
    before[table] = count;
  }
  const { count: profilesBefore } = await supabase.from('profiles').select('*',{count:'exact',head:true});
  before.profiles_total = profilesBefore;

  const { data: request, error } = await supabase.from('league_migration_requests').select('*').eq('id',requestId).eq('league_id',leagueId).single();
  if (error) throw error;
  const profile = request.normalization_profile || {};
  const mappings = (profile.import_mappings || []).filter((m) => m.ready_for_import && ['teams','players','schedule_games'].includes(m.target_entity));
  const assets = request.uploaded_assets || [];
  const { data: seasons } = await supabase.from('seasons').select('id,status,start_date,end_date,created_at').eq('league_id',leagueId).order('start_date',{ascending:false});
  const seasonId = seasons?.find((s)=>s.status==='active')?.id || seasons?.[0]?.id || null;

  const entity_reports = [];
  const errors = [];
  await supabase.from('league_migration_requests').update({status:'in_progress'}).eq('id',requestId).eq('league_id',leagueId);
  for (const mapping of mappings) {
    const asset = assets.find((a)=>a.id===mapping.asset_id);
    const report = { target_entity: mapping.target_entity, asset_id: mapping.asset_id, created:0, updated:0, skipped:0, errored:0, errors:[] };
    if (!asset) { report.errored++; report.errors.push('Asset missing'); entity_reports.push(report); continue; }
    const { data: blob, error: dlError } = await supabase.storage.from(bucket).download(asset.path);
    if (dlError || !blob) { report.errored++; report.errors.push(dlError?.message || 'download failed'); entity_reports.push(report); continue; }
    const rows = parseCsvContent(await blob.text());
    const fieldMap = new Map((mapping.field_mappings || []).filter((f) => f.source_field && f.target_field).map((f)=>[f.source_field, f.target_field]));
    for (const row of rows) {
      try {
        const mapped = applyFieldMappings(row, fieldMap);
        if (!Object.keys(mapped).length) { report.skipped++; continue; }
        let result = 'skipped';
        if (mapping.target_entity === 'teams') result = await writeTeam(mapped, mapping.import_mode);
        else if (mapping.target_entity === 'players') result = await writePlayer(mapped, seasonId, mapping.import_mode);
        else if (mapping.target_entity === 'schedule_games') result = await writeGame(mapped, seasonId);
        report[result] = (report[result] || 0) + 1;
      } catch (e) {
        report.errored++; report.errors.push(String(e.message || e));
      }
    }
    entity_reports.push(report);
    errors.push(...report.errors.map((e)=>`[${mapping.target_entity}] ${e}`));
  }

  const after = {};
  for (const table of ['teams','games','team_rosters']) {
    const { count } = await supabase.from(table).select('*',{count:'exact',head:true}).eq('league_id',leagueId);
    after[table] = count;
  }
  const { count: profilesAfter } = await supabase.from('profiles').select('*',{count:'exact',head:true});
  after.profiles_total = profilesAfter;

  const totalErrored = entity_reports.reduce((sum, r) => sum + r.errored, 0);
  const totalCreated = entity_reports.reduce((sum, r) => sum + r.created, 0);
  const totalUpdated = entity_reports.reduce((sum, r) => sum + r.updated, 0);
  const status = totalCreated + totalUpdated === 0 && totalErrored > 0 ? 'failed' : totalErrored > 0 ? 'partial' : 'completed';
  const report = { request_id: requestId, league_id: leagueId, executed_by: 'service-role-script', started_at: new Date().toISOString(), completed_at: new Date().toISOString(), status, entity_reports, errors };
  await supabase.from('league_migration_requests').update({ status, import_report: report }).eq('id',requestId).eq('league_id',leagueId);

  const { data: teamSample } = await supabase.from('teams').select('id,name,slug').eq('league_id',leagueId).order('created_at',{ascending:false}).limit(5);
  const { data: gameSample } = await supabase.from('games').select('id,scheduled_at,home_score,away_score,status').eq('league_id',leagueId).order('scheduled_at',{ascending:false}).limit(5);
  const { data: rosterSample } = await supabase.from('team_rosters').select('player_id,team_id,season_id,position,jersey_number').eq('league_id',leagueId).limit(5);
  console.log(JSON.stringify({ before, after, status, entity_reports, teamSample, gameSample, rosterSample }, null, 2));
})();
