/**
 * Check Legacy Import Status
 * 
 * This script checks what was imported and helps debug issues
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkImport() {
  console.log('🔍 Checking legacy players import...\n');

  // Get all legacy players
  const { data: allLegacy, error: allError } = await supabase
    .from('legacy_players')
    .select('first_name, last_name, is_goalie, games_played, goals, assists, points')
    .order('last_name');

  if (allError) {
    console.error('❌ Error fetching legacy players:', allError);
    return;
  }

  const players = allLegacy?.filter(p => !p.is_goalie) || [];
  const goalies = allLegacy?.filter(p => p.is_goalie) || [];

  console.log(`📊 Total legacy records: ${allLegacy?.length || 0}`);
  console.log(`⛸️  Players (non-goalies): ${players.length}`);
  console.log(`🥅 Goalies: ${goalies.length}\n`);

  // Check players with stats
  const playersWithStats = players.filter(p => p.games_played > 0 || p.goals > 0 || p.assists > 0);
  const goaliesWithStats = goalies.filter(g => g.games_played > 0);

  console.log(`✅ Players with stats: ${playersWithStats.length}`);
  console.log(`✅ Goalies with stats: ${goaliesWithStats.length}\n`);

  // Show sample players
  if (players.length > 0) {
    console.log('📋 Sample players (first 10):');
    players.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.first_name} ${p.last_name} - GP: ${p.games_played}, G: ${p.goals}, A: ${p.assists}, P: ${p.points}`);
    });
  } else {
    console.log('⚠️  No players found! This might be the issue.');
  }

  // Check for players with zero stats (might indicate parsing issue)
  const playersWithZeroStats = players.filter(p => 
    p.games_played === 0 && p.goals === 0 && p.assists === 0 && p.points === 0
  );

  if (playersWithZeroStats.length > 0) {
    console.log(`\n⚠️  Found ${playersWithZeroStats.length} players with zero stats (might be parsing issue)`);
    console.log('Sample zero-stat players:');
    playersWithZeroStats.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.first_name} ${p.last_name}`);
    });
  }

  // Check the view
  console.log('\n🔍 Checking player_career_stats view...');
  const { data: careerStats, error: viewError } = await supabase
    .from('player_career_stats')
    .select('full_name, total_games_played, total_goals, total_assists, total_points')
    .gt('total_games_played', 0)
    .order('total_points', { ascending: false })
    .limit(10);

  if (viewError) {
    console.error('❌ Error fetching career stats:', viewError);
  } else {
    console.log(`✅ Career stats view has ${careerStats?.length || 0} players with games played`);
    if (careerStats && careerStats.length > 0) {
      console.log('\nTop 5 by points:');
      careerStats.slice(0, 5).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.full_name} - GP: ${p.total_games_played}, PTS: ${p.total_points}`);
      });
    }
  }
}

checkImport().catch(console.error);
