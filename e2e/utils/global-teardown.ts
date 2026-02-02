import { createClient } from '@supabase/supabase-js';
import { FullConfig } from '@playwright/test';

/**
 * Global Teardown for E2E Tests
 * Runs once after all tests to clean up test data
 */
async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Running E2E Global Teardown...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Skip cleanup if environment variables not set
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('⚠️  Skipping teardown - Supabase not configured');
    return;
  }

  // Only clean up in CI or when explicitly requested
  const shouldCleanup = process.env.CI || process.env.E2E_CLEANUP_AFTER === 'true';

  if (!shouldCleanup) {
    console.log('ℹ️  Skipping cleanup (set E2E_CLEANUP_AFTER=true to enable)');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Delete test leagues (cascade deletes teams, seasons, etc.)
    const { error: leagueError } = await supabase
      .from('leagues')
      .delete()
      .like('name', 'E2E Test%');

    if (leagueError) {
      console.warn('⚠️  Failed to delete test leagues:', leagueError.message);
    } else {
      console.log('✅ Deleted test leagues');
    }

    // Delete test organizations
    const { error: orgError } = await supabase
      .from('organizations')
      .delete()
      .like('name', 'E2E Test%');

    if (orgError) {
      console.warn('⚠️  Failed to delete test organizations:', orgError.message);
    } else {
      console.log('✅ Deleted test organizations');
    }

    // Delete test users from auth (requires admin API)
    // Note: This requires auth.admin permissions
    // await supabase.auth.admin.deleteUser(testUserId);

    console.log('\n✨ Global teardown complete!\n');
  } catch (error) {
    console.error('❌ Teardown error:', error);
  }
}

export default globalTeardown;
