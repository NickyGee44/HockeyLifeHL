import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntplczcmhvfkijjxavdl.supabase.co';
const supabaseKey = 'REDACTED_SERVICE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

const PILOT_LEAGUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

console.log('Checking for pilot league...');

const { data: league, error } = await supabase
  .from('leagues')
  .select('id, name, slug, status')
  .eq('id', PILOT_LEAGUE_ID)
  .single();

if (error) {
  console.error('❌ ERROR:', error.message);
  console.log('\n🚨 PILOT LEAGUE DOES NOT EXIST!');
  console.log('This will cause ALL new user signups to fail league membership creation.');
  console.log('\nNeed to either:');
  console.log('1. Create the pilot league in the database');
  console.log('2. Update the PILOT_LEAGUE_ID in src/lib/auth/actions.ts');
} else {
  console.log('✅ Pilot league exists:');
  console.log(league);
}

// Also check for any other leagues
console.log('\n\nAll leagues in database:');
const { data: allLeagues, error: allError } = await supabase
  .from('leagues')
  .select('id, name, slug, status')
  .order('created_at', { ascending: false });

if (allError) {
  console.error('Error fetching leagues:', allError);
} else {
  console.log(`Found ${allLeagues.length} leagues:`);
  allLeagues.forEach(l => {
    console.log(`  - ${l.name} (${l.slug}) [${l.status}] - ID: ${l.id}`);
  });
}

process.exit(0);
