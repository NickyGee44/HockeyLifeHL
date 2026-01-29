import postgres from 'postgres';

// Connection string from .env.local (URL encoded password)
// Password: REDACTED_PASSWORD -> URL encoded: REDACTED_PASSWORD
const connectionString = 'REDACTED_DB_CONNECTION';

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1
});

console.log('Creating signup helper function...\n');

try {
  const result = await sql`
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
      -- SECURITY: Only allow adding the authenticated user
      IF auth.uid() != p_user_id THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: Can only add authenticated user'::TEXT;
        RETURN;
      END IF;

      -- VALIDATION: Check that league exists and is active
      SELECT EXISTS(
        SELECT 1 FROM leagues
        WHERE id = p_league_id AND status = 'active'
      ) INTO v_league_exists;

      IF NOT v_league_exists THEN
        RETURN QUERY SELECT FALSE, 'League does not exist or is not active'::TEXT;
        RETURN;
      END IF;

      -- VALIDATION: Check valid role
      IF p_role NOT IN ('owner', 'admin', 'captain', 'scorekeeper', 'player') THEN
        RETURN QUERY SELECT FALSE, 'Invalid role specified'::TEXT;
        RETURN;
      END IF;

      -- VALIDATION: Check if membership already exists
      IF EXISTS(
        SELECT 1 FROM league_memberships
        WHERE user_id = p_user_id AND league_id = p_league_id
      ) THEN
        RETURN QUERY SELECT FALSE, 'User is already a member of this league'::TEXT;
        RETURN;
      END IF;

      -- CREATE MEMBERSHIP
      -- This bypasses RLS because function is SECURITY DEFINER
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

      -- Return success
      RETURN QUERY SELECT TRUE, NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
      -- Return error message
      RETURN QUERY SELECT FALSE, SQLERRM;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = '';
  `;

  console.log('✅ Function created successfully!');
  console.log(result);

  // Grant permissions
  await sql`GRANT EXECUTE ON FUNCTION add_user_to_league_on_signup(UUID, UUID, TEXT) TO authenticated`;
  console.log('✅ Permissions granted!');

  // Verify function exists
  const functions = await sql`
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_name = 'add_user_to_league_on_signup'
      AND routine_schema = 'public'
  `;

  console.log('\n✅ Function verified:');
  console.log(functions);

  await sql.end();
  process.exit(0);
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('Full error:', err);
  await sql.end();
  process.exit(1);
}
