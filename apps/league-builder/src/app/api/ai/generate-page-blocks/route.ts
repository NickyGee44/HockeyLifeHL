import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';

type BlockType = 'heading' | 'text' | 'divider' | 'callout' | 'link';
type HeadingLevel = 'h1' | 'h2' | 'h3';
type CalloutStyle = 'info' | 'warning' | 'success';

type ContentBlock =
  | { id: string; type: 'heading'; level: HeadingLevel; text: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'divider' }
  | { id: string; type: 'callout'; text: string; style: CalloutStyle }
  | { id: string; type: 'link'; label: string; url: string };

function createId() {
  return `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBlocks(raw: unknown[]): ContentBlock[] {
  return raw.flatMap((item): ContentBlock[] => {
    if (!item || typeof item !== 'object') return [];
    const obj = item as Record<string, unknown>;
    const type = obj.type as BlockType;
    const id = createId();

    if (type === 'heading') {
      const level = obj.level === 'h1' || obj.level === 'h3' ? obj.level : 'h2';
      return [{ id, type: 'heading', level, text: String(obj.text || '') }];
    }
    if (type === 'text') return [{ id, type: 'text', text: String(obj.text || '') }];
    if (type === 'divider') return [{ id, type: 'divider' }];
    if (type === 'callout') {
      const style = obj.style === 'warning' || obj.style === 'success' ? obj.style : 'info';
      return [{ id, type: 'callout', style, text: String(obj.text || '') }];
    }
    if (type === 'link') {
      return [{ id, type: 'link', label: String(obj.label || 'Learn more'), url: String(obj.url || '#') }];
    }
    return [];
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { leagueId: string; prompt: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { leagueId, prompt } = body;

  if (!leagueId || !prompt?.trim()) {
    return NextResponse.json({ error: 'Missing required fields: leagueId, prompt' }, { status: 400 });
  }

  if (prompt.length > 1000) {
    return NextResponse.json({ error: 'Prompt must be 1000 characters or less' }, { status: 400 });
  }

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI is not configured. Contact support.' }, { status: 503 });
  }

  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', leagueId)
    .single();

  const leagueName = league?.name || 'the league';

  const systemPrompt = `You are a content writer helping build pages for a hockey league website called "${leagueName}".

Create structured page content using these block types (JSON format):
- Heading: { "type": "heading", "level": "h1"|"h2"|"h3", "text": "..." }
- Text paragraph: { "type": "text", "text": "..." }
- Visual divider: { "type": "divider" }
- Callout box: { "type": "callout", "style": "info"|"warning"|"success", "text": "..." }
- Button/link: { "type": "link", "label": "Button label", "url": "#" }

Rules:
- Use h1 for the main page heading (only once), h2 for sections, h3 for subsections
- Keep text blocks concise and focused — one idea per paragraph
- Do NOT create image blocks (images are uploaded separately)
- Use callouts sparingly for important notices only
- Keep the tone friendly and community-focused for recreational hockey
- Use links/buttons when referencing actions (e.g. "Register Now", "Contact Us")

Respond with ONLY a valid JSON object in this exact format, no other text:
{"title": "Page Title", "blocks": [...array of block objects...]}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Create a page about: ${prompt}` }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', response.status, err);
      return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 502 });
    }

    const data = await response.json();
    const textContent = data.content?.[0]?.text;

    if (!textContent) {
      return NextResponse.json({ error: 'No content generated. Please try again.' }, { status: 502 });
    }

    let parsed: { title?: string; blocks?: unknown[] };
    try {
      parsed = JSON.parse(textContent);
    } catch {
      console.error('Failed to parse AI response as JSON:', textContent.slice(0, 300));
      return NextResponse.json({ error: 'Failed to parse AI output. Please try again.' }, { status: 502 });
    }

    const blocks = normalizeBlocks(Array.isArray(parsed.blocks) ? parsed.blocks : []);

    return NextResponse.json({
      title: parsed.title || '',
      blocks,
    });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 });
  }
}
