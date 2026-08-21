export interface GameRecapDependencies {
  gatherGameRecapData: (supabase: any, gameId: string) => Promise<any>;
  checkAddonActive: (supabase: any, leagueId: string) => Promise<boolean>;
  generateArticle: (
    gameData: any,
  ) => Promise<{ parsed: any; usage?: { total_tokens?: number }; model?: string }>;
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function getAuthoritativeGamePlayerIds(gameData: any): Set<string> {
  return new Set(uniqueIds([
    ...(gameData.goals || []).flatMap((goal: any) => [
      goal.scorer_id,
      goal.assist1_id,
      goal.assist2_id,
    ]),
    ...(gameData.penalties || []).map((penalty: any) => penalty.player_id),
    gameData.homeGoalie?.player_id,
    gameData.awayGoalie?.player_id,
  ]));
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

function throwIfDatabaseError(error: any, context: string): void {
  if (!error) return;
  throw new Error(error.message ? `${context}: ${error.message}` : context);
}

async function rebuildArticleTags(
  supabase: any,
  args: {
    articleId: string;
    playerIds: string[];
    starPlayerIds: string[];
    teamIds: string[];
    gameId: string;
  },
): Promise<void> {
  for (const table of ['article_player_tags', 'article_team_tags', 'article_game_tags']) {
    const { error } = await supabase.from(table).delete().eq('article_id', args.articleId);
    throwIfDatabaseError(error, `Failed to clear ${table}`);
  }

  const playerIds = uniqueIds([...args.playerIds, ...args.starPlayerIds]);
  if (playerIds.length > 0) {
    const { error } = await supabase.from('article_player_tags').insert(
      playerIds.map((playerId) => ({
        article_id: args.articleId,
        player_id: playerId,
        mention_type: args.starPlayerIds.includes(playerId) ? 'star' : 'mentioned',
      })),
    );
    throwIfDatabaseError(error, 'Failed to rebuild article player tags');
  }

  if (args.teamIds.length > 0) {
    const { error } = await supabase.from('article_team_tags').insert(
      uniqueIds(args.teamIds).map((teamId) => ({
        article_id: args.articleId,
        team_id: teamId,
      })),
    );
    throwIfDatabaseError(error, 'Failed to rebuild article team tags');
  }

  const { error: gameTagError } = await supabase.from('article_game_tags').insert({
    article_id: args.articleId,
    game_id: args.gameId,
    is_primary: true,
  });
  throwIfDatabaseError(gameTagError, 'Failed to rebuild article game tags');
}

export async function handleGameRecap(
  supabase: any,
  gameId: string,
  force: boolean,
  dependencies: GameRecapDependencies,
) {
  const { data: existingLog, error: existingLogError } = await supabase
    .from('ai_generation_log')
    .select('id, status')
    .eq('game_id', gameId)
    .eq('article_type', 'game_recap')
    .maybeSingle();
  throwIfDatabaseError(existingLogError, 'Failed to check game recap generation log');

  if (!force && existingLog?.status === 'completed') {
    return { success: true, message: 'Game recap already exists', skipped: true };
  }

  const gameData = await dependencies.gatherGameRecapData(supabase, gameId);
  if (!gameData) {
    return { success: false, error: 'Game not found or not completed' };
  }

  if (!(await dependencies.checkAddonActive(supabase, gameData.league_id))) {
    return { success: false, error: 'AI News addon not active for this league' };
  }

  const startTime = Date.now();

  try {
    if (existingLog?.id) {
      const { error } = await supabase
        .from('ai_generation_log')
        .update({ status: 'generating', error_message: null, completed_at: null })
        .eq('id', existingLog.id);
      throwIfDatabaseError(error, 'Failed to update game recap generation log');
    } else {
      const { error } = await supabase.from('ai_generation_log').insert({
        league_id: gameData.league_id,
        season_id: gameData.season_id,
        game_id: gameId,
        article_type: 'game_recap',
        status: 'generating',
      });
      throwIfDatabaseError(error, 'Failed to create game recap generation log');
    }

    // Generate all replacement content before reading or changing the published article.
    const { parsed, usage, model } = await dependencies.generateArticle(gameData);
    const {
      title,
      excerpt,
      content,
      tagged_player_ids: requestedTaggedPlayerIds = [],
      star_player_ids: requestedStarPlayerIds = [],
    } = parsed;
    const authoritativePlayerIds = getAuthoritativeGamePlayerIds(gameData);
    const taggedPlayerIds = uniqueIds(requestedTaggedPlayerIds)
      .filter((playerId) => authoritativePlayerIds.has(playerId));
    const starPlayerIds = uniqueIds(requestedStarPlayerIds)
      .filter((playerId) => authoritativePlayerIds.has(playerId));
    const now = new Date().toISOString();
    const articleValues = {
      league_id: gameData.league_id,
      season_id: gameData.season_id,
      game_id: gameId,
      title,
      excerpt,
      content,
      slug: generateSlug(title),
      type: 'game_recap',
      published: true,
      published_at: now,
      updated_at: now,
    };

    const { data: existingArticle, error: articleLookupError } = await supabase
      .from('articles')
      .select('id')
      .eq('game_id', gameId)
      .eq('type', 'game_recap')
      .maybeSingle();
    throwIfDatabaseError(articleLookupError, 'Failed to find existing game recap');

    const articleWrite = existingArticle
      ? supabase.from('articles').update(articleValues).eq('id', existingArticle.id)
      : supabase.from('articles').insert(articleValues);
    const { data: article, error: articleError } = await articleWrite.select('id').single();
    throwIfDatabaseError(articleError, 'Failed to write game recap article');
    if (!article?.id) throw new Error('Failed to write game recap article: missing article id');

    await rebuildArticleTags(supabase, {
      articleId: article.id,
      playerIds: taggedPlayerIds,
      starPlayerIds,
      teamIds: uniqueIds([gameData.homeTeam?.id, gameData.awayTeam?.id]),
      gameId,
    });

    const { error: completedLogError } = await supabase
      .from('ai_generation_log')
      .update({
        status: 'completed',
        article_id: article.id,
        error_message: null,
        tokens_used: usage?.total_tokens || null,
        model_used: model || 'gpt-4o-mini',
        generation_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('game_id', gameId)
      .eq('article_type', 'game_recap');
    throwIfDatabaseError(completedLogError, 'Failed to complete game recap generation log');

    return { success: true, article_id: article.id, title };
  } catch (error) {
    const { error: failedLogError } = await supabase
      .from('ai_generation_log')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        generation_time_ms: Date.now() - startTime,
      })
      .eq('game_id', gameId)
      .eq('article_type', 'game_recap');

    if (failedLogError) {
      throw new Error(
        `${error instanceof Error ? error.message : 'Game recap generation failed'}; failed to update generation log: ${failedLogError.message || 'database error'}`,
      );
    }
    throw error;
  }
}
