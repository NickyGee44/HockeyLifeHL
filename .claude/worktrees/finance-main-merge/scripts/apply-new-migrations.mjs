/**
 * Apply new migrations: expand badge types + BLH default sponsor
 *
 * Usage: node scripts/apply-new-migrations.mjs
 *
 * Uses Supabase service role key to apply migrations.
 * ALTER TYPE ... ADD VALUE must run outside a transaction, so we handle
 * enum expansion separately from the function creation.
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

// Connection details
const DB_HOST = 'aws-1-us-east-1.pooler.supabase.com';
const DB_PORT = 6543; // Use session mode port for DDL
const DB_NAME = 'postgres';
const DB_USER = 'postgres.ntplczcmhvfkijjxavdl';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('ERROR: SUPABASE_DB_PASSWORD env var is required.');
  console.error('Usage: SUPABASE_DB_PASSWORD=yourpassword node scripts/apply-new-migrations.mjs');
  process.exit(1);
}

async function connect() {
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

async function applyExpandBadgeTypes(client) {
  console.log('\n=== Migration 1: Expand Badge Types ===\n');

  // Step 1: Add new enum values (each must run outside a transaction)
  const newTypes = [
    'most_assists',
    'best_plus_minus',
    'penalty_free',
    'division_top_scorer',
    'division_points_leader',
    'division_top_goalie',
    'team_mvp',
    'rookie_of_the_year',
    'hall_of_fame',
    'shutout_king',
  ];

  for (const typeName of newTypes) {
    try {
      await client.query(`ALTER TYPE badge_type ADD VALUE IF NOT EXISTS '${typeName}'`);
      console.log(`  Added enum value: ${typeName}`);
    } catch (err) {
      if (err.code === '42710') {
        // Already exists
        console.log(`  [SKIP] ${typeName} already exists`);
      } else {
        throw err;
      }
    }
  }

  // Step 2: Apply the function update (read from migration file, extract just the function)
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260210_expand_badge_types.sql');
  const fullSql = readFileSync(migrationPath, 'utf-8');

  // Extract the CREATE OR REPLACE FUNCTION block
  const funcStart = fullSql.indexOf('CREATE OR REPLACE FUNCTION award_season_badges');
  const funcEnd = fullSql.indexOf('SET search_path = public;', funcStart);

  if (funcStart === -1 || funcEnd === -1) {
    console.log('  WARNING: Could not extract function from migration file. Applying full SQL...');
    // Try full SQL minus the ALTER TYPE lines
    const sqlWithoutAlter = fullSql
      .split('\n')
      .filter((line) => !line.startsWith('ALTER TYPE badge_type'))
      .join('\n');
    await client.query(sqlWithoutAlter);
  } else {
    const functionSql = fullSql.substring(funcStart, funcEnd + 'SET search_path = public;'.length);
    console.log('\n  Updating award_season_badges() function...');
    await client.query(functionSql);
    console.log('  Function updated successfully!');
  }

  // Verify enum values
  const { rows } = await client.query(`
    SELECT enumlabel FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'badge_type')
    ORDER BY enumsortorder
  `);
  console.log(`\n  badge_type enum now has ${rows.length} values:`);
  console.log(`  ${rows.map((r) => r.enumlabel).join(', ')}`);
}

async function applyDefaultBlhSponsor(client) {
  console.log('\n=== Migration 2: Default BLH Sponsor ===\n');

  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260210_default_blh_sponsor.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  await client.query(sql);
  console.log('  BLH sponsor migration applied successfully!');

  // Verify
  const { rows } = await client.query(`
    SELECT COUNT(*) as count FROM league_sponsors WHERE name = 'Beer League Hockey'
  `);
  console.log(`  BLH sponsor inserted for ${rows[0].count} leagues`);
}

async function main() {
  console.log('Connecting to Supabase database...');
  const client = await connect();
  console.log('Connected!');

  try {
    await applyExpandBadgeTypes(client);
    await applyDefaultBlhSponsor(client);

    console.log('\n=== All migrations applied successfully! ===\n');
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
