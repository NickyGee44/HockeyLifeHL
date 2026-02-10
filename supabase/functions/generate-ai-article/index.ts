import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getGameRecapSystemPrompt, getGameRecapUserPrompt, getWeeklyWrapSystemPrompt, getWeeklyWrapUserPrompt } from './prompts.ts';
import { gatherGameRecapData, gatherWeeklyWrapData, checkAddonActive } from './data-gathering.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in OpenAI response');

  return {
    parsed: JSON.parse(content),
    usage: result.usage,
    model: result.model,
  };
}

async function handleGameRecap(supabase: any, gameId: string) {
  // Check dedup
  const { data: existing } = await supabase
    .from('ai_generation_log')
    .select('id, status')
    .eq('game_id', gameId)
    .eq('article_type', 'game_recap')
    .maybeSingle();

  if (existing?.status === 'completed') {
    return { success: true, message: 'Game recap already exists', skipped: true };
  }

  // Gather game data
  const gameData = await gatherGameRecapData(supabase, gameId);
  if (!gameData) {
    return { success: false, error: 'Game not found or not completed' };
  }

  // Check addon
  const hasAddon = await checkAddonActive(supabase, gameData.league_id);
  if (!hasAddon) {
    return { success: false, error: 'AI News addon not active for this league' };
  }

  // Create or update log entry
  const logId = existing?.id;
  if (logId) {
    await supabase.from('ai_generation_log').update({ status: 'generating' }).eq('id', logId);
  } else {
    await supabase.from('ai_generation_log').insert({
      league_id: gameData.league_id,
      season_id: gameData.season_id,
      game_id: gameId,
      article_type: 'game_recap',
      status: 'generating',
    });
  }

  const startTime = Date.now();

  try {
    // Call OpenAI
    const systemPrompt = getGameRecapSystemPrompt();
    const userPrompt = getGameRecapUserPrompt(gameData);
    const { parsed, usage, model } = await callOpenAI(systemPrompt, userPrompt);

    const { title, excerpt, content, tagged_player_ids = [], star_player_ids = [] } = parsed;

    // Insert article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert({
        league_id: gameData.league_id,
        season_id: gameData.season_id,
        game_id: gameId,
        title,
        excerpt,
        content,
        slug: generateSlug(title),
        type: 'game_recap',
        published: true,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (articleError) throw articleError;

    // Insert player tags
    const allTaggedIds = [...new Set([...tagged_player_ids, ...star_player_ids])];
    if (allTaggedIds.length > 0) {
      const tags = allTaggedIds.map((playerId: string) => ({
        article_id: article.id,
        player_id: playerId,
        mention_type: star_player_ids.includes(playerId) ? 'star' : 'mentioned',
      }));

      await supabase.from('article_player_tags').insert(tags);
    }

    // Update log
    const generationTime = Date.now() - startTime;
    await supabase
      .from('ai_generation_log')
      .update({
        status: 'completed',
        article_id: article.id,
        tokens_used: usage?.total_tokens || null,
        model_used: model || 'gpt-4o-mini',
        generation_time_ms: generationTime,
        completed_at: new Date().toISOString(),
      })
      .eq('game_id', gameId)
      .eq('article_type', 'game_recap');

    return { success: true, article_id: article.id, title };
  } catch (error) {
    // Update log with failure
    await supabase
      .from('ai_generation_log')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        generation_time_ms: Date.now() - startTime,
      })
      .eq('game_id', gameId)
      .eq('article_type', 'game_recap');

    throw error;
  }
}

