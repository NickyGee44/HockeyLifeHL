import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { parseSqlDumpInserts } from '../apps/league-builder/src/lib/migration/parse-source';
import { buildMigrationImportMappingEntry } from '../apps/league-builder/src/lib/migration/import-mapping';
import { buildNormalizationProfile } from '../apps/league-builder/src/lib/migration/asset-analysis';
import { normalizeLeagueMigrationRequest, type MigrationUploadedAsset } from '../apps/league-builder/src/lib/migration/requests';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const requestId = 'dc0d9ce4-82ef-40e2-8390-1f66293d7033';
const leagueId = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const basePath = `${leagueId}/${requestId}`;

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  return lines.join('\n');
}

async function downloadText(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('league-migration-assets').download(path);
  if (error || !data) throw new Error(`download failed for ${path}: ${error?.message}`);
  return await data.text();
}

async function main() {
  const { data: existingRow, error: existingError } = await supabase
    .from('league_migration_requests')
    .select('*')
    .eq('id', requestId)
    .eq('league_id', leagueId)
    .single();
  if (existingError || !existingRow) throw existingError ?? new Error('request not found');

  const request = normalizeLeagueMigrationRequest(existingRow as Record<string, unknown>);
  const assetByName = new Map(request.uploaded_assets.map((a) => [a.name, a]));

  const arenas = parseSqlDumpInserts(await downloadText(assetByName.get('HL_arenas.sql')!.path), 'HL_arenas');
  const teams = parseSqlDumpInserts(await downloadText(assetByName.get('HL_teams.sql')!.path), 'HL_teams');
  const games = parseSqlDumpInserts(await downloadText(assetByName.get('HL_games.sql')!.path), 'HL_games');
  const players = parseSqlDumpInserts(await downloadText(assetByName.get('HL_players.sql')!.path), 'HL_players');

  const arenaNameById = new Map(arenas.map((r) => [String(r.HLarenaID), String(r.arenaName || '')]));
  const teamNameById = new Map(teams.map((r) => [String(r.HLteamID), String(r.teamName || '')]));

  const normalizedTeams = teams.map((r) => ({
    legacy_team_id: String(r.HLteamID || ''),
    legacy_season_id: String(r.HLseasonID || ''),
    team_name: String(r.teamName || '').trim(),
    team_abbr: String(r.teamAbbr || '').trim(),
  })).filter((r) => r.team_name);

  const normalizedPlayers = players.map((r) => ({
    legacy_player_id: String(r.HLplayerID || ''),
    first_name: String(r.firstName || '').trim(),
    last_name: String(r.lastName || '').trim(),
    full_name: `${String(r.firstName || '').trim()} ${String(r.lastName || '').trim()}`.trim(),
  })).filter((r) => r.full_name);

  const normalizedGames = games.map((r) => {
    const dt = String(r.dateandtime || '').trim();
    const [game_date, timePart = ''] = dt.split(' ');
    const start_time = timePart ? timePart.slice(0,5) : '';
    return {
      legacy_game_id: String(r.HLgameID || ''),
      legacy_season_id: String(r.HLseasonID || ''),
      legacy_arena_id: String(r.HLarenaID || ''),
      home_team: teamNameById.get(String(r.team1 || '')) || '',
      away_team: teamNameById.get(String(r.team2 || '')) || '',
      game_date,
      start_time,
      venue_name: arenaNameById.get(String(r.HLarenaID || '')) || '',
      home_score: String(r.score1 || '').trim(),
      away_score: String(r.score2 || '').trim(),
      event_name: String(r.eventWhat || '').trim(),
    };
  }).filter((r) => r.home_team && r.away_team && r.game_date);

  const generatedAt = Date.now();
  const newAssets: MigrationUploadedAsset[] = [];

  const uploadSpec = [
    {
      name: 'HL_teams.normalized.csv',
      rows: normalizedTeams,
      scope: 'teams' as const,
      target: 'teams' as const,
      sourceObject: 'HL_teams_normalized',
      note: 'Generated from HL_teams.sql for executable migration import.',
      fieldMappings: [
        { source_field: 'team_name', target_field: 'team_name', required: true, confidence: 'confirmed' as const },
        { source_field: 'team_abbr', target_field: null, required: false, confidence: 'confirmed' as const },
      ],
      importMode: 'merge_upsert' as const,
    },
    {
      name: 'HL_players.normalized.csv',
      rows: normalizedPlayers,
      scope: 'players' as const,
      target: 'players' as const,
      sourceObject: 'HL_players_normalized',
      note: 'Generated from HL_players.sql with full_name synthesis for executable migration import.',
      fieldMappings: [
        { source_field: 'first_name', target_field: 'first_name', required: false, confidence: 'confirmed' as const },
        { source_field: 'last_name', target_field: 'last_name', required: false, confidence: 'confirmed' as const },
        { source_field: 'full_name', target_field: 'full_name', required: true, confidence: 'confirmed' as const },
      ],
      importMode: 'merge_upsert' as const,
    },
    {
      name: 'HL_games.normalized.csv',
      rows: normalizedGames,
      scope: 'schedule' as const,
      target: 'schedule_games' as const,
      sourceObject: 'HL_games_normalized',
      note: 'Generated from HL_games.sql + HL_teams.sql + HL_arenas.sql with team/arena IDs resolved to names.',
      fieldMappings: [
        { source_field: 'home_team', target_field: 'home_team', required: true, confidence: 'confirmed' as const },
        { source_field: 'away_team', target_field: 'away_team', required: true, confidence: 'confirmed' as const },
        { source_field: 'game_date', target_field: 'game_date', required: true, confidence: 'confirmed' as const },
        { source_field: 'start_time', target_field: 'start_time', required: true, confidence: 'confirmed' as const },
        { source_field: 'venue_name', target_field: 'venue_name', required: false, confidence: 'confirmed' as const },
        { source_field: 'home_score', target_field: 'home_score', required: false, confidence: 'confirmed' as const },
        { source_field: 'away_score', target_field: 'away_score', required: false, confidence: 'confirmed' as const },
      ],
      importMode: 'append_only' as const,
    },
  ];

  for (const spec of uploadSpec) {
    const content = toCsv(spec.rows);
    const path = `${basePath}/${generatedAt}-${spec.name.toLowerCase()}`;
    const { error: uploadError } = await supabase.storage
      .from('league-migration-assets')
      .upload(path, new Blob([content], { type: 'text/csv' }), { upsert: true, contentType: 'text/csv' });
    if (uploadError) throw uploadError;

    newAssets.push({
      id: randomUUID(),
      name: spec.name,
      path,
      size_bytes: Buffer.byteLength(content, 'utf8'),
      mime_type: 'text/csv',
      uploaded_at: new Date().toISOString(),
      uploaded_by: request.requested_by,
      note: spec.note,
      analysis: {
        source_format: 'csv_export',
        sql_engine: null,
        detected_scopes: [spec.scope],
        detected_tables: [spec.sourceObject],
        sample_columns: spec.rows.length ? Object.keys(spec.rows[0]) : spec.fieldMappings.map((m) => m.source_field),
        estimated_rows: spec.rows.length,
        notes: [spec.note],
      },
    });
  }

  const mergedAssets = [...request.uploaded_assets, ...newAssets];
  const existingMappings = request.normalization_profile?.import_mappings ?? [];
  const newMappings = newAssets.map((asset) => {
    const spec = uploadSpec.find((s) => s.name === asset.name)!;
    return buildMigrationImportMappingEntry(asset, {
      scope: spec.scope,
      target_entity: spec.target,
      source_object: spec.sourceObject,
      import_mode: spec.importMode,
      field_mappings: spec.fieldMappings,
      notes: [spec.note],
    }, null);
  });

  const normalizationProfile = buildNormalizationProfile(
    mergedAssets,
    request.asset_links,
    request.source_url,
    {
      ...(request.normalization_profile ?? {
        source_formats: [], suggested_scope: [], detected_tables: [], notes: [], ready_for_review: false, import_mappings: [], import_ready_scopes: [], import_blockers: [],
      }),
      import_mappings: [...existingMappings, ...newMappings],
    }
  );

  const { error: updateError } = await supabase
    .from('league_migration_requests')
    .update({ uploaded_assets: mergedAssets as any, normalization_profile: normalizationProfile as any })
    .eq('id', requestId)
    .eq('league_id', leagueId);
  if (updateError) throw updateError;

  console.log(JSON.stringify({
    createdAssets: newAssets.map(a => ({ id: a.id, name: a.name, path: a.path, rows: a.analysis.estimated_rows })),
    readyMappings: newMappings.map(m => ({ asset_id: m.asset_id, target: m.target_entity, ready: m.ready_for_import, blockers: m.blockers })),
  }, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
