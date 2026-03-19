import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Generate 16-char alphanumeric token
const token = randomBytes(10).toString('base64url').replace(/[^A-Za-z0-9]/g, '').substring(0, 16).toUpperCase();

// Get WOHA league + season
const { data: league } = await supabase.from('leagues').select('id').eq('slug', 'woha').single();
const { data: season } = await supabase.from('seasons').select('id').eq('league_id', league.id).order('created_at', { ascending: false }).limit(1).single();

// Get all games
const { data: games } = await supabase.from('games').select('id').eq('season_id', season.id).order('scheduled_at', { ascending: true });

// Get scorekeeper
const { data: sk } = await supabase.from('league_scorekeepers').select('id, scorekeeper_id').eq('league_id', league.id).limit(1).single();

const firstGameId = games[0].id;

// Create multi-game session
const { data: sess, error: sessErr } = await supabase
  .from('scorekeeper_sessions')
  .insert({
    token,
    game_id: firstGameId,
    league_id: league.id,
    scorekeeper_id: sk.scorekeeper_id,
    league_scorekeeper_id: sk.id,
    session_type: 'multi',
    created_by: sk.scorekeeper_id,
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    access_count: 0,
  })
  .select('id')
  .single();

if (sessErr) { console.error('Session error:', sessErr.message); process.exit(1); }

// Link all games to the session
const sessionGames = games.map((g, i) => ({
  session_id: sess.id,
  game_id: g.id,
  game_order: i + 1,
}));

const { error: sgErr } = await supabase.from('scorekeeper_session_games').insert(sessionGames);
if (sgErr) { console.error('Session games error:', sgErr.message); process.exit(1); }

console.log('=== WOHA Scorekeeper Token ===');
console.log('Token:', token);
console.log('Games:', games.length);
console.log('Expires: 1 year from now');
console.log('');
console.log('Access URL:');
console.log(`  https://woha.beerleaguehockey.ca/woha/scorekeeper?token=${token}`);
console.log(`  localhost: http://localhost:3001/woha/scorekeeper?token=${token}`);
