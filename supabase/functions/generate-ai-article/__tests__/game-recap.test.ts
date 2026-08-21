import assert from 'node:assert/strict';
import test from 'node:test';
import { handleGameRecap } from '../game-recap.ts';
import { checkAddonActive, gatherGameRecapData } from '../data-gathering.ts';
import { getGameRecapSystemPrompt, getGameRecapUserPrompt } from '../prompts.ts';
import {
  buildGroundedUntimedGameRecap,
  generateGroundedOrAiGameRecap,
  hasCompleteGoalTiming,
} from '../grounded-recap.ts';

function createSupabase(resolveOperation) {
  const operations = [];

  function builder(operation) {
    const resolve = async () => {
      operations.push(operation);
      return resolveOperation(operation);
    };

    const query = {
      select(columns) {
        operation.selection = columns;
        return query;
      },
      eq(column, value) {
        operation.filters.push(['eq', column, value]);
        return query;
      },
      is(column, value) {
        operation.filters.push(['is', column, value]);
        return query;
      },
      in(column, value) {
        operation.filters.push(['in', column, value]);
        return query;
      },
      order(column, value) {
        operation.filters.push(['order', column, value]);
        return query;
      },
      maybeSingle: resolve,
      single: resolve,
      then(onFulfilled, onRejected) {
        return resolve().then(onFulfilled, onRejected);
      },
    };
    return query;
  }

  const supabase = {
    from(table) {
      return {
        select: (selection) => builder({ table, action: 'select', selection, filters: [] }),
        insert: (payload) => builder({ table, action: 'insert', payload, filters: [] }),
        update: (payload) => builder({ table, action: 'update', payload, filters: [] }),
        delete: () => builder({ table, action: 'delete', filters: [] }),
      };
    },
    async rpc(name, args) {
      const operation = { table: name, action: 'rpc', payload: args, filters: [] };
      operations.push(operation);
      return resolveOperation(operation);
    },
  };

  return { supabase, operations };
}

function generationDependencies(overrides = {}, operations = []) {
  return {
    gatherGameRecapData: async () => ({
      league_id: 'league-1',
      season_id: 'season-1',
      recapTone: 'competitive',
      homeTeam: { id: 'home-team' },
      awayTeam: { id: 'away-team' },
      goals: [{
        scorer_id: 'player-1',
        assist1_id: 'player-2',
        assist2_id: null,
      }],
      penalties: [],
      homeGoalie: null,
      awayGoalie: null,
    }),
    checkAddonActive: async () => true,
    generateArticle: async () => {
      operations.push({ action: 'generate' });
      return {
        parsed: {
          title: 'A Great Game',
          excerpt: 'Close throughout.',
          content: 'Full recap.',
          tagged_player_ids: ['player-1'],
          star_player_ids: ['player-1', 'player-2'],
        },
        usage: { total_tokens: 123 },
        model: 'test-model',
      };
    },
    ...overrides,
  };
}

test('non-force game recap keeps completed-log deduplication', async () => {
  const { supabase, operations } = createSupabase((operation) => {
    assert.equal(operation.table, 'ai_generation_log');
    return { data: { id: 'log-1', status: 'completed' }, error: null };
  });
  let generated = false;

  const result = await handleGameRecap(supabase, 'game-1', false, generationDependencies({
    generateArticle: async () => {
      generated = true;
      throw new Error('must not generate');
    },
  }));

  assert.deepEqual(result, {
    success: true,
    message: 'Game recap already exists',
    skipped: true,
  });
  assert.equal(generated, false);
  assert.equal(operations.length, 1);
});

test('force generates before touching the current published article', async () => {
  const { supabase, operations } = createSupabase((operation) => {
    if (operation.table === 'ai_generation_log' && operation.action === 'select') {
      return { data: { id: 'log-1', status: 'completed' }, error: null };
    }
    return { data: null, error: null };
  });

  await assert.rejects(
    handleGameRecap(supabase, 'game-1', true, generationDependencies({
      generateArticle: async () => {
        operations.push({ action: 'generate' });
        throw new Error('generation failed');
      },
    }, operations)),
    /generation failed/,
  );

  assert.equal(operations.some((operation) => operation.table === 'articles'), false);
  assert.equal(
    operations.some((operation) => operation.table?.startsWith('article_')),
    false,
  );
});

