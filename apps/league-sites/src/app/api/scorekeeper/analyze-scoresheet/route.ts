import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { createServiceRoleClient } from '@/lib/supabase/server';

const SCOREKEEPER_SESSION_COOKIE = 'sk_session';

async function verifySessionFromCookie(): Promise<{
  sessionId: string;
  gameId: string;
  leagueId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SCOREKEEPER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const normalized = token.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  if (!normalized) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await (supabase as any)
    .from('scorekeeper_sessions')
    .select('id, game_id, league_id, expires_at, is_active')
    .eq('token', normalized)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAtMs = new Date(data.expires_at as string).getTime();
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return null;

  return {
    sessionId: data.id,
    gameId: data.game_id,
    leagueId: data.league_id,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify scorekeeper session
    const session = await verifySessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid scorekeeper session' },
        { status: 401 }
      );
    }

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const gameId = formData.get('gameId') as string | null;
    const homeTeamName = formData.get('homeTeamName') as string | null;
    const awayTeamName = formData.get('awayTeamName') as string | null;
    const homeRosterJson = formData.get('homeRoster') as string | null;
    const awayRosterJson = formData.get('awayRoster') as string | null;

    if (!image || !gameId || !homeTeamName || !awayTeamName) {
      return NextResponse.json(
        { error: 'Missing required fields: image, gameId, homeTeamName, awayTeamName' },
        { status: 400 }
      );
    }

    // Validate file size (10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image must be under 10MB' },
        { status: 400 }
      );
    }

    // Parse rosters
    let homeRoster: Array<{ jerseyNumber: number; fullName: string }> = [];
    let awayRoster: Array<{ jerseyNumber: number; fullName: string }> = [];
    try {
      if (homeRosterJson) homeRoster = JSON.parse(homeRosterJson);
      if (awayRosterJson) awayRoster = JSON.parse(awayRosterJson);
    } catch {
      return NextResponse.json(
        { error: 'Invalid roster JSON' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Build roster reference for the prompt
    const homeRosterText = homeRoster
      .map((p) => `#${p.jerseyNumber} ${p.fullName}`)
      .join('\n');
    const awayRosterText = awayRoster
      .map((p) => `#${p.jerseyNumber} ${p.fullName}`)
      .join('\n');

    // Build valid jersey lists for disambiguation context
    const homeJerseys = homeRoster.map((p) => p.jerseyNumber).join(', ');
    const awayJerseys = awayRoster.map((p) => p.jerseyNumber).join(', ');

    const prompt = `You are an expert at reading handwritten hockey score sheets. Extract all goals and penalties from this photo.

IMPORTANT: Score sheets are often messy, smudged, or written in rushed handwriting. Apply these rules:

HOME TEAM: ${homeTeamName}
Home Roster:
${homeRosterText || '(no roster provided)'}
Valid home jersey numbers: ${homeJerseys || 'unknown'}

AWAY TEAM: ${awayTeamName}
Away Roster:
${awayRosterText || '(no roster provided)'}
Valid away jersey numbers: ${awayJerseys || 'unknown'}

HANDWRITING RULES:
- Common confusions: 1↔7, 3↔8, 6↔0, 4↔9, 11↔17, 2↔7
- If a digit is ambiguous, prefer the jersey number that exists on the team roster
- Numbers may be written outside boxes, crossed out, or overwritten — extract the final value
- Score sheets may be rotated, folded, or partially cut off — read whatever is visible
- Look for columns labeled "Goals", "Assists", "Penalties" or shorthand (G, A, PEN, PIM)

CONFIDENCE SCORING:
- For each event, rate your confidence: "high" (clearly legible), "medium" (best guess from context), "low" (barely readable)

TIME EXTRACTION:
- Times may be in formats: 12:34, 12.34, 12'34, or just minutes
- If time is unreadable, set timeMinutes and timeSeconds to 0
- Sanity check: time should be 0:00-20:00 per period

PENALTY TYPES (standardize to): Tripping, Hooking, Slashing, Cross-checking, Roughing, High-sticking, Holding, Interference, Boarding, Delay of game, Too many men, Unsportsmanlike conduct, Fighting, Misconduct

Return ONLY valid JSON in this format:
{
  "goals": [
    {
      "period": 1,
      "timeMinutes": 5,
      "timeSeconds": 30,
      "teamType": "home",
      "scorerJersey": 10,
      "assist1Jersey": 7,
      "assist2Jersey": null,
      "confidence": "high"
    }
  ],
  "penalties": [
    {
      "period": 1,
      "timeMinutes": 8,
      "timeSeconds": 0,
      "teamType": "home",
      "playerJersey": 15,
      "type": "Tripping",
      "minutes": 2,
      "confidence": "high"
    }
  ]
}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${image.type};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI analysis' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({
      goals: parsed.goals || [],
      penalties: parsed.penalties || [],
    });
  } catch (error) {
    console.error('Score sheet analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze score sheet' },
      { status: 500 }
    );
  }
}
