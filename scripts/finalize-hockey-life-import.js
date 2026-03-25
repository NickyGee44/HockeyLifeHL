require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_REQUEST_ID = 'dc0d9ce4-82ef-40e2-8390-1f66293d7033';
const DEFAULT_LEAGUE_ID = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const DEFAULT_BUCKET = 'league-migration-assets';
const LEGACY_SEASON_NAME = 'Historical Career Baseline (Pre-BLH)';

const argv = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
  return [key, value];
}));

const requestId = argv.get('request') || DEFAULT_REQUEST_ID;
const leagueId = argv.get('league') || DEFAULT_LEAGUE_ID;
const bucket = argv.get('bucket') || DEFAULT_BUCKET;
const mode = argv.get('mode') || 'all';

function parseSqlDumpInserts(content, tableName) {
  const rows = [];
  const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const insertPattern = new RegExp(
    `INSERT\\s+INTO\\s+(?:[\\w".\`\\[\\]]+\\.)?[\\s"'\`\\[\\]]*${escapedTable}[\\s"'\`\\]]*\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?)\\s*;`,
    'gi'
  );

  let match;
  while ((match = insertPattern.exec(content)) !== null) {
    const columns = match[1]
      .split(',')
      .map((col) => col.replace(/[`"\[\]\s]/g, '').trim())
      .filter(Boolean);

    const valueTuples = [];
    let depth = 0;
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < match[2].length; i += 1) {
      const ch = match[2][i];
      if (inString) {
        current += ch;
        if (ch === stringChar) {
          if (i + 1 < match[2].length && match[2][i + 1] === stringChar) {
            current += match[2][++i];
          } else {
            inString = false;
          }
        } else if (ch === '\\' && i + 1 < match[2].length) {
          current += match[2][++i];
        }
        continue;
      }

      if (ch === "'" || ch === '"') {
        inString = true;
        stringChar = ch;
        current += ch;
        continue;
      }
      if (ch === '(') {
        depth += 1;
        if (depth === 1) {
          current = '';
          continue;
        }
      }
      if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          valueTuples.push(current);
          current = '';
          continue;
        }
      }
      if (depth > 0) current += ch;
    }

    for (const tuple of valueTuples) {
      const values = [];
      let cur = '';
      let inQuotedString = false;
      for (let i = 0; i < tuple.length; i += 1) {
        const ch = tuple[i];
        if (inQuotedString) {
          if (ch === "'") {
            if (i + 1 < tuple.length && tuple[i + 1] === "'") {
              cur += "'";
              i += 1;
            } else {
              inQuotedString = false;
            }
          } else if (ch === '\\' && i + 1 < tuple.length) {
            cur += tuple[++i];
          } else {
            cur += ch;
          }
          continue;
        }
        if (ch === "'") {
          inQuotedString = true;
          continue;
        }
        if (ch === ',') {
          values.push(cur.trim().toUpperCase() === 'NULL' ? '' : cur.trim());
          cur = '';
          continue;
        }
        cur += ch;
      }
      values.push(cur.trim().toUpperCase() === 'NULL' ? '' : cur.trim());
      if (values.length !== columns.length) continue;

      const row = {};
      columns.forEach((col, idx) => {
        row[col] = values[idx];
      });
      rows.push(row);
    }
  }

  return rows;
}

function csvEscape(value) {
  const str = value == null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(rows) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

async function downloadText(path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`download failed for ${path}: ${error?.message || 'unknown error'}`);
  return data.text();
}

function chooseProfile(matches) {
  if (!matches?.length) return null;
  if (matches.length === 1) return matches[0];

  const legacyDemo = matches.filter(
    (profile) => (profile.email || '').includes('legacy.') && (profile.email || '').endsWith('@demo.hockeylifehl.com')
  );
  if (legacyDemo.length === 1) return legacyDemo[0];

  const legacyHist = matches.filter(
    (profile) => (profile.email || '').includes('legacy_') && (profile.email || '').endsWith('@hockeylifehl.com')
  );
  if (legacyHist.length === 1) return legacyHist[0];

  return null;
}

async function getRequest() {
  const { data, error } = await supabase
    .from('league_migration_requests')
    .select('*')
    .eq('id', requestId)
    .eq('league_id', leagueId)
    .single();
  if (error || !data) throw error || new Error('migration request not found');
  return data;
}

async function loadRawSourceRows() {
  const request = await getRequest();
  const assets = new Map((request.uploaded_assets || []).map((asset) => [asset.name, asset]));
  const [arenasSql, teamsSql, gamesSql, playersSql, pointsSql] = await Promise.all([
    downloadText(assets.get('HL_arenas.sql').path),
    downloadText(assets.get('HL_teams.sql').path),
    downloadText(assets.get('HL_games.sql').path),
    downloadText(assets.get('HL_players.sql').path),
    downloadText(assets.get('HL_points.sql').path),
  ]);

  return {
    request,
    arenas: parseSqlDumpInserts(arenasSql, 'HL_arenas'),
    teams: parseSqlDumpInserts(teamsSql, 'HL_teams'),
    games: parseSqlDumpInserts(gamesSql, 'HL_games'),
    players: parseSqlDumpInserts(playersSql, 'HL_players'),
    points: parseSqlDumpInserts(pointsSql, 'HL_points'),
  };
}

async function normalizeAssets() {
  const { request, arenas, teams, games, players } = await loadRawSourceRows();
  const basePath = `${leagueId}/${requestId}`;
  const uploadedAssets = Array.isArray(request.uploaded_assets) ? request.uploaded_assets : [];
  const normalizationProfile = request.normalization_profile || {};

  const arenaNameById = new Map(arenas.map((row) => [String(row.HLarenaID), String(row.arenaName || '').trim()]));
  const teamNameById = new Map(teams.map((row) => [String(row.HLteamID), String(row.teamName || '').trim()]));

  const normalizedTeams = teams
    .map((row) => ({
      legacy_team_id: String(row.HLteamID || ''),
      legacy_season_id: String(row.HLseasonID || ''),
      team_name: String(row.teamName || '').trim(),
      short_name: String(row.teamAbbr || '').trim(),
    }))
    .filter((row) => row.team_name);

  const normalizedPlayers = players
    .map((row) => ({
      legacy_player_id: String(row.HLplayerID || ''),
      first_name: String(row.firstName || '').trim(),
      last_name: String(row.lastName || '').trim(),
      full_name: `${String(row.firstName || '').trim()} ${String(row.lastName || '').trim()}`.trim(),
    }))
    .filter((row) => row.full_name);

  const normalizedGames = games
    .map((row) => {
      const dateTime = String(row.dateandtime || '').trim();
      const [gameDate, time = ''] = dateTime.split(' ');
      return {
        legacy_game_id: String(row.HLgameID || ''),
        legacy_season_id: String(row.HLseasonID || ''),
        legacy_arena_id: String(row.HLarenaID || ''),
        home_team: teamNameById.get(String(row.team1 || '')) || '',
        away_team: teamNameById.get(String(row.team2 || '')) || '',
        game_date: gameDate,
        start_time: time.slice(0, 5),
        venue_name: arenaNameById.get(String(row.HLarenaID || '')) || '',
        home_score: String(row.score1 || '').trim(),
        away_score: String(row.score2 || '').trim(),
        event_name: String(row.eventWhat || '').trim(),
      };
    })
    .filter((row) => row.home_team && row.away_team && row.game_date);

  const generatedAt = Date.now();
  const specs = [
    {
      name: 'HL_teams.normalized.csv',
      rows: normalizedTeams,
      scope: 'teams',
      targetEntity: 'teams',
      sourceObject: 'HL_teams_normalized',
      importMode: 'merge_upsert',
      note: 'Generated from HL_teams.sql for executable migration import.',
      fieldMappings: [
        { source_field: 'team_name', target_field: 'team_name', required: true, confidence: 'confirmed' },
        { source_field: 'short_name', target_field: 'short_name', required: false, confidence: 'confirmed' },
      ],
    },
    {
      name: 'HL_players.normalized.csv',
      rows: normalizedPlayers,
      scope: 'players',
      targetEntity: 'players',
      sourceObject: 'HL_players_normalized',
      importMode: 'merge_upsert',
      note: 'Generated from HL_players.sql with synthesized full_name for executable migration import.',
      fieldMappings: [
        { source_field: 'first_name', target_field: 'first_name', required: false, confidence: 'confirmed' },
        { source_field: 'last_name', target_field: 'last_name', required: false, confidence: 'confirmed' },
        { source_field: 'full_name', target_field: 'full_name', required: true, confidence: 'confirmed' },
      ],
    },
    {
      name: 'HL_games.normalized.csv',
      rows: normalizedGames,
      scope: 'schedule',
      targetEntity: 'schedule_games',
      sourceObject: 'HL_games_normalized',
      importMode: 'append_only',
      note: 'Generated from HL_games.sql + HL_teams.sql + HL_arenas.sql with IDs resolved to names.',
      fieldMappings: [
        { source_field: 'home_team', target_field: 'home_team', required: true, confidence: 'confirmed' },
        { source_field: 'away_team', target_field: 'away_team', required: true, confidence: 'confirmed' },
        { source_field: 'game_date', target_field: 'game_date', required: true, confidence: 'confirmed' },
        { source_field: 'start_time', target_field: 'start_time', required: false, confidence: 'confirmed' },
        { source_field: 'venue_name', target_field: 'venue_name', required: false, confidence: 'confirmed' },
        { source_field: 'home_score', target_field: 'home_score', required: false, confidence: 'confirmed' },
        { source_field: 'away_score', target_field: 'away_score', required: false, confidence: 'confirmed' },
      ],
    },
  ];

  const mergedAssets = [...uploadedAssets];
  const importMappings = [...(normalizationProfile.import_mappings || [])];
  const createdAssets = [];

  for (const spec of specs) {
    const exists = mergedAssets.find((asset) => asset.name === spec.name);
    if (exists) continue;

    const content = toCsv(spec.rows);
    const path = `${basePath}/${generatedAt}-${spec.name.toLowerCase()}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, Buffer.from(content, 'utf8'), { upsert: true, contentType: 'text/csv' });
    if (uploadError) throw uploadError;

    const asset = {
      id: randomUUID(),
      name: spec.name,
      path,
      size_bytes: Buffer.byteLength(content, 'utf8'),
      mime_type: 'text/csv',
      uploaded_at: new Date().toISOString(),
      uploaded_by: request.requested_by || null,
      note: spec.note,
      analysis: {
        source_format: 'csv_export',
        detected_scopes: [spec.scope],
        detected_tables: [spec.sourceObject],
        estimated_rows: spec.rows.length,
        sample_columns: spec.rows.length ? Object.keys(spec.rows[0]) : spec.fieldMappings.map((entry) => entry.source_field),
        notes: [spec.note],
      },
    };

    mergedAssets.push(asset);
    importMappings.push({
      asset_id: asset.id,
      scope: spec.scope,
      target_entity: spec.targetEntity,
      source_object: spec.sourceObject,
      import_mode: spec.importMode,
      field_mappings: spec.fieldMappings,
      notes: [spec.note],
      blockers: [],
      ready_for_import: true,
      updated_at: new Date().toISOString(),
    });
    createdAssets.push({ name: spec.name, rows: spec.rows.length, path });
  }

  const nextProfile = {
    ...normalizationProfile,
    ready_for_review: true,
    import_mappings: importMappings,
    import_ready_scopes: [...new Set(importMappings.filter((entry) => entry.ready_for_import).map((entry) => entry.scope).filter(Boolean))],
    notes: [...new Set([...(normalizationProfile.notes || []), 'Normalized CSV assets generated from Hockey Life SQL dumps for executable import.'])],
  };

  const { error: updateError } = await supabase
    .from('league_migration_requests')
    .update({ uploaded_assets: mergedAssets, normalization_profile: nextProfile })
    .eq('id', requestId)
    .eq('league_id', leagueId);
  if (updateError) throw updateError;

  return { createdAssets, importReadyScopes: nextProfile.import_ready_scopes };
}

async function importBaseEntities() {
  const request = await getRequest();
  const profile = request.normalization_profile || {};
  const mappings = (profile.import_mappings || []).filter(
    (mapping) => mapping.ready_for_import && ['teams', 'players', 'schedule_games'].includes(mapping.target_entity)
  );
  const assets = new Map((request.uploaded_assets || []).map((asset) => [asset.id, asset]));

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id,status,start_date,created_at')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });
  const activeSeasonId = seasons?.find((season) => season.status === 'active')?.id || seasons?.[0]?.id || null;
  if (!activeSeasonId) throw new Error('No season found for league');

  const countsBefore = {};
  for (const table of ['teams', 'games', 'team_rosters']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('league_id', leagueId);
    countsBefore[table] = count;
  }

  const reports = [];
  for (const mapping of mappings) {
    const asset = assets.get(mapping.asset_id);
    if (!asset) {
      reports.push({ target_entity: mapping.target_entity, errored: 1, errors: ['asset missing'] });
      continue;
    }

    const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(asset.path);
    if (downloadError || !blob) {
      reports.push({ target_entity: mapping.target_entity, errored: 1, errors: [downloadError?.message || 'download failed'] });
      continue;
    }

    const csv = await blob.text();
    const lines = csv.split(/\r?\n/).filter((line) => line.trim());
    const headers = lines[0].split(',').map((header) => header.trim());
    const rows = lines.slice(1).map((line) => {
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i += 1;
            } else {
              inQuotes = false;
            }
          } else {
            current += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          values.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      values.push(current);
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = (values[idx] || '').trim();
      });
      return row;
    });

    const fieldMap = new Map(
      (mapping.field_mappings || [])
        .filter((entry) => entry.source_field && entry.target_field)
        .map((entry) => [entry.source_field, entry.target_field])
    );

    const report = { target_entity: mapping.target_entity, created: 0, updated: 0, skipped: 0, errored: 0, errors: [] };

    for (const row of rows) {
      const mapped = {};
      for (const [sourceField, targetField] of fieldMap.entries()) {
        if (row[sourceField]) mapped[targetField] = row[sourceField];
      }

      try {
        if (mapping.target_entity === 'teams') {
          const teamName = mapped.team_name?.trim();
          if (!teamName) {
            report.skipped += 1;
            continue;
          }
          const existing = await supabase.from('teams').select('id').eq('league_id', leagueId).ilike('name', teamName).maybeSingle();
          if (existing.data?.id) {
            report.updated += 1;
            continue;
          }
          const insert = await supabase.from('teams').insert({
            league_id: leagueId,
            name: teamName,
            short_name: mapped.short_name || teamName.slice(0, 4).toUpperCase(),
            slug: teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            status: 'active',
          });
          if (insert.error) throw insert.error;
          report.created += 1;
        } else if (mapping.target_entity === 'players') {
          const fullName = mapped.full_name?.trim() || [mapped.first_name?.trim(), mapped.last_name?.trim()].filter(Boolean).join(' ');
          if (!fullName) {
            report.skipped += 1;
            continue;
          }
          const match = await supabase.from('profiles').select('id').ilike('full_name', fullName);
          if (match.data?.length === 1) {
            report.updated += 1;
            continue;
          }
          if ((match.data || []).length > 1) {
            report.errored += 1;
            report.errors.push(`ambiguous player ${fullName}`);
            continue;
          }
          const insert = await supabase.from('profiles').insert({ id: randomUUID(), full_name: fullName, email: null });
          if (insert.error) throw insert.error;
          report.created += 1;
        } else if (mapping.target_entity === 'schedule_games') {
          const homeTeamName = mapped.home_team?.trim();
          const awayTeamName = mapped.away_team?.trim();
          const gameDate = mapped.game_date?.trim();
          if (!homeTeamName || !awayTeamName || !gameDate) {
            report.skipped += 1;
            continue;
          }
          const [homeTeamRes, awayTeamRes] = await Promise.all([
            supabase.from('teams').select('id').eq('league_id', leagueId).ilike('name', homeTeamName).maybeSingle(),
            supabase.from('teams').select('id').eq('league_id', leagueId).ilike('name', awayTeamName).maybeSingle(),
          ]);
          if (!homeTeamRes.data?.id || !awayTeamRes.data?.id) throw new Error(`missing team for ${homeTeamName} vs ${awayTeamName}`);
          const scheduledAt = mapped.start_time ? new Date(`${gameDate}T${mapped.start_time}`).toISOString() : new Date(`${gameDate}T00:00:00`).toISOString();
          const existing = await supabase
            .from('games')
            .select('id')
            .eq('league_id', leagueId)
            .eq('season_id', activeSeasonId)
            .eq('home_team_id', homeTeamRes.data.id)
            .eq('away_team_id', awayTeamRes.data.id)
            .eq('scheduled_at', scheduledAt)
            .maybeSingle();
          if (existing.data?.id) {
            report.updated += 1;
            continue;
          }
          const homeScore = mapped.home_score ? parseInt(mapped.home_score, 10) : null;
          const awayScore = mapped.away_score ? parseInt(mapped.away_score, 10) : null;
          const insert = await supabase.from('games').insert({
            league_id: leagueId,
            season_id: activeSeasonId,
            home_team_id: homeTeamRes.data.id,
            away_team_id: awayTeamRes.data.id,
            scheduled_at: scheduledAt,
            location: mapped.venue_name || null,
            status: Number.isInteger(homeScore) && Number.isInteger(awayScore) ? 'completed' : 'scheduled',
            home_score: Number.isInteger(homeScore) ? homeScore : null,
            away_score: Number.isInteger(awayScore) ? awayScore : null,
          });
          if (insert.error) throw insert.error;
          report.created += 1;
        }
      } catch (error) {
        report.errored += 1;
        report.errors.push(String(error.message || error));
      }
    }

    reports.push(report);
  }

  const countsAfter = {};
  for (const table of ['teams', 'games', 'team_rosters']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('league_id', leagueId);
    countsAfter[table] = count;
  }

  return { countsBefore, countsAfter, reports, activeSeasonId };
}

