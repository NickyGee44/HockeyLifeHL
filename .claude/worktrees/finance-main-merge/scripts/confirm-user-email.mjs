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
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: node confirm-user-email.mjs <email>');
  console.error('Example: node confirm-user-email.mjs user@example.com');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log(`\n🔍 Looking for user: ${email}\n`);

try {
  // List all users to find the one with matching email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError);
    process.exit(1);
  }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    console.log('\n📋 Recent users:');
    users.slice(0, 5).forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email} ${u.email_confirmed_at ? '✅' : '❌'}`);
    });
    process.exit(1);
  }

  console.log(`✅ Found user:`);
  console.log(`   Email: ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email confirmed: ${user.email_confirmed_at ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   Created: ${user.created_at}`);

  if (user.email_confirmed_at) {
    console.log('\n✅ Email is already confirmed!');
  } else {
    console.log('\n⚙️  Confirming email...');

    // Confirm the email
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('❌ Error confirming email:', updateError);
      process.exit(1);
    }

    console.log('✅ Email confirmed successfully!');
  }

  console.log('\n🔐 You can now log in with:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: (your password)`);

  // Check league memberships
  console.log('\n📋 Checking league memberships...');
  const { data: memberships, error: memberError } = await supabase
    .from('league_memberships')
    .select(`
      league_id,
      role,
      status,
      leagues (
        name
      )
    `)
    .eq('user_id', user.id);

  if (memberError) {
    console.error('⚠️  Could not check memberships:', memberError.message);
  } else if (!memberships || memberships.length === 0) {
    console.log('   ⚠️  No league memberships (free agent)');
    console.log('   📍 User should visit /discover to browse leagues');
  } else {
    console.log(`   ✅ ${memberships.length} membership(s):`);
    memberships.forEach(m => {
      const leagueName = m.leagues?.name || m.league_id;
      console.log(`      - ${leagueName} (${m.role}) [${m.status}]`);
    });
  }

  console.log('\n✨ All done!\n');
  process.exit(0);

} catch (err) {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}
