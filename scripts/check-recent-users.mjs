import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking recent user signups...\n');

// Get recent profiles
const { data: profiles, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (profileError) {
  console.error('Error fetching profiles:', profileError);
} else {
  console.log(`Found ${profiles.length} recent profiles:\n`);

  for (const profile of profiles) {
    console.log(`\n👤 ${profile.full_name || 'No name'} (${profile.email || 'No email'})`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Created: ${profile.created_at}`);
    console.log(`   Role: ${profile.role || 'none'}`);

    // Check their league memberships
    const { data: memberships, error: memberError } = await supabase
      .from('league_memberships')
      .select(`
        league_id,
        role,
        status,
        league:leagues(name, slug)
      `)
      .eq('user_id', profile.id);

    if (memberError) {
      console.log(`   ❌ Error fetching memberships: ${memberError.message}`);
    } else if (memberships.length === 0) {
      console.log(`   ⚠️  NO LEAGUE MEMBERSHIPS - User can't access any leagues!`);
    } else {
      console.log(`   ✅ League memberships (${memberships.length}):`);
      memberships.forEach(m => {
        console.log(`      - ${m.league?.name || m.league_id} (${m.role}) [${m.status}]`);
      });
    }
  }
}

// Check auth.users table via Supabase Admin API to see confirmed vs unconfirmed
console.log('\n\n📧 Checking email confirmation status...');
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

if (authError) {
  console.error('Error fetching auth users:', authError);
} else {
  console.log(`\nFound ${authUsers.users.length} total auth users`);

  const confirmed = authUsers.users.filter(u => u.email_confirmed_at).length;
  const unconfirmed = authUsers.users.filter(u => !u.email_confirmed_at).length;

  console.log(`  ✅ Email confirmed: ${confirmed}`);
  console.log(`  ⏳ Email NOT confirmed: ${unconfirmed}`);

  if (unconfirmed > 0) {
    console.log('\n  Users with unconfirmed emails:');
    authUsers.users
      .filter(u => !u.email_confirmed_at)
      .slice(0, 5)
      .forEach(u => {
        console.log(`    - ${u.email} (created ${new Date(u.created_at).toLocaleDateString()})`);
      });
  }
}

process.exit(0);
