require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LEAGUE_ID = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const WINTER_SEASON_ID = '30ee2c0b-5981-4df4-b0cc-d7cae05b9e37';
const SPRING_SEASON_ID = '6e2f732c-5c6c-4642-b645-f7dd040d0fa5';
const AGG_PREFIX = '[aggregate-only]';

const SCHEDULE = [
  ['2026-01-08T22:15:00-05:00','Western Fair - Chick','FGL',6,'FRF',4,'completed'],
  ['2026-01-08T22:30:00-05:00','Western Fair - Clothiers','FRP',1,'LEM',2,'completed'],
  ['2026-01-15T22:15:00-05:00','Western Fair - Chick','FGL',7,'LEM',3,'completed'],
  ['2026-01-15T22:30:00-05:00','Western Fair - Clothiers','FRP',4,'FRF',8,'completed'],
  ['2026-01-22T22:15:00-05:00','Western Fair - Chick','FRF',7,'LEM',6,'completed'],
  ['2026-01-22T22:30:00-05:00','Western Fair - Clothiers','FRP',5,'FGL',2,'completed'],
  ['2026-01-29T22:15:00-05:00','Western Fair - Chick','FRP',7,'LEM',5,'completed'],
  ['2026-01-29T22:30:00-05:00','Western Fair - Clothiers','FRF',1,'FGL',4,'completed'],
  ['2026-02-05T22:15:00-05:00','Western Fair - Chick','FRP',5,'FRF',8,'completed'],
  ['2026-02-05T22:30:00-05:00','Western Fair - Clothiers','FGL',1,'LEM',3,'completed'],
  ['2026-02-12T22:15:00-05:00','Western Fair - Chick','FGL',6,'FRP',3,'completed'],
  ['2026-02-12T22:30:00-05:00','Western Fair - Clothiers','LEM',6,'FRF',7,'completed'],
  ['2026-02-19T22:15:00-05:00','Western Fair - Chick','FGL',3,'FRF',1,'completed'],
  ['2026-02-19T22:30:00-05:00','Western Fair - Clothiers','LEM',4,'FRP',7,'completed'],
  ['2026-02-26T22:15:00-05:00','Western Fair - Chick','FGL',2,'LEM',5,'completed'],
  ['2026-02-26T22:30:00-05:00','Western Fair - Clothiers','FRP',9,'FRF',2,'completed'],
  ['2026-03-05T22:15:00-05:00','Western Fair - Chick','FRF',1,'LEM',1,'completed'],
  ['2026-03-05T22:30:00-05:00','Western Fair - Clothiers','FGL',3,'FRP',3,'completed'],
  ['2026-03-12T22:15:00-05:00','Western Fair - Chick','FRP',3,'LEM',5,'completed'],
  ['2026-03-12T22:30:00-05:00','Western Fair - Clothiers','FGL',9,'FRF',4,'completed'],
  ['2026-03-19T22:15:00-05:00','Western Fair - Chick','FGL',1,'LEM',3,'completed'],
  ['2026-03-19T22:30:00-05:00','Western Fair - Clothiers','FRF',5,'FRP',1,'completed'],
  ['2026-03-26T22:15:00-04:00','Western Fair - Chick','FRF',null,'LEM',null,'scheduled'],
  ['2026-03-26T22:30:00-04:00','Western Fair - Clothiers','FRP',null,'FGL',null,'scheduled'],
];

(async () => {
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', LEAGUE_ID)
    .in('name', ['First General London', 'FitzRays Flyers', 'FitzRays Premier', 'London Eco Metal']);
  if (teamsError) throw teamsError;

  const teamIdByAbbr = new Map();
  for (const team of teams || []) {
    if (team.name === 'First General London') teamIdByAbbr.set('FGL', team.id);
    if (team.name === 'FitzRays Flyers') teamIdByAbbr.set('FRF', team.id);
    if (team.name === 'FitzRays Premier') teamIdByAbbr.set('FRP', team.id);
    if (team.name === 'London Eco Metal') teamIdByAbbr.set('LEM', team.id);
  }

  // mark existing synthetic carrier games so UI can hide them
  const { data: currentWinterGames, error: currentGamesError } = await supabase
    .from('games')
    .select('id, location')
    .eq('season_id', WINTER_SEASON_ID);
  if (currentGamesError) throw currentGamesError;

  const syntheticIds = (currentWinterGames || [])
    .filter((game) => !['Western Fair - Chick', 'Western Fair - Clothiers'].includes(game.location || ''))
    .map((game) => game.id);

  if (syntheticIds.length > 0) {
    const { error: markSyntheticError } = await supabase
      .from('games')
      .update({ location: `${AGG_PREFIX} historical aggregate stats carrier` })
      .in('id', syntheticIds);
    if (markSyntheticError) throw markSyntheticError;
  }

  // clear any previously imported real visible winter schedule games so script is idempotent
  const { error: deleteVisibleError } = await supabase
    .from('games')
    .delete()
    .eq('season_id', WINTER_SEASON_ID)
    .not('location', 'like', `${AGG_PREFIX}%`);
  if (deleteVisibleError) throw deleteVisibleError;

  const gamesToInsert = SCHEDULE.map(([scheduledAt, location, homeAbbr, homeScore, awayAbbr, awayScore, status], idx) => ({
    id: randomUUID(),
    league_id: LEAGUE_ID,
    season_id: WINTER_SEASON_ID,
    home_team_id: teamIdByAbbr.get(homeAbbr),
    away_team_id: teamIdByAbbr.get(awayAbbr),
    scheduled_at: scheduledAt,
    location,
    status,
    home_score: homeScore,
    away_score: awayScore,
    game_type: 'regular',
    round_number: Math.floor(idx / 2) + 1,
    game_number: idx + 1,
  }));

  const { error: insertError } = await supabase.from('games').insert(gamesToInsert);
  if (insertError) throw insertError;

  const { error: winterSeasonError } = await supabase
    .from('seasons')
    .update({
      status: 'active',
      end_date: '2026-03-26',
      schedule_generated: true,
      total_games: 24,
      current_game_count: 24,
    })
    .eq('id', WINTER_SEASON_ID);
  if (winterSeasonError) throw winterSeasonError;

  const { error: springSeasonError } = await supabase
    .from('seasons')
    .update({ status: 'draft' })
    .eq('id', SPRING_SEASON_ID);
  if (springSeasonError) throw springSeasonError;

  const visibleGames = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', WINTER_SEASON_ID)
    .not('location', 'like', `${AGG_PREFIX}%`);
  const hiddenGames = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', WINTER_SEASON_ID)
    .like('location', `${AGG_PREFIX}%`);
  const completedVisible = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', WINTER_SEASON_ID)
    .not('location', 'like', `${AGG_PREFIX}%`)
    .eq('status', 'completed');
  const scheduledVisible = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', WINTER_SEASON_ID)
    .not('location', 'like', `${AGG_PREFIX}%`)
    .eq('status', 'scheduled');

  console.log(JSON.stringify({
    status: 'ok',
    winterSeasonId: WINTER_SEASON_ID,
    visible_games: visibleGames.count,
    hidden_aggregate_games: hiddenGames.count,
    completed_visible_games: completedVisible.count,
    scheduled_visible_games: scheduledVisible.count,
  }, null, 2));
})();
