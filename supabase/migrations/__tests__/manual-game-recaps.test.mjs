import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('forward migration removes automatic game recap database hooks', () => {
  const migrationsDirectory = path.resolve(
    process.cwd(),
    'supabase/migrations',
  );
  const migrationName = fs
    .readdirSync(migrationsDirectory)
    .find((name) =>
      name > '20260820234500'
      && name.endsWith('_disable_auto_game_recaps.sql')
    );

  assert.ok(migrationName, 'expected a forward disable_auto_game_recaps migration');
  const sql = fs.readFileSync(path.join(migrationsDirectory, migrationName), 'utf8');

  assert.match(sql, /BEGIN;/);
  assert.match(sql, /SET LOCAL lock_timeout = '5s';/);
  assert.match(sql, /SET LOCAL statement_timeout = '30s';/);
  assert.match(
    sql,
    /DROP TRIGGER IF EXISTS trigger_auto_generate_game_recap ON public\.games;/,
  );
  assert.match(
    sql,
    /DROP FUNCTION IF EXISTS public\.auto_generate_game_recap\(\);/,
  );
  assert.match(sql, /COMMIT;/);
});
