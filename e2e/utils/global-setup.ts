import { createClient } from '@supabase/supabase-js';
import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global Setup for E2E Tests
 * Runs once before all tests to:
 * 1. Verify Supabase connection
 * 2. Seed test data if needed
 * 3. Create auth directory for session storage
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Running E2E Global Setup...\n');

  // Create auth directory for storing authenticated state
  const authDir = path.join(__dirname, '../.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log('✅ Created .auth directory');
  }

  // Verify environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️  Supabase environment variables not set. Skipping data verification.');
    return;
  }

  // Create Supabase client with service role for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Verify connection
  try {
    const { data, error } = await supabase.from('organizations').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection verified');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    throw error;
  }

  // Clean up test data from previous runs (optional)
  const cleanupTestData = process.env.E2E_CLEANUP_BEFORE === 'true';
  if (cleanupTestData) {
    console.log('🧹 Cleaning up test data from previous runs...');

    // Delete test users (identified by email pattern)
    await supabase
      .from('profiles')
      .delete()
      .like('email', '%+e2e@%');

    console.log('✅ Test data cleanup complete');
  }

  console.log('\n✨ Global setup complete!\n');
}

export default globalSetup;
