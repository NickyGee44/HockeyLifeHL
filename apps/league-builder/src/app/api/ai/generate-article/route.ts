import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { hasAiNewsAddon } from '@/lib/utils/addon-helpers';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    leagueId: string;
    prompt: string;
    articleType: 'news' | 'game_recap' | 'weekly_wrap';
    seasonId?: string;
    gameId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { leagueId, prompt, articleType, seasonId, gameId } = body;

  if (!leagueId || !prompt || !articleType) {
    return NextResponse.json(
      { error: 'Missing required fields: leagueId, prompt, articleType' },
      { status: 400 }
    );
  }

  if (prompt.length > 2000) {
    return NextResponse.json(
      { error: 'Prompt must be 2000 characters or less' },
      { status: 400 }
    );
  }

  // Verify league ownership
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify AI News addon is active
  const hasAddon = await hasAiNewsAddon(leagueId);
  if (!hasAddon) {
    return NextResponse.json(
      { error: 'AI News Writer addon is required. Upgrade at Settings > Billing.' },
      { status: 403 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not configured');
    return NextResponse.json(
      { error: 'AI generation is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  // Fetch league name for context
  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', leagueId)
    .single();

  const leagueName = league?.name || 'the league';

  // Build stats context from player_ratings when seasonId is available
  let statsContext = '';
  if (seasonId) {
    try {
      const serviceClient = (await import('@/lib/supabase/server')).createServiceRoleClient();
      const [skatersRes, goaliesRes] = await Promise.all([
        serviceClient
          .from('player_ratings' as any)
          .select('player_id, rating, overall_percentile, games_played, stats_json')
          .eq('league_id', leagueId)
          .eq('season_id', seasonId)
          .eq('position', 'skater')
          .order('overall_percentile', { ascending: false })
          .limit(5),
        serviceClient
          .from('player_ratings' as any)
          .select('player_id, rating, overall_percentile, games_played, stats_json')
          .eq('league_id', leagueId)
          .eq('season_id', seasonId)
          .eq('position', 'goalie')
          .order('overall_percentile', { ascending: false })
          .limit(3),
      ]);

      const allPlayerIds = [
        ...(skatersRes.data ?? []).map((r: any) => r.player_id),
        ...(goaliesRes.data ?? []).map((r: any) => r.player_id),
      ];

      if (allPlayerIds.length > 0) {
        const [profilesRes, rostersRes, teamsRes] = await Promise.all([
          serviceClient.from('profiles').select('id, full_name').in('id', allPlayerIds),
          serviceClient
            .from('team_rosters')
            .select('player_id, team_id')
            .eq('league_id', leagueId)
            .eq('season_id', seasonId)
            .in('player_id', allPlayerIds),
          serviceClient.from('teams').select('id, name').eq('league_id', leagueId),
        ]);

        const nameById = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p.full_name || 'Unknown']));
        const teamById = new Map((teamsRes.data ?? []).map((t: any) => [t.id, t.name]));
        const teamByPlayer = new Map((rostersRes.data ?? []).map((r: any) => [r.player_id, r.team_id]));

        const formatSkater = (r: any, idx: number) => {
          const sj = (r.stats_json as Record<string, unknown>) ?? {};
          const pts = typeof sj.points === 'number' ? sj.points : 0;
          const name = nameById.get(r.player_id) || 'Unknown';
          const team = teamById.get(teamByPlayer.get(r.player_id) ?? '') || 'Unknown Team';
          return `${idx + 1}. ${name} (${team}) — ${r.games_played} GP, ${pts} PTS, ${r.rating} rated`;
        };

        const formatGoalie = (r: any, idx: number) => {
          const sj = (r.stats_json as Record<string, unknown>) ?? {};
          const svPct = typeof sj.savePct === 'number' ? sj.savePct.toFixed(3) : '—';
          const gaa = typeof sj.gaa === 'number' ? sj.gaa.toFixed(2) : '—';
          const wins = typeof sj.wins === 'number' ? sj.wins : 0;
          const shutouts = typeof sj.shutouts === 'number' ? sj.shutouts : 0;
          const name = nameById.get(r.player_id) || 'Unknown';
          const team = teamById.get(teamByPlayer.get(r.player_id) ?? '') || 'Unknown Team';
          return `${idx + 1}. ${name} (${team}) — ${r.games_played} GP, ${svPct} SV%, ${gaa} GAA, ${wins}W, ${shutouts} SO, ${r.rating} rated`;
        };

        const skaterLines = (skatersRes.data ?? []).map((r: any, i: number) => formatSkater(r, i));
        const goalieLines = (goaliesRes.data ?? []).map((r: any, i: number) => formatGoalie(r, i));

        if (skaterLines.length > 0 || goalieLines.length > 0) {
          statsContext = '\n\nREAL LEAGUE DATA — use these actual names and statistics in your article when relevant:\n';
          if (skaterLines.length > 0) {
            statsContext += `\nTop Skaters This Season:\n${skaterLines.join('\n')}`;
          }
          if (goalieLines.length > 0) {
            statsContext += `\n\nTop Goalies This Season:\n${goalieLines.join('\n')}`;
          }
          statsContext += '\n\nReference these players by name to make the article specific and accurate.';
        }
      }
    } catch {
      // Stats context is best-effort — article still generates without it
    }
  }

  const articleTypeLabels: Record<string, string> = {
    news: 'general news article',
    game_recap: 'game recap',
    weekly_wrap: 'weekly wrap-up / roundup',
  };

  const typeLabel = articleTypeLabels[articleType] || 'news article';

  const systemPrompt = `You are a hockey league sports journalist writing for "${leagueName}". Write engaging, professional sports journalism content.

Your task is to write a ${typeLabel} for a recreational/beer league hockey league.

Guidelines:
- Write in an engaging, energetic sports journalism style appropriate for recreational hockey
- Keep the tone fun and community-focused while still professional
- Use vivid language to describe plays and moments
- Include appropriate hockey terminology
- Keep articles concise but compelling (300-600 words for the content)
- The content should be plain text (no markdown formatting, no headers, no bullet points)
- Write in third person${statsContext}

You must respond with ONLY a valid JSON object in this exact format, with no other text before or after:
{"title": "Article Title Here", "content": "Full article content here...", "excerpt": "A brief 1-2 sentence summary for article cards."}`;

  const userPrompt = `Write a ${typeLabel} based on the following description:\n\n${prompt}${seasonId ? `\n\nSeason ID for reference: ${seasonId}` : ''}${gameId ? `\n\nGame ID for reference: ${gameId}` : ''}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to generate article. Please try again.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const textContent = data.content?.[0]?.text;

    if (!textContent) {
      return NextResponse.json(
        { error: 'No content generated. Please try again.' },
        { status: 502 }
      );
    }

    // Parse the JSON response from Claude
    let article: { title: string; content: string; excerpt: string };
    try {
      article = JSON.parse(textContent);
    } catch {
      // If JSON parsing fails, try to extract from the text
      console.error('Failed to parse AI response as JSON:', textContent);
      return NextResponse.json(
        { error: 'Failed to parse generated content. Please try again.' },
        { status: 502 }
      );
    }

    if (!article.title || !article.content) {
      return NextResponse.json(
        { error: 'Generated content was incomplete. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      title: article.title,
      content: article.content,
      excerpt: article.excerpt || '',
    });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return NextResponse.json(
      { error: 'Failed to generate article. Please try again.' },
      { status: 500 }
    );
  }
}
