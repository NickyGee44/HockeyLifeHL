require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LEAGUE_ID = 'd6e55507-6eae-4d94-978c-47c6c30a36f1';
const SEASON_ID = '30ee2c0b-5981-4df4-b0cc-d7cae05b9e37';
const PHOTO_URL = null; // falls back to built-in artwork if no usable gallery image is available
const AGG_PREFIX = '[aggregate-only]';

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Toronto',
  });
}

function scoreline(game, homeTeam, awayTeam) {
  return `${awayTeam.name} ${game.away_score} – ${game.home_score} ${homeTeam.name}`;
}

function pickDemoPlayers(teamPlayers, count = 2) {
  return (teamPlayers || []).slice(0, count);
}

function playerLink(leagueSlug, player) {
  return `[${player.full_name}](/${leagueSlug}/players/${player.id})`;
}

function teamLink(leagueSlug, team) {
  return `[${team.name}](/${leagueSlug}/teams/${team.slug})`;
}

function buildCompletedArticle({ game, leagueSlug, homeTeam, awayTeam, homePlayers, awayPlayers }) {
  const hp = pickDemoPlayers(homePlayers, 2);
  const ap = pickDemoPlayers(awayPlayers, 2);
  const winner = game.home_score > game.away_score ? homeTeam : awayTeam;
  const loser = winner.id === homeTeam.id ? awayTeam : homeTeam;
  const winnerVerb = game.home_score === game.away_score ? 'battle to a draw with' : 'outlast';

  const title = game.home_score === game.away_score
    ? `${awayTeam.name} and ${homeTeam.name} play to ${game.away_score}-${game.home_score} draw`
    : `${winner.name} ${winnerVerb}s ${loser.name} ${Math.max(game.home_score, game.away_score)}-${Math.min(game.home_score, game.away_score)}`;

  const excerpt = game.home_score === game.away_score
    ? `${teamLink(leagueSlug, awayTeam)} and ${teamLink(leagueSlug, homeTeam)} traded chances all night in a ${game.away_score}-${game.home_score} result.`
    : `${teamLink(leagueSlug, winner)} picked up another Winter Thursdays result, turning a strong late push into a ${Math.max(game.home_score, game.away_score)}-${Math.min(game.home_score, game.away_score)} win over ${teamLink(leagueSlug, loser)}.`;

  const paragraphs = [
    `${teamLink(leagueSlug, awayTeam)} met ${teamLink(leagueSlug, homeTeam)} on ${shortDate(game.scheduled_at)} at ${game.location}, and the final board showed ${scoreline(game, homeTeam, awayTeam)}. This recap is seeded as demo content, but it gives HockeyLifeHL a proper article shell attached to the real game page.`,
    `For a player spotlight layer, ${ap[0] ? playerLink(leagueSlug, ap[0]) : awayTeam.name} and ${ap[1] ? playerLink(leagueSlug, ap[1]) : awayTeam.name} helped drive the pace for ${teamLink(leagueSlug, awayTeam)}, while ${hp[0] ? playerLink(leagueSlug, hp[0]) : homeTeam.name} and ${hp[1] ? playerLink(leagueSlug, hp[1]) : homeTeam.name} were used as featured names for ${teamLink(leagueSlug, homeTeam)}. These are demo mentions only, not boxscore-verified stat leaders.`,
    game.home_score === game.away_score
      ? `The draw keeps both clubs in the Winter Thursdays conversation and gives the league a cleaner story layer on top of the restored schedule, standings, and stat imports.`
      : `${teamLink(leagueSlug, winner)} leave this one with the two points, while ${teamLink(leagueSlug, loser)} head into the next Thursday slot looking to answer back. The main point here is structural: every real winter game now has a real linked article instead of a blank news surface.`
  ];

  return {
    title,
    excerpt,
    content: paragraphs.join('\n\n'),
    type: 'game_recap',
    published: true,
    published_at: game.scheduled_at,
    image_url: PHOTO_URL,
    taggedPlayers: [...ap, ...hp].filter(Boolean).slice(0, 4),
  };
}

function buildUpcomingArticle({ game, leagueSlug, homeTeam, awayTeam, homePlayers, awayPlayers }) {
  const hp = pickDemoPlayers(homePlayers, 2);
  const ap = pickDemoPlayers(awayPlayers, 2);
  const title = `${awayTeam.name} vs ${homeTeam.name} set for Thursday night finale`;
  const excerpt = `${teamLink(leagueSlug, awayTeam)} and ${teamLink(leagueSlug, homeTeam)} are on deck for the final Winter Thursdays slate.`;
  const paragraphs = [
    `${teamLink(leagueSlug, awayTeam)} face ${teamLink(leagueSlug, homeTeam)} on ${shortDate(game.scheduled_at)} at ${game.location} as the Winter Thursdays schedule reaches its final night. This preview is seeded demo copy so the game has a proper story attached before puck drop.`,
    `${ap[0] ? playerLink(leagueSlug, ap[0]) : awayTeam.name} and ${ap[1] ? playerLink(leagueSlug, ap[1]) : awayTeam.name} are featured names for ${teamLink(leagueSlug, awayTeam)}, while ${hp[0] ? playerLink(leagueSlug, hp[0]) : homeTeam.name} and ${hp[1] ? playerLink(leagueSlug, hp[1]) : homeTeam.name} are highlighted on the ${teamLink(leagueSlug, homeTeam)} side. They’re demo mentions, but they make the article, player, and team surfaces feel alive.`,
    `Once the result is final, this article can be tightened into a proper recap with verified stat leaders. For now it gives HockeyLifeHL a clean linked preview and a direct bridge into the game page.`
  ];

  return {
    title,
    excerpt,
    content: paragraphs.join('\n\n'),
    type: 'news',
    published: true,
    published_at: game.scheduled_at,
    image_url: PHOTO_URL,
    taggedPlayers: [...ap, ...hp].filter(Boolean).slice(0, 4),
  };
}

