import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables');
  process.exit(1);
}

const email = process.argv[2] || 'grossi16n@hotmail.com';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log(`\n🔍 Checking profile for: ${email}\n`);

try {
  // Get user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError);
    process.exit(1);
  }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    process.exit(1);
  }

  console.log('✅ User Auth Record:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Email confirmed: ${user.email_confirmed_at ? '✅ YES' : '❌ NO'}`);
  console.log(`   Created: ${user.created_at}`);
  console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  console.log('\n📋 Profile Data:');
  if (profileError) {
    console.error(`   ❌ Error: ${profileError.message}`);
  } else if (!profile) {
    console.log('   ⚠️  No profile found (this is a problem!)');
  } else {
    console.log(`   Full name: ${profile.full_name || '(not set)'}`);
    console.log(`   Jersey #: ${profile.jersey_number || '(not set)'}`);
    console.log(`   Position: ${profile.position || '(not set)'}`);
    console.log(`   Skill level: ${profile.skill_level || '(not set)'}`);
    console.log(`   Availability: ${profile.availability || '(not set)'}`);
    console.log(`   Phone: ${profile.phone || '(not set)'}`);
    console.log(`   City: ${profile.city || '(not set)'}`);
    console.log(`   Province: ${profile.province || '(not set)'}`);
  }

  // Get league memberships
  const { data: memberships, error: memberError } = await supabase
    .from('league_memberships')
    .select(`
      id,
      league_id,
      role,
      status,
      leagues (
        id,
        name,
        slug,
        status
      )
    `)
    .eq('user_id', user.id);

  console.log('\n🏒 League Memberships:');
  if (memberError) {
    console.error(`   ❌ Error: ${memberError.message}`);
  } else if (!memberships || memberships.length === 0) {
    console.log('   ⚠️  No league memberships');
    console.log('   📍 User is a FREE AGENT (expected with new system)');
    console.log('   👉 User should visit /discover to browse leagues');
  } else {
    console.log(`   ✅ Found ${memberships.length} membership(s):\n`);
    memberships.forEach((m, i) => {
      console.log(`   ${i + 1}. League: ${m.leagues?.name || '(unknown)'}`);
      console.log(`      Slug: ${m.leagues?.slug || '(unknown)'}`);
      console.log(`      Role: ${m.role}`);
      console.log(`      Status: ${m.status}`);
      console.log(`      League Status: ${m.leagues?.status || '(unknown)'}`);
      console.log();
    });
  }

  console.log('✨ Check complete!\n');
  process.exit(0);

} catch (err) {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}
