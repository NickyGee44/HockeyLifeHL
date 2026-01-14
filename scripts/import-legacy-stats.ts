/**
 * Import Legacy Player Stats from HockeyLifeHL.com
 * 
 * This script parses the HTML from the old website and imports
 * historical player and goalie stats into the legacy_players table.
 * 
 * Usage:
 * 1. Visit https://hockeylifehl.com/league-posts/statscard/?seasonid=ap
 * 2. Save the HTML to data/legacy-player-stats.html
 * 3. Visit https://hockeylifehl.com/league-posts/statscard/?seasonid=ag
 * 4. Save the HTML to data/legacy-goalie-stats.html
 * 5. Run: npx tsx scripts/import-legacy-stats.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'node-html-parser';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LegacyPlayerStats {
  firstName: string;
  lastName: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  wins: number;
  ties: number;
  points: number;
  pointsPerGame: number;
  winPercentage: number;
  mooseheadCupWins: number;
}

interface LegacyGoalieStats {
  firstName: string;
  lastName: string;
  gamesPlayed: number;
  goalsAgainst: number;
  saves: number;
  shutouts: number;
  goalsAgainstAverage: number;
  savePercentage: number;
  wins: number;
  ties: number;
  winPercentage: number;
}

type LegacyCombinedStats = LegacyPlayerStats &
  Partial<LegacyGoalieStats> & {
    is_goalie: boolean;
  };

function parsePlayerStats(html: string): LegacyPlayerStats[] {
  const root = parse(html);
  const players: LegacyPlayerStats[] = [];
  
  // Find the stats table
  const table = root.querySelector('table');
  if (!table) {
    console.error('No table found in HTML');
    return players;
  }
  
  // Get all rows (skip header)
  const rows = table.querySelectorAll('tr').slice(1);
  
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 11) continue;
    
    // Parse name (first cell might have Facebook/share links)
    const nameCell = cells[0];
    const nameText = nameCell.text.trim();
    
    // Remove Facebook/share button text
    const cleanName = nameText
      .replace(/\[DOWNLOAD\].*?\[FACEBOOK\]/g, '')
      .replace(/\[FACEBOOK\].*?/g, '')
      .replace(/FACEBOOK/g, '')
      .trim();
    
    // Split into last and first name
    const nameParts = cleanName.split(/\s+/);
    if (nameParts.length < 2) continue;
    
    const lastName = nameParts[0].trim();
    const firstName = nameParts.slice(1).join(' ').trim();
    
    // Parse stats
    const gamesPlayed = parseInt(cells[2]?.text.trim() || '0', 10);
    const goals = parseInt(cells[3]?.text.trim() || '0', 10);
    const assists = parseInt(cells[4]?.text.trim() || '0', 10);
    const wins = parseInt(cells[5]?.text.trim() || '0', 10);
    const ties = parseInt(cells[6]?.text.trim() || '0', 10);
    const points = parseInt(cells[7]?.text.trim() || '0', 10);
    const pointsPerGame = parseFloat(cells[8]?.text.trim() || '0');
    const winPercentage = parseFloat(cells[9]?.text.trim() || '0');
    const mooseheadCupWins = parseInt(cells[10]?.text.trim() || '0', 10);
    
    if (firstName && lastName) {
      players.push({
        firstName,
        lastName,
        gamesPlayed,
        goals,
        assists,
        wins,
        ties,
        points,
        pointsPerGame,
        winPercentage,
        mooseheadCupWins,
      });
    }
  }
  
  return players;
}

function parseGoalieStats(html: string): LegacyGoalieStats[] {
  const root = parse(html);
  const goalies: LegacyGoalieStats[] = [];
  
  const table = root.querySelector('table');
  if (!table) {
    console.error('No table found in goalie HTML');
    return goalies;
  }
  
  const rows = table.querySelectorAll('tr').slice(1);
  
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 10) continue;
    
    const nameCell = cells[0];
    const nameText = nameCell.text.trim();
    
    const cleanName = nameText
      .replace(/\[DOWNLOAD\].*?\[FACEBOOK\]/g, '')
      .replace(/\[FACEBOOK\].*?/g, '')
      .replace(/FACEBOOK/g, '')
      .trim();
    
    const nameParts = cleanName.split(/\s+/);
    if (nameParts.length < 2) continue;
    
    const lastName = nameParts[0].trim();
    const firstName = nameParts.slice(1).join(' ').trim();
    
    const gamesPlayed = parseInt(cells[2]?.text.trim() || '0', 10);
    const goalsAgainst = parseInt(cells[3]?.text.trim() || '0', 10);
    const saves = parseInt(cells[4]?.text.trim() || '0', 10);
    const shutouts = parseInt(cells[5]?.text.trim() || '0', 10);
    const goalsAgainstAverage = parseFloat(cells[6]?.text.trim() || '0');
    const savePercentage = parseFloat(cells[7]?.text.trim() || '0');
    const wins = parseInt(cells[8]?.text.trim() || '0', 10);
    const ties = parseInt(cells[9]?.text.trim() || '0', 10);
    const winPercentage = parseFloat(cells[10]?.text.trim() || '0');
    
    if (firstName && lastName) {
      goalies.push({
        firstName,
        lastName,
        gamesPlayed,
        goalsAgainst,
        saves,
        shutouts,
        goalsAgainstAverage,
        savePercentage,
        wins,
        ties,
        winPercentage,
      });
    }
  }
  
  return goalies;
}

async function importLegacyStats() {
  console.log('Starting legacy stats import...\n');
  
  // Read HTML files
  const playerStatsPath = path.join(process.cwd(), 'data', 'legacy-player-stats.html');
  const goalieStatsPath = path.join(process.cwd(), 'data', 'legacy-goalie-stats.html');
  
  if (!fs.existsSync(playerStatsPath)) {
    console.error(`Player stats file not found: ${playerStatsPath}`);
    console.log('Please save the HTML from https://hockeylifehl.com/league-posts/statscard/?seasonid=ap to this file');
    process.exit(1);
  }
  
  if (!fs.existsSync(goalieStatsPath)) {
    console.error(`Goalie stats file not found: ${goalieStatsPath}`);
    console.log('Please save the HTML from https://hockeylifehl.com/league-posts/statscard/?seasonid=ag to this file');
    process.exit(1);
  }
  
  const playerStatsHtml = fs.readFileSync(playerStatsPath, 'utf-8');
  const goalieStatsHtml = fs.readFileSync(goalieStatsPath, 'utf-8');
  
  // Parse stats
  console.log('Parsing player stats...');
  const playerStats = parsePlayerStats(playerStatsHtml);
  console.log(`Found ${playerStats.length} players\n`);
  
  console.log('Parsing goalie stats...');
  const goalieStats = parseGoalieStats(goalieStatsHtml);
  console.log(`Found ${goalieStats.length} goalies\n`);
  
  // Combine player and goalie stats (some players might be goalies too)
  const allPlayers = new Map<string, LegacyCombinedStats>();
  
  // Add players
  for (const player of playerStats) {
    const key = `${player.firstName.toLowerCase()}_${player.lastName.toLowerCase()}`;
    allPlayers.set(key, { ...player, is_goalie: false });
  }
  
  // Add/update goalies
  for (const goalie of goalieStats) {
    const key = `${goalie.firstName.toLowerCase()}_${goalie.lastName.toLowerCase()}`;
    const existing = allPlayers.get(key);
    
    if (existing) {
      // Player is also a goalie - merge stats
      Object.assign(existing, {
        is_goalie: true,
        goalsAgainst: goalie.goalsAgainst,
        saves: goalie.saves,
        shutouts: goalie.shutouts,
        goalsAgainstAverage: goalie.goalsAgainstAverage,
        savePercentage: goalie.savePercentage,
      });
    } else {
      // Goalie only
      allPlayers.set(key, {
        firstName: goalie.firstName,
        lastName: goalie.lastName,
        gamesPlayed: goalie.gamesPlayed,
        goals: 0,
        assists: 0,
        wins: goalie.wins,
        ties: goalie.ties,
        points: 0,
        pointsPerGame: 0,
        winPercentage: goalie.winPercentage,
        mooseheadCupWins: 0,
        is_goalie: true,
        goalsAgainst: goalie.goalsAgainst,
        saves: goalie.saves,
        shutouts: goalie.shutouts,
        goalsAgainstAverage: goalie.goalsAgainstAverage,
        savePercentage: goalie.savePercentage,
      });
    }
  }
  
  console.log(`Total unique players/goalies: ${allPlayers.size}\n`);
  
  // Import to database
  console.log('Importing to database...');
  const playersToInsert = Array.from(allPlayers.values()).map(p => ({
    first_name: p.firstName,
    last_name: p.lastName,
    games_played: p.gamesPlayed,
    goals: p.goals || 0,
    assists: p.assists || 0,
    points: p.points || 0,
    points_per_game: p.pointsPerGame || 0,
    wins: p.wins || 0,
    ties: p.ties || 0,
    win_percentage: p.winPercentage || 0,
    moosehead_cup_wins: p.mooseheadCupWins || 0,
    is_goalie: p.is_goalie,
    goals_against: p.goalsAgainst || 0,
    saves: p.saves || 0,
    shutouts: p.shutouts || 0,
    goals_against_average: p.goalsAgainstAverage || 0,
    save_percentage: p.savePercentage || 0,
  }));
  
  // Use upsert to handle duplicates
  const { data, error } = await supabase
    .from('legacy_players')
    .upsert(playersToInsert, {
      onConflict: 'first_name,last_name',
      ignoreDuplicates: false,
    });
  
  if (error) {
    console.error('Error importing stats:', error);
    process.exit(1);
  }
  
  console.log(`\n✅ Successfully imported ${playersToInsert.length} legacy players/goalies!`);
  console.log('\nNext steps:');
  console.log('1. When users create accounts, they will automatically match if their name matches');
  console.log('2. You can manually match players using the match_legacy_player_to_profile function');
  console.log('3. View combined stats using the player_career_stats view');
}

// Run import
importLegacyStats().catch(console.error);
