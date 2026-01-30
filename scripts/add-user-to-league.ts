/**
 * Add User to League
 *
 * Adds a user to a league with a specified role
 *
 * Usage:
 *   npm run add:user -- <email> <leagueId> <role>
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
const leagueId = process.argv[3];
const role = process.argv[4] || 'owner';

if (!email || !leagueId) {
  console.error('❌ Please provide email and league ID');
  console.log('\nUsage: tsx scripts/add-user-to-league.ts <email> <leagueId> <role>');
  console.log('\nExample:');
  console.log('  tsx scripts/add-user-to-league.ts user@example.com 123e4567-e89b-12d3-a456-426614174000 owner');
  console.log('\nRoles: owner, admin, captain, scorekeeper, player');
  process.exit(1);
}

async function addUserToLeague() {
  console.log(`\n🏒 Adding ${email} to league as ${role}...\n`);

  try {
    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) throw userError;

    const user = users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.email} (${user.id})`);

    // Verify league exists
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, slug')
      .eq('id', leagueId)
      .single();

    if (leagueError || !league) {
      console.error('❌ League not found');
      process.exit(1);
    }

    console.log(`✓ Found league: ${league.name} (${league.slug})`);

    // Check if membership already exists
    const { data: existingMembership } = await supabase
      .from('league_memberships')
      .select()
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .single();

    if (existingMembership) {
      // Update existing membership
      const { error: updateError } = await supabase
        .from('league_memberships')
        .update({ role, status: 'active' })
        .eq('user_id', user.id)
        .eq('league_id', leagueId);

      if (updateError) throw updateError;
      console.log(`✓ Updated existing membership to role: ${role}`);
    } else {
      // Create new membership
      const { error: insertError } = await supabase
        .from('league_memberships')
        .insert({
          league_id: leagueId,
          user_id: user.id,
          role,
          status: 'active',
        });

      if (insertError) throw insertError;
      console.log(`✓ Created new membership with role: ${role}`);
    }

    console.log('\n✅ Successfully added user to league!\n');
    console.log('Next steps:');
    console.log(`  1. Log in as ${email}`);
    console.log('  2. Click the league selector in the header');
    console.log(`  3. You should see "${league.name}" in the dropdown\n`);

  } catch (error) {
    console.error('\n❌ Error adding user to league:', error);
    process.exit(1);
  }
}

addUserToLeague();
