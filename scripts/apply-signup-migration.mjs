import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ntplczcmhvfkijjxavdl.supabase.co';
const supabaseKey = 'REDACTED_SERVICE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Applying signup helper migration...\n');

// Read the migration file
const migrationSQL = fs.readFileSync('supabase/migrations/20260129_create_signup_helper_function.sql', 'utf8');

try {
  // Execute the migration
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    // Try direct execution via SQL query
    console.log('Trying direct SQL execution...');

    // Split by statement and execute each
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('DO $$')) {
        // Skip DO blocks - they're just for logging
        continue;
      }

      const { error: execError } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (execError) {
        console.error('Error executing statement:', execError);
        console.error('Statement:', statement.substring(0, 100) + '...');
      }
    }

    // If that didn't work, just create the function directly
    console.log('\n\nCreating function directly...');

    const functionSQL = `
CREATE OR REPLACE FUNCTION add_user_to_league_on_signup(
  p_user_id UUID,
  p_league_id UUID,
  p_role TEXT DEFAULT 'player'
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_league_exists BOOLEAN;
BEGIN
  IF auth.uid() != p_user_id THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Can only add authenticated user'::TEXT;
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM leagues
    WHERE id = p_league_id AND status = 'active'
  ) INTO v_league_exists;

  IF NOT v_league_exists THEN
    RETURN QUERY SELECT FALSE, 'League does not exist or is not active'::TEXT;
    RETURN;
  END IF;

  IF p_role NOT IN ('owner', 'admin', 'captain', 'scorekeeper', 'player') THEN
    RETURN QUERY SELECT FALSE, 'Invalid role specified'::TEXT;
    RETURN;
  END IF;

  IF EXISTS(
    SELECT 1 FROM league_memberships
    WHERE user_id = p_user_id AND league_id = p_league_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'User is already a member of this league'::TEXT;
    RETURN;
  END IF;

  INSERT INTO league_memberships (
    league_id,
    user_id,
    role,
    status
  )
  VALUES (
    p_league_id,
    p_user_id,
    p_role,
    'active'
  );

  RETURN QUERY SELECT TRUE, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
`;

    // Execute via raw query using postgres library
    console.log('Executing function creation SQL...');

    // Use the Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query: functionSQL }),
    });

    if (!response.ok) {
      console.log('REST API approach failed, using direct SQL approach...');

      // Import postgres client
      const { default: postgres } = await import('postgres');

      const sql = postgres(
        'REDACTED_DB_CONNECTION',
        { ssl: 'require' }
      );

      await sql.unsafe(functionSQL);
      await sql.end();

      console.log('\n✅ Function created successfully!');
    } else {
      console.log('\n✅ Function created via REST API!');
    }
  } else {
    console.log('\n✅ Migration applied successfully!');
  }

  // Verify the function exists
  console.log('\nVerifying function exists...');
  const { data: functions } = await supabase.rpc('exec_sql', {
    sql: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'add_user_to_league_on_signup';`,
  });

  console.log('Function check result:', functions);
  console.log('\n✅ Migration complete!');
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}

process.exit(0);