test('force updates an existing recap, rebuilds all tags, and completes the log', async () => {
  const { supabase, operations } = createSupabase((operation) => {
    if (operation.table === 'ai_generation_log' && operation.action === 'select') {
      return { data: { id: 'log-1', status: 'completed' }, error: null };
    }
    if (operation.table === 'articles' && operation.action === 'select') {
      return { data: { id: 'article-1' }, error: null };
    }
    if (operation.table === 'articles' && operation.action === 'update') {
      return { data: { id: 'article-1' }, error: null };
    }
    return { data: null, error: null };
  });

  const result = await handleGameRecap(
    supabase,
    'game-1',
    true,
    generationDependencies({}, operations),
  );

  assert.equal(result.article_id, 'article-1');
  assert.equal(operations.some((operation) => operation.table === 'articles' && operation.action === 'insert'), false);
  const generatedAt = operations.findIndex((operation) => operation.action === 'generate');
  const articleUpdatedAt = operations.findIndex(
    (operation) => operation.table === 'articles' && operation.action === 'update',
  );
  assert.ok(generatedAt >= 0 && articleUpdatedAt > generatedAt);

  for (const table of ['article_player_tags', 'article_team_tags', 'article_game_tags']) {
    assert.ok(operations.some((operation) => operation.table === table && operation.action === 'delete'));
    assert.ok(operations.some((operation) => operation.table === table && operation.action === 'insert'));
  }

  assert.ok(operations.some((operation) =>
    operation.table === 'ai_generation_log'
      && operation.action === 'update'
      && operation.payload.status === 'completed'
      && operation.payload.article_id === 'article-1'
  ));
});

test('force inserts a recap when none exists', async () => {
  const { supabase, operations } = createSupabase((operation) => {
    if (operation.table === 'ai_generation_log' && operation.action === 'select') {
      return { data: null, error: null };
    }
    if (operation.table === 'articles' && operation.action === 'select') {
      return { data: null, error: null };
    }
    if (operation.table === 'articles' && operation.action === 'insert') {
      return { data: { id: 'article-new' }, error: null };
    }
    return { data: null, error: null };
  });

  const result = await handleGameRecap(
    supabase,
    'game-1',
    true,
    generationDependencies({}, operations),
  );

  assert.equal(result.article_id, 'article-new');
  assert.ok(operations.some((operation) => operation.table === 'articles' && operation.action === 'insert'));
});

test('service-role tag writes discard AI-supplied player IDs outside the game', async () => {
  const { supabase, operations } = createSupabase((operation) => {
    if (operation.table === 'ai_generation_log' && operation.action === 'select') {
      return { data: { id: 'log-1', status: 'completed' }, error: null };
    }
    if (operation.table === 'articles' && operation.action === 'select') {
      return { data: { id: 'article-1' }, error: null };
    }
    if (operation.table === 'articles' && operation.action === 'update') {
      return { data: { id: 'article-1' }, error: null };
    }
    return { data: null, error: null };
  });

  await handleGameRecap(supabase, 'game-1', true, generationDependencies({
    generateArticle: async () => ({
      parsed: {
        title: 'A Great Game',
        excerpt: 'Close throughout.',
        content: 'Full recap.',
        tagged_player_ids: ['player-1', 'other-league-player'],
        star_player_ids: ['player-2', 'other-league-star'],
      },
    }),
  }, operations));

  const playerInsert = operations.find((operation) =>
    operation.table === 'article_player_tags' && operation.action === 'insert'
  );
  assert.deepEqual(
    playerInsert.payload.map((row) => row.player_id).sort(),
    ['player-1', 'player-2'],
  );
});

test('database errors during tag rebuilding are surfaced and fail the log', async () => {
  const { supabase, operations } = createSupabase((operation) => {
    if (operation.table === 'ai_generation_log' && operation.action === 'select') {
      return { data: { id: 'log-1', status: 'completed' }, error: null };
    }
    if (operation.table === 'articles' && operation.action === 'select') {
      return { data: { id: 'article-1' }, error: null };
    }
    if (operation.table === 'articles' && operation.action === 'update') {
      return { data: { id: 'article-1' }, error: null };
    }
    if (operation.table === 'article_player_tags' && operation.action === 'delete') {
      return { data: null, error: { message: 'tag delete failed' } };
    }
    return { data: null, error: null };
  });

  await assert.rejects(
    handleGameRecap(supabase, 'game-1', true, generationDependencies({}, operations)),
    /tag delete failed/,
  );
  assert.ok(operations.some((operation) =>
    operation.table === 'ai_generation_log'
      && operation.action === 'update'
      && operation.payload.status === 'failed'
  ));
});

