/**
 * Import Legacy Player Stats from Excel Files
 * 
 * This script parses Excel files containing historical player and goalie stats
 * and imports them into the legacy_players table.
 * 
 * Usage:
 * 1. Place Excel files in the project root:
 *    - HockeyLifeHL_AllTimePlayerStats_seasonid_ap.xlsx
 *    - HockeyLifeHL_AllTimeGoalieStats_seasonid_ag.xlsx
 * 2. Run: npx tsx scripts/import-excel-legacy-stats.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LegacyPlayer {
  firstName: string;
  lastName: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  pointsPerGame: number;
  wins: number;
  ties: number;
  winPercentage: number;
  mooseheadCupWins: number;
  // Goalie stats
  isGoalie: boolean;
  goalsAgainst: number;
  saves: number;
  shutouts: number;
  goalsAgainstAverage: number;
  savePercentage: number;
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parsePlayerStats(filePath: string): Map<string, LegacyPlayer> {
  console.log(`\n📊 Reading player stats from: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return new Map();
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

  const players = new Map<string, LegacyPlayer>();

  console.log(`Found ${data.length} rows in player stats sheet`);

  for (const row of data as any[]) {
    // Try to find name column (could be "Name", "Player", "Full Name", etc.)
    let name = row['Name'] || row['Player'] || row['Full Name'] || row['Player Name'] || '';
    
    // If no name found, try first column
    if (!name) {
      const firstKey = Object.keys(row)[0];
      name = row[firstKey] || '';
    }

    if (!name || typeof name !== 'string') continue;

    // Clean name
    const cleanName = name.trim();
    if (!cleanName) continue;

    // Split name (format could be "Last, First" or "First Last")
    let firstName = '';
    let lastName = '';
    
    if (cleanName.includes(',')) {
      const parts = cleanName.split(',').map(p => p.trim());
      lastName = parts[0] || '';
      firstName = parts.slice(1).join(' ').trim();
    } else {
      const parts = cleanName.split(/\s+/);
      if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      } else {
        lastName = cleanName;
      }
    }

    if (!firstName && !lastName) continue;

    const key = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
    
    // Parse stats
    const gamesPlayed = parseNumber(row['GP'] || row['Games'] || row['Games Played'] || 0);
    const goals = parseNumber(row['G'] || row['Goals'] || 0);
    const assists = parseNumber(row['A'] || row['Assists'] || 0);
    const points = parseNumber(row['P'] || row['Pts'] || row['Points'] || goals + assists);
    const pointsPerGame = parseNumber(row['PPG'] || row['Pts/GP'] || row['Points/Game'] || (gamesPlayed > 0 ? points / gamesPlayed : 0));
    const wins = parseNumber(row['W'] || row['Wins'] || 0);
    const ties = parseNumber(row['T'] || row['Ties'] || 0);
    const winPercentage = parseNumber(row['Win%'] || row['Win Percentage'] || row['W%'] || 0);
    const mooseheadCupWins = parseNumber(row['Cup Wins'] || row['Moosehead Cup'] || 0);

    const player: LegacyPlayer = {
      firstName,
      lastName,
      gamesPlayed: Math.round(gamesPlayed),
      goals: Math.round(goals),
      assists: Math.round(assists),
      points: Math.round(points),
      pointsPerGame: Math.round(pointsPerGame * 100) / 100,
      wins: Math.round(wins),
      ties: Math.round(ties),
      winPercentage: Math.round(winPercentage * 100) / 100,
      mooseheadCupWins: Math.round(mooseheadCupWins),
      isGoalie: false,
      goalsAgainst: 0,
      saves: 0,
      shutouts: 0,
      goalsAgainstAverage: 0,
      savePercentage: 0,
    };

    // If player already exists (from goalie stats), merge
    if (players.has(key)) {
      const existing = players.get(key)!;
      existing.gamesPlayed = Math.max(existing.gamesPlayed, player.gamesPlayed);
      existing.goals = Math.max(existing.goals, player.goals);
      existing.assists = Math.max(existing.assists, player.assists);
      existing.points = Math.max(existing.points, player.points);
      existing.wins = Math.max(existing.wins, player.wins);
      existing.ties = Math.max(existing.ties, player.ties);
      existing.mooseheadCupWins = Math.max(existing.mooseheadCupWins, player.mooseheadCupWins);
    } else {
      players.set(key, player);
    }
  }

  console.log(`✅ Parsed ${players.size} unique players`);
  return players;
}

function parseGoalieStats(filePath: string): Map<string, LegacyPlayer> {
  console.log(`\n🥅 Reading goalie stats from: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return new Map();
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

  const goalies = new Map<string, LegacyPlayer>();

  console.log(`Found ${data.length} rows in goalie stats sheet`);

  for (const row of data as any[]) {
    // Try to find name column
    let name = row['Name'] || row['Player'] || row['Goalie'] || row['Full Name'] || row['Player Name'] || '';
    
    // If no name found, try first column
    if (!name) {
      const firstKey = Object.keys(row)[0];
      name = row[firstKey] || '';
    }

    if (!name || typeof name !== 'string') continue;

    // Clean name
    const cleanName = name.trim();
    if (!cleanName) continue;

    // Split name
    let firstName = '';
    let lastName = '';
    
    if (cleanName.includes(',')) {
      const parts = cleanName.split(',').map(p => p.trim());
      lastName = parts[0] || '';
      firstName = parts.slice(1).join(' ').trim();
    } else {
      const parts = cleanName.split(/\s+/);
      if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      } else {
        lastName = cleanName;
      }
    }

    if (!firstName && !lastName) continue;

    const key = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
    
    // Parse goalie stats
    const gamesPlayed = parseNumber(row['GP'] || row['Games'] || row['Games Played'] || 0);
    const goalsAgainst = parseNumber(row['GA'] || row['Goals Against'] || 0);
    const saves = parseNumber(row['Saves'] || row['SV'] || 0);
    const shutouts = parseNumber(row['SO'] || row['Shutouts'] || 0);
    const goalsAgainstAverage = parseNumber(row['GAA'] || row['Goals Against Average'] || 0);
    const savePercentage = parseNumber(row['SV%'] || row['Save %'] || row['Save Percentage'] || 0);
    const wins = parseNumber(row['W'] || row['Wins'] || 0);
    const ties = parseNumber(row['T'] || row['Ties'] || 0);
    const winPercentage = parseNumber(row['Win%'] || row['Win Percentage'] || row['W%'] || 0);

    // Check if player already exists
    if (goalies.has(key)) {
      const existing = goalies.get(key)!;
      existing.gamesPlayed = Math.max(existing.gamesPlayed, gamesPlayed);
      existing.goalsAgainst = Math.max(existing.goalsAgainst, goalsAgainst);
      existing.saves = Math.max(existing.saves, saves);
      existing.shutouts = Math.max(existing.shutouts, shutouts);
      existing.wins = Math.max(existing.wins, wins);
      existing.ties = Math.max(existing.ties, ties);
    } else {
      goalies.set(key, {
        firstName,
        lastName,
        gamesPlayed: Math.round(gamesPlayed),
        goals: 0,
        assists: 0,
        points: 0,
        pointsPerGame: 0,
        wins: Math.round(wins),
        ties: Math.round(ties),
        winPercentage: Math.round(winPercentage * 100) / 100,
        mooseheadCupWins: 0,
        isGoalie: true,
        goalsAgainst: Math.round(goalsAgainst),
        saves: Math.round(saves),
        shutouts: Math.round(shutouts),
        goalsAgainstAverage: Math.round(goalsAgainstAverage * 100) / 100,
        savePercentage: Math.round(savePercentage * 100) / 100,
      });
    }
  }

  console.log(`✅ Parsed ${goalies.size} unique goalies`);
  return goalies;
}

async function importLegacyStats() {
  console.log('🏒 Starting Excel Legacy Stats Import...\n');

  // Find Excel files
  const projectRoot = process.cwd();
  const playerStatsFile = path.join(projectRoot, 'HockeyLifeHL_AllTimePlayerStats_seasonid_ap.xlsx');
  const goalieStatsFile = path.join(projectRoot, 'HockeyLifeHL_AllTimeGoalieStats_seasonid_ag.xlsx');

  // Parse both files
  const players = parsePlayerStats(playerStatsFile);
  const goalies = parseGoalieStats(goalieStatsFile);

  // Merge players and goalies
  console.log('\n🔄 Merging player and goalie stats...');
  const allPlayers = new Map<string, LegacyPlayer>(players);

  for (const [key, goalie] of goalies.entries()) {
    if (allPlayers.has(key)) {
      // Merge goalie stats into existing player
      const player = allPlayers.get(key)!;
      player.isGoalie = true;
      player.goalsAgainst = goalie.goalsAgainst;
      player.saves = goalie.saves;
      player.shutouts = goalie.shutouts;
      player.goalsAgainstAverage = goalie.goalsAgainstAverage;
      player.savePercentage = goalie.savePercentage;
      // Use max for games played, wins, ties
      player.gamesPlayed = Math.max(player.gamesPlayed, goalie.gamesPlayed);
      player.wins = Math.max(player.wins, goalie.wins);
      player.ties = Math.max(player.ties, goalie.ties);
    } else {
      // Add goalie-only player
      allPlayers.set(key, goalie);
    }
  }

  console.log(`✅ Total unique players/goalies: ${allPlayers.size}`);

  // Prepare data for database
  const playersToInsert = Array.from(allPlayers.values()).map(p => ({
    first_name: p.firstName,
    last_name: p.lastName,
    games_played: p.gamesPlayed,
    goals: p.goals,
    assists: p.assists,
    points: p.points,
    points_per_game: p.pointsPerGame,
    wins: p.wins,
    ties: p.ties,
    win_percentage: p.winPercentage,
    moosehead_cup_wins: p.mooseheadCupWins,
    is_goalie: p.isGoalie,
    goals_against: p.goalsAgainst,
    saves: p.saves,
    shutouts: p.shutouts,
    goals_against_average: p.goalsAgainstAverage,
    save_percentage: p.savePercentage,
    imported_from: 'excel_historical_import',
  }));

  // Import to database
  console.log('\n💾 Importing to database...');
  const { data, error } = await supabase
    .from('legacy_players')
    .upsert(playersToInsert, {
      onConflict: 'first_name,last_name',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('❌ Error importing stats:', error);
    process.exit(1);
  }

  console.log(`\n✅ Successfully imported ${playersToInsert.length} legacy players/goalies!`);
  console.log('\n📋 Next steps:');
  console.log('1. When users create accounts, they will automatically match if their name matches');
  console.log('2. You can manually match players using the match_legacy_player_to_profile function');
  console.log('3. View combined stats using the player_career_stats view');
  console.log('\n🎉 Import complete!');
}

// Run import
importLegacyStats().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
