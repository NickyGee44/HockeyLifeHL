import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local file
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Usage: node manually-confirm-email.mjs <email>');
  console.error('Example: node manually-confirm-email.mjs user@example.com');
  process.exit(1);
}

console.log(`\nManually confirming email for: ${email}\n`);

try {
  // Get the user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    console.log('\nAvailable users:');
    users.users.slice(0, 5).forEach(u => {
      console.log(`  - ${u.email} (${u.email_confirmed_at ? 'confirmed' : 'NOT confirmed'})`);
    });
    process.exit(1);
  }

  console.log(`Found user: ${user.email}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Email confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`);
  console.log(`Created: ${user.created_at}`);

  if (user.email_confirmed_at) {
    console.log('\n✅ Email is already confirmed!');
    console.log('You should be able to log in now.');
  } else {
    console.log('\n⚙️  Confirming email...');

    // Update user to confirm email
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('❌ Error confirming email:', updateError);
      process.exit(1);
    }

    console.log('✅ Email confirmed successfully!');
    console.log('\nYou can now log in with:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: (your password)`);
  }

  // Check if user has league memberships
  console.log('\n📋 Checking league memberships...');
  const { data: memberships, error: memberError } = await supabase
    .from('league_memberships')
    .select('league_id, role, status, league:leagues(name)')
    .eq('user_id', user.id);

  if (memberError) {
    console.error('Error checking memberships:', memberError);
  } else if (memberships.length === 0) {
    console.log('⚠️  User has NO league memberships (free agent)');
    console.log('   This is expected with the new free agent system.');
    console.log('   User should browse leagues at /discover and request to join.');
  } else {
    console.log(`✅ User has ${memberships.length} league membership(s):`);
    memberships.forEach(m => {
      console.log(`   - ${m.league?.name || m.league_id} (${m.role}) [${m.status}]`);
    });
  }

  console.log('\n✨ All done!');

} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}

process.exit(0);