async function repairProfilesAndHistoricalStats() {
  const { request, teams, players, points } = await loadRawSourceRows();
  const teamNameByLegacyId = new Map(teams.map((row) => [String(row.HLteamID), String(row.teamName || '').trim()]));
  const playerNameByLegacyId = new Map(
    players.map((row) => [String(row.HLplayerID), `${String(row.firstName || '').trim()} ${String(row.lastName || '').trim()}`.trim()])
  );

  const profileFixes = [
    { legacyEmail: 'legacy.91@demo.hockeylifehl.com', full_name: 'Jordie Margison' },
    { legacyEmail: 'legacy.107@demo.hockeylifehl.com', full_name: 'Jamie Slade' },
    { legacyEmail: 'legacy.47@demo.hockeylifehl.com', full_name: 'Mark Denomme' },
    { create: true, full_name: 'Ben Ausin', email: 'legacy.hl.309@demo.hockeylifehl.com' },
  ];

  const profileRepairLog = [];
  for (const fix of profileFixes) {
    if (fix.create) {
      const existing = await supabase.from('profiles').select('id,full_name,email').eq('full_name', fix.full_name).maybeSingle();
      if (existing.data?.id) {
        profileRepairLog.push({ action: 'exists', profile: existing.data });
        continue;
      }
      const inserted = await supabase
        .from('profiles')
        .insert({ id: randomUUID(), full_name: fix.full_name, email: fix.email })
        .select('id,full_name,email')
        .single();
      if (inserted.error) throw inserted.error;
      profileRepairLog.push({ action: 'created', profile: inserted.data });
    } else {
      const updated = await supabase
        .from('profiles')
        .update({ full_name: fix.full_name })
        .eq('email', fix.legacyEmail)
        .select('id,full_name,email')
        .single();
      if (updated.error) throw updated.error;
      profileRepairLog.push({ action: 'updated', profile: updated.data });
    }
  }

  const { data: liveTeams } = await supabase.from('teams').select('id,name').eq('league_id', leagueId);
  const teamIdByName = new Map((liveTeams || []).map((team) => [team.name.toLowerCase(), team.id]));
  const activeSeason = await supabase.from('seasons').select('id').eq('league_id', leagueId).eq('status', 'active').single();
  if (activeSeason.error || !activeSeason.data?.id) throw activeSeason.error || new Error('No active season');

  const rosterChoice = new Map();
  const aggregateByName = new Map();
  for (const row of points) {
    const fullName = playerNameByLegacyId.get(String(row.HLplayerID || ''));
    if (!fullName) continue;
    const teamName = teamNameByLegacyId.get(String(row.HLteamID || '')) || null;
    const gamesPlayed = Number(row.gamesPlayed || 0) || 0;
    const goals = Number(row.goals || 0) || 0;
    const assists = Number(row.assists || 0) || 0;
    const saves = Number(row.saves || 0) || 0;
    const goalsAgainst = Number(row.goalsAgainst || 0) || 0;
    const shutouts = Number(row.shutouts || 0) || 0;
    const isGoalie = String(row.goalie || '0') === '1';

    const existingChoice = rosterChoice.get(fullName.toLowerCase());
    if (teamName && (!existingChoice || gamesPlayed > existingChoice.gamesPlayed)) {
      rosterChoice.set(fullName.toLowerCase(), { fullName, teamName, gamesPlayed, isGoalie });
    }

    const agg = aggregateByName.get(fullName.toLowerCase()) || {
      fullName,
      teamName: null,
      isGoalie: false,
      goals: 0,
      assists: 0,
      saves: 0,
      goalsAgainst: 0,
      shutouts: 0,
    };
    agg.goals += goals;
    agg.assists += assists;
    agg.saves += saves;
    agg.goalsAgainst += goalsAgainst;
    agg.shutouts += shutouts;
    agg.isGoalie = agg.isGoalie || isGoalie;
    if (teamName) agg.teamName = rosterChoice.get(fullName.toLowerCase())?.teamName || teamName;
    aggregateByName.set(fullName.toLowerCase(), agg);
  }

  const names = [...new Set([...aggregateByName.values()].map((entry) => entry.fullName))];
  const { data: profiles } = await supabase.from('profiles').select('id,full_name,email').in('full_name', names);
  const profilesByName = new Map();
  for (const profile of profiles || []) {
    const key = (profile.full_name || '').toLowerCase();
    const arr = profilesByName.get(key) || [];
    arr.push(profile);
    profilesByName.set(key, arr);
  }

  const baselineSeasonLookup = await supabase
    .from('seasons')
    .select('id')
    .eq('league_id', leagueId)
    .eq('name', LEGACY_SEASON_NAME)
    .maybeSingle();
  let baselineSeasonId = baselineSeasonLookup.data?.id;
  if (!baselineSeasonId) {
    const inserted = await supabase
      .from('seasons')
      .insert({
        league_id: leagueId,
        name: LEGACY_SEASON_NAME,
        start_date: '2012-01-01',
        end_date: '2012-01-01',
        status: 'archived',
        registration_type: 'captain_invite_only',
        schedule_generated: true,
        season_summary: 'Synthetic baseline season for imported Hockey Life career totals.',
      })
      .select('id')
      .single();
    if (inserted.error) throw inserted.error;
    baselineSeasonId = inserted.data.id;
  }

  async function ensureSupportTeam(name, shortName) {
    const existing = await supabase.from('teams').select('id').eq('league_id', leagueId).eq('name', name).maybeSingle();
    if (existing.data?.id) return existing.data.id;
    const inserted = await supabase
      .from('teams')
      .insert({ league_id: leagueId, name, short_name: shortName })
      .select('id')
      .single();
    if (inserted.error) throw inserted.error;
    return inserted.data.id;
  }

  const baselineAwayId = await ensureSupportTeam('Historical Baseline Away', 'HBA');

  const countsBefore = {
    rosters: (await supabase.from('team_rosters').select('*', { count: 'exact', head: true }).eq('league_id', leagueId)).count,
    playerStats: (await supabase.from('player_stats').select('*', { count: 'exact', head: true }).eq('league_id', leagueId)).count,
    goalieStats: (await supabase.from('goalie_stats').select('*', { count: 'exact', head: true }).eq('league_id', leagueId)).count,
  };

  let rosterCreated = 0;
  let playerStatsCreated = 0;
  let goalieStatsCreated = 0;
  const errors = [];

  for (const choice of rosterChoice.values()) {
    const teamId = teamIdByName.get(choice.teamName.toLowerCase());
    const profile = chooseProfile(profilesByName.get(choice.fullName.toLowerCase()) || []);
    if (!teamId || !profile) continue;
    const existing = await supabase
      .from('team_rosters')
      .select('id')
      .eq('league_id', leagueId)
      .eq('season_id', activeSeason.data.id)
      .eq('team_id', teamId)
      .eq('player_id', profile.id)
      .maybeSingle();
    if (!existing.data?.id) {
      const inserted = await supabase.from('team_rosters').insert({
        league_id: leagueId,
        season_id: activeSeason.data.id,
        team_id: teamId,
        player_id: profile.id,
      });
      if (inserted.error) errors.push({ type: 'roster', name: choice.fullName, error: inserted.error.message });
      else rosterCreated += 1;
    }
  }

  const existingBaselineGames = await supabase
    .from('games')
    .select('id,scheduled_at')
    .eq('league_id', leagueId)
    .eq('season_id', baselineSeasonId)
    .order('scheduled_at', { ascending: true });
  const baselineGames = existingBaselineGames.data || [];
  const sortedAgg = [...aggregateByName.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));

  for (let i = 0; i < sortedAgg.length; i += 1) {
    const agg = sortedAgg[i];
    const profile = chooseProfile(profilesByName.get(agg.fullName.toLowerCase()) || []);
    const teamId = agg.teamName ? teamIdByName.get(agg.teamName.toLowerCase()) : null;
    if (!profile || !teamId) continue;

    const scheduledAt = new Date(Date.UTC(2012, 0, 1, 0, i, 0)).toISOString();
    let gameId = baselineGames.find((game) => game.scheduled_at === scheduledAt)?.id;
    if (!gameId) {
      const inserted = await supabase
        .from('games')
        .insert({
          league_id: leagueId,
          season_id: baselineSeasonId,
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
        })
        .select('id')
        .single();
      if (inserted.error) {
        errors.push({ type: 'game', name: agg.fullName, error: inserted.error.message });
        continue;
      }
      gameId = inserted.data.id;
      baselineGames.push({ id: gameId, scheduled_at: scheduledAt });
    }

    if (agg.isGoalie) {
      const existing = await supabase
        .from('goalie_stats')
        .select('id')
        .eq('league_id', leagueId)
        .eq('season_id', baselineSeasonId)
        .eq('game_id', gameId)
        .eq('player_id', profile.id)
        .maybeSingle();
      if (!existing.data?.id) {
        const inserted = await supabase.from('goalie_stats').insert({
          league_id: leagueId,
          season_id: baselineSeasonId,
          game_id: gameId,
          player_id: profile.id,
          team_id: teamId,
          saves: agg.saves,
          goals_against: agg.goalsAgainst,
          shutout: agg.shutouts > 0,
        });
        if (inserted.error) errors.push({ type: 'goalie', name: agg.fullName, error: inserted.error.message });
        else goalieStatsCreated += 1;
      }
    } else {
      const existing = await supabase
        .from('player_stats')
        .select('id')
        .eq('league_id', leagueId)
        .eq('season_id', baselineSeasonId)
        .eq('game_id', gameId)
        .eq('player_id', profile.id)
        .maybeSingle();
      if (!existing.data?.id) {
        const inserted = await supabase.from('player_stats').insert({
          league_id: leagueId,
          season_id: baselineSeasonId,
          game_id: gameId,
          player_id: profile.id,
          team_id: teamId,
          goals: agg.goals,
          assists: agg.assists,
        });
        if (inserted.error) errors.push({ type: 'player', name: agg.fullName, error: inserted.error.message });
        else playerStatsCreated += 1;
      }
    }
  }

  const countsAfter = {
    rosters: (await supabase.from('team_rosters').select('*', { count: 'exact', head: true }).eq('league_id', leagueId)).count,
    playerStats: (await supabase.from('player_stats').select('*', { count: 'exact', head: true }).eq('league_id', leagueId)).count,
    goalieStats: (await supabase.from('goalie_stats').select('*', { count: 'exact', head: true }).eq('league_id', leagueId)).count,
  };

  return {
    profileRepairLog,
    baselineSeasonId,
    countsBefore,
    countsAfter,
    rosterCreated,
    playerStatsCreated,
    goalieStatsCreated,
    errors,
  };
}

