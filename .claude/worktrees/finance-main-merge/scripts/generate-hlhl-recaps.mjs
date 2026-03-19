/**
 * Generate AI Game Recaps for HLHL
 *
 * Calls the Supabase edge function generate-ai-article for each completed game
 * in the HLHL league that doesn't already have a recap article.
 *
 * Prerequisites:
 *   - HLHL league must exist with completed games
 *   - game_events and player_stats must be populated (run seed-hlhl-results.mjs first)
 *   - ai_news addon must be active for the league's org (run activate-ai-news-all-leagues.sql)
 *   - OPENAI_API_KEY must be set
 *
 * Usage:
 *   node scripts/generate-hlhl-recaps.mjs
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Delay between API calls to avoid rate limits
const DELAY_MS = 3000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateRecaps() {
  console.log('=== Generate AI Game Recaps for HLHL ===\n');

  // Find HLHL league
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .order('created_at', { ascending: true });

  let league = leagues?.find(l =>
    l.slug?.toLowerCase().includes('hlhl') ||
    l.name?.toLowerCase().includes('hlhl') ||
    l.name?.toLowerCase().includes('hockey life hockey league')
  );

  if (!league) {
    league = leagues?.find(l => l.slug !== 'demo') || leagues?.[0];
  }

  if (!league) {
    console.error('No league found.');
    process.exit(1);
  }
  console.log('League: %s (%s)\n', league.name, league.id);

  // Find current season
  let season = null;
  for (const status of ['active', 'upcoming', 'completed']) {
    const { data } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('league_id', league.id)
      .eq('status', status)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();
    if (data) { season = data; break; }
  }

  if (!season) {
    const { data } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('league_id', league.id)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();
    season = data;
  }

  if (!season) {
    console.error('No season found.');
    process.exit(1);
  }
  console.log('Season: %s (%s)\n', season.name, season.id);

  // Get completed games
  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, home_score, away_score, scheduled_at, game_number')
    .eq('season_id', season.id)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: true });

  if (gamesErr || !games) {
    console.error('Failed to fetch games:', gamesErr?.message);
    process.exit(1);
  }

  console.log('Found %d completed games\n', games.length);

  // Check which games already have recaps
  const { data: existingRecaps } = await supabase
    .from('articles')
    .select('game_id')
    .eq('league_id', league.id)
    .eq('type', 'game_recap')
    .in('game_id', games.map(g => g.id));

  const existingGameIds = new Set((existingRecaps || []).map(r => r.game_id));
  const gamesToProcess = games.filter(g => !existingGameIds.has(g.id));

  console.log('Games already with recaps: %d', existingGameIds.size);
  console.log('Games to generate recaps for: %d\n', gamesToProcess.length);

  if (gamesToProcess.length === 0) {
    console.log('All games already have recaps. Nothing to do.');
    return;
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < gamesToProcess.length; i++) {
    const game = gamesToProcess[i];
    console.log('[%d/%d] Game #%d: %d-%d (id: %s)',
      i + 1, gamesToProcess.length,
      game.game_number || i + 1,
      game.home_score, game.away_score,
      game.id
    );

    try {
      // Use raw fetch for better error visibility
      const resp = await fetch(supabaseUrl + '/functions/v1/generate-ai-article', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + supabaseServiceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'game_recap', game_id: game.id }),
      });

      const data = await resp.json().catch(() => null);
      const error = !resp.ok ? { message: `${resp.status}: ${JSON.stringify(data)}` } : null;

      if (error) {
        console.log('  ERROR: %s', error.message);
        failed++;
      } else if (data?.skipped) {
        console.log('  SKIPPED: %s', data.message);
        skipped++;
      } else {
        console.log('  SUCCESS: %s', data?.articleTitle || 'Article generated');
        success++;
      }
    } catch (err) {
      console.log('  EXCEPTION: %s', err.message);
      failed++;
    }

    // Delay between calls
    if (i < gamesToProcess.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n=== Recap Generation Complete ===');
  console.log('  Success:  %d', success);
  console.log('  Skipped:  %d', skipped);
  console.log('  Failed:   %d', failed);
  console.log('  Total:    %d', gamesToProcess.length);
}

try {
  await generateRecaps();
} catch (err) {
  console.error('Unexpected error:', err);
  process.exit(1);
}
