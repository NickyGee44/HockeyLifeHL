#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filePath) {
  console.log(`\n📋 Running migration: ${path.basename(filePath)}`);
  console.log('═'.repeat(80));

  try {
    // Read the SQL file
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`\n📄 File size: ${sql.length} bytes`);
    console.log(`\n🚀 Executing SQL...`);
    console.log('─'.repeat(80));

    // Execute the SQL using the service role
    // Note: Supabase doesn't have a direct SQL execution endpoint
    // We need to use the RPC function or execute via REST API

    // Split into individual statements and execute
    // This is a workaround since Supabase JS doesn't have direct SQL execution
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      // If exec_sql function doesn't exist, we'll need to use the REST API
      console.log('\n⚠️  RPC function not available, trying REST API...');

      // Use fetch to call the PostgREST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('\n✅ Migration executed successfully!');
      console.log('─'.repeat(80));
      console.log(result);
    } else {
      console.log('\n✅ Migration executed successfully!');
      console.log('─'.repeat(80));
      if (data) console.log(data);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('─'.repeat(80));
    console.error(error.message);
    console.error('\n💡 Note: SQL execution through Supabase JS is limited.');
    console.error('   Please run the migration manually in Supabase SQL Editor.');
    console.error(`\n   File: ${filePath}`);
    process.exit(1);
  }
}

// Main execution
const migrationFile = process.argv[2] || 'supabase/migrations/20260125_migrate_existing_data_to_league_1_FINAL_FIX.sql';
const filePath = path.join(__dirname, migrationFile);

if (!fs.existsSync(filePath)) {
  console.error(`❌ Migration file not found: ${filePath}`);
  process.exit(1);
}

runMigration(filePath)
  .then(() => {
    console.log('\n✅ Done!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
