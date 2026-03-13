import { analyzeMigrationAssetBlob, buildNormalizationProfile } from '@/lib/migration/asset-analysis';
import type { MigrationUploadedAsset } from '@/lib/migration/requests';

describe('migration asset analysis', () => {
  it('classifies SQL dumps and detects likely scopes', async () => {
    const sql = `
      CREATE TABLE teams (id uuid primary key, name text);
      CREATE TABLE players (id uuid primary key, team_id uuid, full_name text);
      CREATE TABLE games (id uuid primary key, home_team_id uuid, away_team_id uuid, game_date date);
      INSERT INTO player_stats (id, player_id, goals) VALUES ('1', '2', 10);
    `;

    const blob = new Blob([sql], { type: 'application/sql' });
    const analysis = await analyzeMigrationAssetBlob(blob, 'hlhl-export.sql');

    expect(analysis.source_format).toBe('sql_dump');
    expect(analysis.detected_tables).toEqual(
      expect.arrayContaining(['teams', 'players', 'games', 'player_stats'])
    );
    expect(analysis.detected_scopes).toEqual(
      expect.arrayContaining(['teams', 'players', 'schedule', 'stats_records'])
    );
  });

  it('builds a normalization profile from uploaded assets', () => {
    const assets: MigrationUploadedAsset[] = [
      {
        id: 'asset-1',
        name: 'hlhl-export.sql',
        path: 'league/request/hlhl-export.sql',
        size_bytes: 1024,
        mime_type: 'application/sql',
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'user-1',
        analysis: {
          source_format: 'sql_dump',
          sql_engine: 'postgresql',
          detected_scopes: ['teams', 'players'],
          detected_tables: ['teams', 'players'],
          sample_columns: ['id', 'name'],
          estimated_rows: 4,
          notes: ['Detected PostgreSQL dump.'],
        },
      },
    ];

    const profile = buildNormalizationProfile(assets, ['https://drive.example.com/export'], 'https://oldleague.example.com');

    expect(profile.ready_for_review).toBe(true);
    expect(profile.source_formats).toEqual(['sql_dump']);
    expect(profile.suggested_scope).toEqual(expect.arrayContaining(['teams', 'players']));
    expect(profile.detected_tables).toEqual(expect.arrayContaining(['teams', 'players']));
  });
});