async function handleWeeklyWrapAll(supabase: any) {
  // Find all leagues with active ai_news addon
  const { data: addons } = await supabase
    .from('organization_addons')
    .select('organization_id')
    .eq('addon_type', 'ai_news')
    .in('status', ['active', 'trialing']);

  if (!addons || addons.length === 0) {
    return { success: true, message: 'No leagues with AI News addon', processed: 0 };
  }

  const orgIds = addons.map((a: any) => a.organization_id);

  // Get leagues for these orgs
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, organization_id')
    .in('organization_id', orgIds)
    .eq('status', 'active');

  if (!leagues || leagues.length === 0) {
    return { success: true, message: 'No active leagues found', processed: 0 };
  }

  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartDate = weekStart.toISOString().split('T')[0];

  const results = [];

  for (const league of leagues) {
    // Get divisions for this league
    const { data: divisions } = await supabase
      .from('divisions')
      .select('id, name')
      .eq('league_id', league.id);

    // If no divisions, treat the whole league as one "division" (null division_id)
    const divisionList = divisions && divisions.length > 0
      ? divisions
      : [{ id: null, name: null }];

    for (const division of divisionList) {
      try {
        // Check dedup
        const { data: existing } = await supabase
          .from('ai_generation_log')
          .select('id, status')
          .eq('league_id', league.id)
          .eq('article_type', 'weekly_wrap')
          .eq('week_start_date', weekStartDate);

        // Add division filter
        let dedupQuery = existing;
        if (division.id) {
          dedupQuery = existing?.filter((e: any) => e.division_id === division.id);
        }

        if (dedupQuery && dedupQuery.length > 0 && dedupQuery[0].status === 'completed') {
          results.push({ league_id: league.id, division_id: division.id, skipped: true });
          continue;
        }

        // Gather weekly data
        const weeklyData = await gatherWeeklyWrapData(
          supabase, league.id, division.id, weekStart, weekEnd
        );

        if (!weeklyData || weeklyData.games.length === 0) {
          results.push({ league_id: league.id, division_id: division.id, skipped: true, reason: 'no games' });
          continue;
        }

        // Create log entry
        await supabase.from('ai_generation_log').insert({
          league_id: league.id,
          season_id: weeklyData.season_id,
          division_id: division.id,
          article_type: 'weekly_wrap',
          week_start_date: weekStartDate,
          status: 'generating',
        });

        const startTime = Date.now();

        // Generate article
        const systemPrompt = getWeeklyWrapSystemPrompt();
        const userPrompt = getWeeklyWrapUserPrompt(weeklyData);
        const { parsed, usage, model } = await callOpenAI(systemPrompt, userPrompt);

        const { title, excerpt, content, tagged_player_ids = [], star_player_ids = [] } = parsed;

        // Insert article
        const { data: article } = await supabase
          .from('articles')
          .insert({
            league_id: league.id,
            season_id: weeklyData.season_id,
            division_id: division.id,
            title,
            excerpt,
            content,
            slug: generateSlug(title),
            type: 'weekly_wrap',
            published: true,
            published_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        // Insert player tags
        const allTaggedIds = [...new Set([...tagged_player_ids, ...star_player_ids])];
        if (allTaggedIds.length > 0 && article) {
          const tags = allTaggedIds.map((playerId: string) => ({
            article_id: article.id,
            player_id: playerId,
            mention_type: star_player_ids.includes(playerId) ? 'star' : 'mentioned',
          }));
          await supabase.from('article_player_tags').insert(tags);
        }

        // Update log
        await supabase
          .from('ai_generation_log')
          .update({
            status: 'completed',
            article_id: article?.id,
            tokens_used: usage?.total_tokens || null,
            model_used: model || 'gpt-4o-mini',
            generation_time_ms: Date.now() - startTime,
            completed_at: new Date().toISOString(),
          })
          .eq('league_id', league.id)
          .eq('division_id', division.id)
          .eq('week_start_date', weekStartDate)
          .eq('article_type', 'weekly_wrap');

        results.push({ league_id: league.id, division_id: division.id, article_id: article?.id, success: true });
      } catch (error) {
        console.error(`Weekly wrap failed for league ${league.id}, division ${division.id}:`, error);
        results.push({
          league_id: league.id,
          division_id: division.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  return { success: true, processed: results.length, results };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { action, game_id } = await req.json();

    let result;

    switch (action) {
      case 'game_recap':
        if (!game_id) {
          return new Response(
            JSON.stringify({ success: false, error: 'game_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await handleGameRecap(supabase, game_id);
        break;

      case 'weekly_wrap_all':
        result = await handleWeeklyWrapAll(supabase);
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
