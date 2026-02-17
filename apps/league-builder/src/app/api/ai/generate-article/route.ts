import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';

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
- Write in third person

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
