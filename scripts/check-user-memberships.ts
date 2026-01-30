/**
 * Check User League Memberships
 *
 * Verifies what leagues a user belongs to
 *
 * Usage:
 *   npm run check:memberships -- <email>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('\nUsage: npm run check:memberships -- <email>');
  process.exit(1);
}

async function checkMemberships() {
  console.log(`\n🔍 Checking memberships for: ${email}\n`);

  try {
    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) throw userError;

    const user = users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Created: ${new Date(user.created_at).toLocaleString()}\n`);

    // Check league memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('league_memberships')
      .select(`
        id,
        league_id,
        role,
        status,
        league:leagues (
          id,
          name,
          slug,
          subdomain
        )
      `)
      .eq('user_id', user.id);

    if (membershipError) {
      console.error('❌ Error fetching memberships:', membershipError);
      process.exit(1);
    }

    if (!memberships || memberships.length === 0) {
      console.log('❌ No league memberships found for this user\n');
      console.log('This user is not a member of any leagues.');
      console.log('\nTo add them to a league, run:');
      console.log(`  npm run add:user -- ${email} <leagueId> <role>\n`);
      process.exit(0);
    }

    console.log(`✅ Found ${memberships.length} league membership(s):\n`);

    memberships.forEach((membership: any, index: number) => {
      console.log(`${index + 1}. ${membership.league.name} (${membership.league.slug})`);
      console.log(`   Role: ${membership.role}`);
      console.log(`   Status: ${membership.status}`);
      console.log(`   League ID: ${membership.league_id}`);
      console.log(`   Membership ID: ${membership.id}`);
      if (membership.league.subdomain) {
        console.log(`   URL: https://${membership.league.subdomain}.beerleaguehockey.ca`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ Error checking memberships:', error);
    process.exit(1);
  }
}

checkMemberships();
