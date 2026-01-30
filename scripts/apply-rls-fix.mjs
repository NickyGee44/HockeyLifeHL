/**
 * Apply RLS Infinite Recursion Fix
 * Executes SQL directly using node-postgres
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ Missing SUPABASE_DB_URL in .env.local');
  process.exit(1);
}

async function runFix() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('\n🔧 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('📋 Applying RLS fix...\n');

    // Execute the fix in steps
    console.log('  1. Dropping recursive policy...');
    await client.query('DROP POLICY IF EXISTS "Users can view memberships in their leagues" ON league_memberships;');
    console.log('     ✓ Dropped\n');

    console.log('  2. Creating simple non-recursive policy...');
    await client.query(`
      CREATE POLICY "Users can view own memberships"
        ON league_memberships FOR SELECT
        USING (user_id = auth.uid());
    `);
    console.log('     ✓ Created\n');

    console.log('  3. Creating helper function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION get_league_members(check_league_id UUID)
      RETURNS TABLE(
        id UUID,
        user_id UUID,
        league_id UUID,
        role TEXT,
        status TEXT,
        joined_at TIMESTAMPTZ
      )
      SECURITY DEFINER
      SET search_path = ''
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM public.league_memberships
          WHERE league_id = check_league_id
            AND user_id = auth.uid()
            AND status = 'active'
        ) THEN
          RETURN;
        END IF;

        RETURN QUERY
        SELECT
          lm.id,
          lm.user_id,
          lm.league_id,
          lm.role,
          lm.status,
          lm.joined_at
        FROM public.league_memberships lm
        WHERE lm.league_id = check_league_id
        ORDER BY lm.joined_at DESC;
      END;
      $$;
    `);
    console.log('     ✓ Created\n');

    console.log('  4. Granting permissions...');
    await client.query('GRANT EXECUTE ON FUNCTION get_league_members(UUID) TO authenticated;');
    console.log('     ✓ Granted\n');

    console.log('✅ RLS infinite recursion fix applied successfully!\n');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('✨ Next Steps:\n');
    console.log('  1. Try logging in again');
    console.log('  2. Your profile should load without errors');
    console.log('  3. Dashboard should be accessible\n');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n📝 SQL State:', error.code);
    console.error('\n⚠️  If the error persists, run the migration manually:');
    console.error('   File: supabase/migrations/20260129_fix_rls_infinite_recursion.sql\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runFix();