test('null goal scorers are omitted from profile lookups and labeled as team goals', async () => {
  const { supabase, operations } = createSupabase((operation) => {
    if (operation.table === 'games') {
      return {
        data: {
          id: 'game-1',
          league_id: 'league-1',
          season_id: 'season-1',
          status: 'completed',
          home_score: 1,
          away_score: 0,
          home_team_id: 'home-team',
          away_team_id: 'away-team',
          home_team: { id: 'home-team', name: 'Home' },
          away_team: { id: 'away-team', name: 'Away' },
        },
        error: null,
      };
    }
    if (operation.table === 'game_events') {
      return {
        data: [{
          event_type: 'goal',
          period: 1,
          game_time_seconds: 60,
          team_id: 'home-team',
          player_id: null,
          assist1_player_id: null,
          assist2_player_id: null,
        }],
        error: null,
      };
    }
    if (operation.table === 'goalie_stats') return { data: [], error: null };
    if (operation.table === 'get_team_standings') return { data: [], error: null };
    if (operation.table === 'leagues') {
      return {
        data: { recap_tone: 'competitive', timezone: 'America/Toronto' },
        error: null,
      };
    }
    if (operation.table === 'profiles') throw new Error('null scorer must not trigger a profile lookup');
    throw new Error(`Unexpected operation: ${operation.table}`);
  });

  const data = await gatherGameRecapData(supabase, 'game-1');

  assert.equal(operations.some((operation) => operation.table === 'profiles'), false);
  assert.equal(data.goals[0].scorer_name, 'Team Goal');
});

test('required recap data query errors are surfaced', async () => {
  const gameFailure = createSupabase((operation) => {
    if (operation.table === 'games') {
      return { data: null, error: { message: 'game query failed' } };
    }
    throw new Error(`Unexpected operation: ${operation.table}`);
  });
  await assert.rejects(
    gatherGameRecapData(gameFailure.supabase, 'game-1'),
    /game query failed/,
  );

  const eventFailure = createSupabase((operation) => {
    if (operation.table === 'games') {
      return {
        data: {
          id: 'game-1',
          league_id: 'league-1',
          season_id: 'season-1',
          status: 'completed',
          home_team_id: 'home-team',
          away_team_id: 'away-team',
          home_team: { id: 'home-team', name: 'Home' },
          away_team: { id: 'away-team', name: 'Away' },
        },
        error: null,
      };
    }
    if (operation.table === 'game_events') {
      return { data: null, error: { message: 'events query failed' } };
    }
    throw new Error(`Unexpected operation: ${operation.table}`);
  });
  await assert.rejects(
    gatherGameRecapData(eventFailure.supabase, 'game-1'),
    /events query failed/,
  );
});

test('AI News addon lookup errors are surfaced', async () => {
  const { supabase } = createSupabase((operation) => {
    if (operation.table === 'leagues') {
      return { data: null, error: { message: 'league addon query failed' } };
    }
    throw new Error(`Unexpected operation: ${operation.table}`);
  });

  await assert.rejects(
    checkAddonActive(supabase, 'league-1'),
    /league addon query failed/,
  );
});

test('game recap prompt allows colour without inventing recorded hockey facts', () => {
  const prompt = getGameRecapSystemPrompt('competitive');

  assert.match(prompt, /fictionalized colour/i);
  assert.match(prompt, /never invent/i);
  assert.match(prompt, /scores, player names, goals, assists, penalties, and saves/i);
});

test('game recap prompt uses the league timezone and marks missing timing as unordered', () => {
  const prompt = getGameRecapUserPrompt({
    homeTeam: { name: 'Home' },
    awayTeam: { name: 'Away' },
    homeScore: 1,
    awayScore: 1,
    scheduledAt: '2026-08-21T00:30:00.000Z',
    timezone: 'America/Toronto',
    goals: [
      {
        period: 1,
        time: null,
        scorer_name: 'Home Scorer',
        scorer_id: 'home-scorer',
        team_name: 'Home',
      },
      {
        period: 1,
        time: null,
        scorer_name: 'Away Scorer',
        scorer_id: 'away-scorer',
        team_name: 'Away',
      },
    ],
    penalties: [],
  });

  assert.match(prompt, /Thursday, August 20, 2026/);
  assert.match(prompt, /not chronological/i);
  assert.doesNotMatch(prompt, /- P1/);
});

