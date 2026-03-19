/**
 * Clear BMHL Future Game Stats
 *
 * Removes stats (game_events, player_stats, goalie_stats) and resets
 * games to 'scheduled' status for BMHL games after Feb 16, 2026.
 *
 * Usage:
 *   node scripts/clear-bmhl-future-stats.mjs
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BMHL_LEAGUE_ID = 'b0000000-0000-0000-0000-000000000002';
const CUTOFF = '2026-02-16T23:59:59Z';

async function clearFutureStats() {
  console.log('=== Clear BMHL Future Game Stats ===\n');
  console.log('Cutoff: Games after %s\n', CUTOFF);

  // Get all BMHL seasons
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('league_id', BMHL_LEAGUE_ID);

  if (!seasons || seasons.length === 0) {
    console.error('No BMHL seasons found.');
    process.exit(1);
  }

  const seasonIds = seasons.map(s => s.id);
  console.log('Seasons:', seasons.map(s => s.name).join(', '));

  // Find future games
  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select('id, scheduled_at, status, home_score, away_score, game_number')
    .in('season_id', seasonIds)
    .gt('scheduled_at', CUTOFF)
    .order('scheduled_at', { ascending: true });

  if (gamesErr) {
    console.error('Error fetching games:', gamesErr.message);
    process.exit(1);
  }

  if (!games || games.length === 0) {
    console.log('\nNo games found after cutoff. Nothing to do.');
    return;
  }

  console.log('\nFound %d games after cutoff:\n', games.length);
  for (const g of games) {
    console.log('  Game #%s: %s | status=%s | score=%s-%s',
      g.game_number || '?',
      new Date(g.scheduled_at).toLocaleDateString(),
      g.status,
      g.home_score ?? '-',
      g.away_score ?? '-'
    );
  }

  const gameIds = games.map(g => g.id);
  const completedGames = games.filter(g => g.status === 'completed');

  if (completedGames.length === 0) {
    console.log('\nNo completed future games found. Nothing to clear.');
    return;
  }

  console.log('\n%d of these are marked as completed. Clearing...\n', completedGames.length);

  // Delete game_events
  const { count: eventsDeleted, error: evErr } = await supabase
    .from('game_events')
    .delete({ count: 'exact' })
    .in('game_id', gameIds);
  if (evErr) console.error('  game_events delete error:', evErr.message);
  else console.log('  Deleted %d game_events', eventsDeleted || 0);

  // Delete player_stats
  const { count: psDeleted, error: psErr } = await supabase
    .from('player_stats')
    .delete({ count: 'exact' })
    .in('game_id', gameIds);
  if (psErr) console.error('  player_stats delete error:', psErr.message);
  else console.log('  Deleted %d player_stats', psDeleted || 0);

  // Delete goalie_stats
  const { count: gsDeleted, error: gsErr } = await supabase
    .from('goalie_stats')
    .delete({ count: 'exact' })
    .in('game_id', gameIds);
  if (gsErr) console.error('  goalie_stats delete error:', gsErr.message);
  else console.log('  Deleted %d goalie_stats', gsDeleted || 0);

  // Reset games to scheduled
  const { error: updateErr } = await supabase
    .from('games')
    .update({
      status: 'scheduled',
      home_score: null,
      away_score: null,
      game_started_at: null,
      game_ended_at: null,
    })
    .in('id', gameIds)
    .eq('status', 'completed');

  if (updateErr) console.error('  games update error:', updateErr.message);
  else console.log('  Reset %d games to scheduled status', completedGames.length);

  console.log('\n=== Done ===');
}

try {
  await clearFutureStats();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
