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

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n📋 Listing all users...\n');

try {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError);
    process.exit(1);
  }

  console.log(`Found ${users.length} total user(s):\n`);

  // Sort by created_at descending (most recent first)
  const sortedUsers = users.sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  sortedUsers.forEach((user, index) => {
    const confirmed = user.email_confirmed_at ? '✅' : '❌';
    const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never';

    console.log(`${index + 1}. ${confirmed} ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log(`   Last sign in: ${lastSignIn}`);
    console.log();
  });

  // Summary stats
  const unconfirmedCount = users.filter(u => !u.email_confirmed_at).length;
  const confirmedCount = users.filter(u => u.email_confirmed_at).length;

  console.log('📊 Summary:');
  console.log(`   Total users: ${users.length}`);
  console.log(`   Confirmed: ${confirmedCount} ✅`);
  console.log(`   Unconfirmed: ${unconfirmedCount} ❌`);

  if (unconfirmedCount > 0) {
    console.log('\n💡 To confirm an email, run:');
    console.log('   node scripts/confirm-user-email.mjs <email>');
  }

  console.log();
  process.exit(0);

} catch (err) {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}
