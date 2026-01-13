/**
 * Create Test Players Script
 * 
 * This script creates 91 test players (7 teams × 13 players) using Supabase Admin API.
 * 
 * Usage:
 * 1. Set SUPABASE_SERVICE_ROLE_KEY in .env.local
 * 2. Run: npx tsx scripts/create-test-players.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    const lines = envFile.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          process.env[key.trim()] = cleanValue;
        }
      }
    }
  }
}

// Load .env.local
loadEnvFile();

// Initialize Supabase Admin client (needs service role key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('');
  console.error('Required variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please check your .env.local file in the project root.');
  console.error('');
  console.error('To get your service role key:');
  console.error('  1. Go to Supabase Dashboard');
  console.error('  2. Settings → API');
  console.error('  3. Copy "service_role" key (keep this secret!)');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`   Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   Service Key: ${supabaseServiceKey.substring(0, 20)}...`);
console.log('');

// Create admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Generate test player names
const firstNames = [
  "Alex", "Brad", "Chris", "David", "Eric", "Frank", "Greg", "Henry", "Ian", "Jack",
  "Kevin", "Liam", "Mike", "Nick", "Owen", "Paul", "Quinn", "Ryan", "Sam", "Tom",
  "Adam", "Blake", "Cameron", "Drew", "Evan", "Finn", "Gabe", "Hugo", "Ivan", "Jake",
  "Kyle", "Luke", "Max", "Noah", "Oscar", "Pete", "Quinn", "Rex", "Seth", "Troy",
  "Vince", "Wade", "Xavier", "Yuki", "Zach", "Ben", "Cole", "Dane", "Eli", "Gus",
  "Hank", "Ike", "Jax", "Kai", "Leo", "Moe", "Ned", "Ollie", "Pat", "Ray",
  "Sean", "Tad", "Uri", "Vic", "Wes", "Xavi", "Yan", "Zane", "Ace", "Bo",
  "Cal", "Dan", "Eli", "Fox", "Guy", "Hal", "Ira", "Jay", "Ken", "Lou",
  "Mac", "Ned", "Otis", "Pax", "Quin", "Rob", "Sol", "Ted", "Udo", "Van",
  "Walt", "Xan", "Yor", "Zed"
];

const lastNames = [
  "Johnson", "Smith", "Wilson", "Brown", "Davis", "Miller", "Taylor", "White", "Moore", "Anderson",
  "Lee", "Harris", "Clark", "Lewis", "Walker", "Hall", "Young", "King", "Wright", "Green",
  "Garcia", "Lopez", "Perez", "Sanchez", "Torres", "Ramirez", "Flores", "Rivera", "Gomez", "Diaz",
  "Morales", "Ortiz", "Vargas", "Castro", "Ruiz", "Mendoza", "Herrera", "Jimenez", "Moreno", "Castillo",
  "Romero", "Salazar", "Martinez", "Rodriguez", "Gonzalez", "Williams", "Jones", "Thomas", "Jackson", "Martin",
  "Thompson", "Robinson", "Mitchell", "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris",
  "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera", "Cooper", "Richardson",
  "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray", "Ramirez", "James", "Watson", "Brooks",
  "Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes", "Ross", "Henderson", "Coleman", "Jenkins",
  "Perry", "Powell", "Long", "Patterson", "Hughes", "Flores", "Washington", "Butler", "Simmons", "Foster"
];

// Generate unique player data
function generatePlayerData(index: number) {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const email = `player${index + 1}@hockeylifehl.test`;
  const password = `TestPlayer${index + 1}!`; // Simple password for testing
  
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email,
    password,
  };
}

async function createTestPlayers() {
  console.log('Starting test player creation...\n');
  console.log('This will create 91 players (7 teams × 13 players)\n');

  const playersToCreate = 91;
  const createdPlayers: Array<{ id: string; email: string; name: string }> = [];
  const failedPlayers: Array<{ email: string; error: string }> = [];

  for (let i = 0; i < playersToCreate; i++) {
    const playerData = generatePlayerData(i);
    
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: playerData.email,
        password: playerData.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: playerData.fullName,
        },
      });

      if (authError || !authData.user) {
        console.error(`Failed to create auth user ${playerData.email}:`, authError?.message);
        failedPlayers.push({ email: playerData.email, error: authError?.message || 'Unknown error' });
        continue;
      }

      // Create profile (trigger should create it, but let's ensure it exists)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: createProfileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: playerData.email,
            full_name: playerData.fullName,
            role: 'player',
          });

        if (createProfileError) {
          console.error(`Failed to create profile for ${playerData.email}:`, createProfileError.message);
          // Delete auth user if profile creation failed
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          failedPlayers.push({ email: playerData.email, error: createProfileError.message });
          continue;
        }
      }

      createdPlayers.push({
        id: authData.user.id,
        email: playerData.email,
        name: playerData.fullName,
      });

      if ((i + 1) % 10 === 0) {
        console.log(`Created ${i + 1}/${playersToCreate} players...`);
      }
    } catch (error: any) {
      console.error(`Error creating player ${playerData.email}:`, error.message);
      failedPlayers.push({ email: playerData.email, error: error.message });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Successfully created ${createdPlayers.length} players`);
  
  if (failedPlayers.length > 0) {
    console.log(`\n❌ Failed to create ${failedPlayers.length} players:`);
    failedPlayers.forEach(p => {
      console.log(`  - ${p.email}: ${p.error}`);
    });
  }

  console.log('\n📋 Player Credentials:');
  console.log('All players use the pattern:');
  console.log('  Email: player{N}@hockeylifehl.test (where N is 1-91)');
  console.log('  Password: TestPlayer{N}! (where N is 1-91)');
  console.log('\nExample:');
  console.log('  Email: player1@hockeylifehl.test');
  console.log('  Password: TestPlayer1!');
  console.log('\nNext steps:');
  console.log('1. Run the test data generator from /admin dashboard');
  console.log('2. Players will be assigned to teams automatically');
  console.log('3. All players will be approved and opted in');

  return {
    success: true,
    created: createdPlayers.length,
    failed: failedPlayers.length,
    players: createdPlayers,
  };
}

// Run the script
createTestPlayers()
  .then((result) => {
    if (result.success) {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Script completed with errors');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
