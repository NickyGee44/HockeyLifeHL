import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntplczcmhvfkijjxavdl.supabase.co';
const supabaseKey = 'REDACTED_SERVICE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking league_memberships table structure...\n');

// Try to get the table structure by querying with limit 0
const { data, error } = await supabase
  .from('league_memberships')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error querying table:', error);
} else {
  console.log('Sample record:', data[0] || 'No records found');
}

// Count total memberships
const { count, error: countError } = await supabase
  .from('league_memberships')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.error('Error counting memberships:', countError);
} else {
  console.log(`\nTotal league memberships: ${count}`);
}

// Try to manually create a membership for the most recent user
const TEST_USER_ID = '1a1586d1-579c-4708-a932-235c1df1da89'; // Nick Daniel Grossi
const PILOT_LEAGUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

console.log(`\n\n🔧 Testing: Create membership for test user...`);
console.log(`   User ID: ${TEST_USER_ID}`);
console.log(`   League ID: ${PILOT_LEAGUE_ID}`);

const { data: insertData, error: insertError } = await supabase
  .from('league_memberships')
  .insert({
    league_id: PILOT_LEAGUE_ID,
    user_id: TEST_USER_ID,
    role: 'player',
    status: 'active',
  })
  .select();

if (insertError) {
  console.error('\n❌ FAILED to create membership:');
  console.error('   Error:', insertError.message);
  console.error('   Code:', insertError.code);
  console.error('   Details:', insertError.details);
  console.error('   Hint:', insertError.hint);

  console.log('\n🔍 This is likely the same error preventing signups from working!');
  console.log('   Common causes:');
  console.log('   1. RLS policies blocking insert');
  console.log('   2. Missing required columns');
  console.log('   3. Foreign key constraints');
  console.log('   4. Permissions issue');
} else {
  console.log('\n✅ SUCCESS! Created membership:', insertData);
}

process.exit(0);