async function updateAdminNotes(summaryLines) {
  const note = summaryLines.join('\n');
  const { data, error } = await supabase
    .from('league_migration_requests')
    .update({ status: 'scheduled', admin_notes: note })
    .eq('id', requestId)
    .eq('league_id', leagueId)
    .select('id,status,admin_notes')
    .single();
  if (error) throw error;
  return data;
}

(async () => {
  const output = { requestId, leagueId, mode };

  if (mode === 'normalize' || mode === 'all') {
    output.normalize = await normalizeAssets();
  }

  if (mode === 'import' || mode === 'all') {
    output.importBase = await importBaseEntities();
  }

  if (mode === 'repair' || mode === 'all') {
    output.repair = await repairProfilesAndHistoricalStats();
  }

  if (mode === 'notes' || mode === 'all') {
    const importCounts = output.importBase?.countsAfter || {};
    const repairCounts = output.repair?.countsAfter || {};
    output.request = await updateAdminNotes([
      `Nova final Hockey Life migration pass ${new Date().toISOString()}:`,
      '- Executable path uses normalized CSV assets derived from the Hockey Life SQL dumps.',
      `- Base import evidence: teams=${importCounts.teams ?? 'n/a'}, games=${importCounts.games ?? 'n/a'}, team_rosters=${repairCounts.rosters ?? importCounts.team_rosters ?? 'n/a'}.`,
      `- Historical baseline season: ${LEGACY_SEASON_NAME} (${output.repair?.baselineSeasonId || 'n/a'}).`,
      `- Historical stat evidence: player_stats=${repairCounts.playerStats ?? 'n/a'}, goalie_stats=${repairCounts.goalieStats ?? 'n/a'}.`,
      `- Final repair delta: rosters +${output.repair?.rosterCreated ?? 0}, skater baseline +${output.repair?.playerStatsCreated ?? 0}, goalie baseline +${output.repair?.goalieStatsCreated ?? 0}.`,
      `- Profile repair actions: ${output.repair?.profileRepairLog?.map((entry) => `${entry.action}:${entry.profile.full_name}`).join(', ') || 'none'}.`,
      `- Remaining caveat: import is operational and materially advanced, but HL_points still does not provide a perfect 1:1 modern identity map for every historical player row.`,
    ]);
  }

  console.log(JSON.stringify(output, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
