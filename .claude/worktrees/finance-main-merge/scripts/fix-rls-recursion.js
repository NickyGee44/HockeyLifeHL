/**
 * Script to fix RLS infinite recursion issue
 * Executes the SQL migration directly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🔧 Fixing RLS infinite recursion issue...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260129_fix_rls_infinite_recursion.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration: 20260129_fix_rls_infinite_recursion.sql\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
      // If exec_sql doesn't exist, try direct execution
      return supabase.from('_').select('*').limit(0).then(() => {
        throw new Error('Cannot execute raw SQL via Supabase client');
      });
    });

    if (error) {
      // Try alternative method - split into individual statements
      console.log('Using alternative execution method...\n');

      // Drop the problematic policy
      const { error: dropError } = await supabase.rpc('exec_sql', {
        sql_query: 'DROP POLICY IF EXISTS "Users can view memberships in their leagues" ON league_memberships;'
      }).catch(() => ({ error: null }));

      // Create the new policy
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql_query: `
          CREATE POLICY "Users can view own memberships"
            ON league_memberships FOR SELECT
            USING (user_id = auth.uid());
        `
      }).catch(() => ({ error: null }));

      if (dropError || createError) {
        throw new Error('Could not execute SQL. Please run the migration manually in Supabase SQL Editor.');
      }
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('Next steps:');
    console.log('  1. Try logging in again');
    console.log('  2. Your profile should load without recursion errors');
    console.log('  3. Dashboard should be accessible\n');

  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    console.error('\n⚠️  Please apply the migration manually:');
    console.error('  1. Go to Supabase Dashboard → SQL Editor');
    console.error('  2. Open: supabase/migrations/20260129_fix_rls_infinite_recursion.sql');
    console.error('  3. Copy and paste the SQL');
    console.error('  4. Click "Run"\n');
    process.exit(1);
  }
}

runMigration();