test('untimed games use a deterministic recap built only from recorded facts', () => {
  const gameData = {
    homeTeam: { id: 'home-team', name: 'Home' },
    awayTeam: { id: 'away-team', name: 'Away' },
    homeScore: 2,
    awayScore: 1,
    scheduledAt: '2026-08-21T00:30:00.000Z',
    timezone: 'America/Toronto',
    venue: 'The Barn',
    goals: [
      {
        team_id: 'away-team',
        scorer_id: 'away-scorer',
        scorer_name: 'Away Scorer',
        assist1_id: null,
        assist1_name: null,
        assist2_id: null,
        assist2_name: null,
        period: 1,
        time: null,
      },
      {
        team_id: 'home-team',
        scorer_id: 'home-scorer',
        scorer_name: 'Home Scorer',
        assist1_id: 'helper',
        assist1_name: 'Helpful Player',
        assist2_id: 'helper',
        assist2_name: 'Helpful Player',
        period: 1,
        time: null,
      },
      {
        team_id: 'home-team',
        scorer_id: 'home-scorer',
        scorer_name: 'Home Scorer',
        assist1_id: null,
        assist1_name: null,
        assist2_id: null,
        assist2_name: null,
        period: 1,
        time: null,
      },
    ],
  };

  assert.equal(hasCompleteGoalTiming(gameData), false);
  const result = buildGroundedUntimedGameRecap(gameData);
  assert.equal(result.model, 'grounded-template-v1');
  assert.match(result.parsed.content, /Thursday, August 20, 2026/);
  assert.match(result.parsed.content, /\*\*Home Scorer\*\* — 2 goals/);
  assert.match(result.parsed.content, /\*\*Away Scorer\*\* — 1 goal/);
  assert.match(result.parsed.content, /\*\*Helpful Player\*\* — 1 assist/);
  assert.doesNotMatch(
    `${result.parsed.title}\n${result.parsed.excerpt}\n${result.parsed.content}`,
    /Friday|first period|intermission|minute mark|took the lead|comeback/i,
  );
  assert.deepEqual(result.parsed.star_player_ids, ['home-scorer']);
  assert.deepEqual(
    [...result.parsed.tagged_player_ids].sort(),
    ['away-scorer', 'helper', 'home-scorer'],
  );
});

test('grounded recap fails closed when goal events do not reconcile to the final score', () => {
  assert.throws(
    () => buildGroundedUntimedGameRecap({
      homeTeam: { id: 'home-team', name: 'Home' },
      awayTeam: { id: 'away-team', name: 'Away' },
      homeScore: 1,
      awayScore: 0,
      scheduledAt: '2026-08-21T00:30:00.000Z',
      timezone: 'America/Toronto',
      goals: [],
    }),
    /do not match the final score/i,
  );
});

test('complete goal timing keeps the AI generation path eligible', async () => {
  const gameData = {
    homeTeam: { id: 'home-team', name: 'Home' },
    awayTeam: { id: 'away-team', name: 'Away' },
    homeScore: 1,
    awayScore: 0,
    goals: [{
      team_id: 'home-team',
      scorer_id: 'home-scorer',
      scorer_name: 'Home Scorer',
      period: 1,
      time: '12:34',
    }],
  };
  let aiCalled = false;

  assert.equal(hasCompleteGoalTiming(gameData), true);
  const result = await generateGroundedOrAiGameRecap(gameData, async () => {
    aiCalled = true;
    return { parsed: { title: 'AI result' } };
  });

  assert.equal(aiCalled, true);
  assert.equal(result.parsed.title, 'AI result');
});

test('score reconciliation runs before the complete-timing AI path', async () => {
  let aiCalled = false;
  await assert.rejects(
    generateGroundedOrAiGameRecap({
      homeTeam: { id: 'home-team', name: 'Home' },
      awayTeam: { id: 'away-team', name: 'Away' },
      homeScore: 2,
      awayScore: 0,
      goals: [{
        team_id: 'home-team',
        scorer_id: 'home-scorer',
        scorer_name: 'Home Scorer',
        period: 1,
        time: '12:34',
      }],
    }, async () => {
      aiCalled = true;
      return { parsed: { title: 'must not run' } };
    }),
    /do not match the final score/i,
  );
  assert.equal(aiCalled, false);
});

test('foreign-team goal events fail closed before aggregation', () => {
  assert.throws(
    () => buildGroundedUntimedGameRecap({
      homeTeam: { id: 'home-team', name: 'Home' },
      awayTeam: { id: 'away-team', name: 'Away' },
      homeScore: 1,
      awayScore: 0,
      scheduledAt: '2026-08-21T00:30:00.000Z',
      timezone: 'America/Toronto',
      goals: [
        { team_id: 'home-team', scorer_id: 'home-scorer', scorer_name: 'Home Scorer' },
        { team_id: 'foreign-team', scorer_id: 'foreign-scorer', scorer_name: 'Foreign Scorer' },
      ],
    }),
    /not assigned to either game team/i,
  );
});

test('scoreless games use the grounded path without invoking AI', async () => {
  let aiCalled = false;
  const result = await generateGroundedOrAiGameRecap({
    homeTeam: { id: 'home-team', name: 'Home' },
    awayTeam: { id: 'away-team', name: 'Away' },
    homeScore: 0,
    awayScore: 0,
    scheduledAt: '2026-08-21T00:30:00.000Z',
    timezone: 'America/Toronto',
    goals: [],
  }, async () => {
    aiCalled = true;
    return { parsed: { title: 'must not run' } };
  });

  assert.equal(aiCalled, false);
  assert.equal(result.model, 'grounded-template-v1');
  assert.match(result.parsed.title, /0-0 Draw/);
});