(async () => {
  const [{ data: league, error: leagueError }, { data: teams, error: teamsError }, { data: games, error: gamesError }, { data: rosters, error: rostersError }] = await Promise.all([
    supabase.from('leagues').select('id, slug, name').eq('id', LEAGUE_ID).single(),
    supabase.from('teams').select('id, name, slug, short_name, status').eq('league_id', LEAGUE_ID).in('name', ['First General London', 'FitzRays Flyers', 'FitzRays Premier', 'London Eco Metal']),
    supabase.from('games').select('id, season_id, home_team_id, away_team_id, scheduled_at, location, status, home_score, away_score').eq('season_id', SEASON_ID).not('location', 'like', `${AGG_PREFIX}%`).order('scheduled_at', { ascending: true }),
    supabase.from('team_rosters').select('team_id, player_id, profiles:player_id(id, full_name)').eq('season_id', SEASON_ID).eq('status', 'active'),
  ]);
  if (leagueError) throw leagueError;
  if (teamsError) throw teamsError;
  if (gamesError) throw gamesError;
  if (rostersError) throw rostersError;

  const teamMap = new Map((teams || []).map((team) => [team.id, team]));
  const rosterMap = new Map();
  for (const row of rosters || []) {
    const existing = rosterMap.get(row.team_id) || [];
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (profile?.id && profile?.full_name) existing.push(profile);
    rosterMap.set(row.team_id, existing);
  }

  const existingArticles = await supabase
    .from('articles')
    .select('id, game_id')
    .eq('league_id', LEAGUE_ID)
    .eq('season_id', SEASON_ID)
    .in('game_id', (games || []).map((g) => g.id));
  if (existingArticles.error) throw existingArticles.error;
  const existingByGameId = new Map((existingArticles.data || []).map((article) => [article.game_id, article]));

  let created = 0;
  let updated = 0;
  let tagsInserted = 0;

  for (const game of games || []) {
    const homeTeam = teamMap.get(game.home_team_id);
    const awayTeam = teamMap.get(game.away_team_id);
    if (!homeTeam || !awayTeam) continue;

    const articleData = game.status === 'completed'
      ? buildCompletedArticle({
          game,
          leagueSlug: league.slug,
          homeTeam,
          awayTeam,
          homePlayers: rosterMap.get(homeTeam.id) || [],
          awayPlayers: rosterMap.get(awayTeam.id) || [],
        })
      : buildUpcomingArticle({
          game,
          leagueSlug: league.slug,
          homeTeam,
          awayTeam,
          homePlayers: rosterMap.get(homeTeam.id) || [],
          awayPlayers: rosterMap.get(awayTeam.id) || [],
        });

    const slug = slugify(`${shortDate(game.scheduled_at)} ${awayTeam.name} ${homeTeam.name}`);
    const payload = {
      league_id: LEAGUE_ID,
      season_id: SEASON_ID,
      game_id: game.id,
      title: articleData.title,
      excerpt: articleData.excerpt,
      content: articleData.content,
      slug,
      type: articleData.type,
      published: true,
      published_at: articleData.published_at,
      image_url: articleData.image_url,
      author_id: null,
    };

    let articleId;
    const existing = existingByGameId.get(game.id);
    if (existing?.id) {
      const { error } = await supabase.from('articles').update(payload).eq('id', existing.id);
      if (error) throw error;
      articleId = existing.id;
      updated += 1;
      const { error: deleteTagsError } = await supabase.from('article_player_tags').delete().eq('article_id', articleId);
      if (deleteTagsError) throw deleteTagsError;
    } else {
      const { data, error } = await supabase.from('articles').insert(payload).select('id').single();
      if (error) throw error;
      articleId = data.id;
      created += 1;
    }

    const tagRows = articleData.taggedPlayers.map((player) => ({
      article_id: articleId,
      player_id: player.id,
      mention_type: 'star',
    }));

    if (tagRows.length > 0) {
      const { error: tagError } = await supabase.from('article_player_tags').insert(tagRows);
      if (tagError) throw tagError;
      tagsInserted += tagRows.length;
    }
  }

  console.log(JSON.stringify({
    status: 'ok',
    league: league.slug,
    games_processed: (games || []).length,
    created,
    updated,
    tagsInserted,
  }, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ status: 'error', error }, null, 2));
  process.exit(1);
});
