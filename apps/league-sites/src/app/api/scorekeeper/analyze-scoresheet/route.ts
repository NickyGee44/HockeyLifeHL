import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import { createServiceRoleClient } from '@/lib/supabase/server';

const SCOREKEEPER_SESSION_COOKIE = 'sk_session';

interface OcrGoalResponse {
  period?: number;
  timeMinutes?: number;
  timeSeconds?: number;
  teamType?: 'home' | 'away';
  scorerJersey?: number;
  assist1Jersey?: number | null;
  assist2Jersey?: number | null;
  confidence?: 'high' | 'medium' | 'low';
}

interface OcrPenaltyResponse {
  period?: number;
  timeMinutes?: number;
  timeSeconds?: number;
  teamType?: 'home' | 'away';
  playerJersey?: number;
  type?: string;
  minutes?: number;
  confidence?: 'high' | 'medium' | 'low';
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function eventKeyGoal(goal: OcrGoalResponse): string {
  return [
    goal.period ?? 0,
    goal.timeMinutes ?? 0,
    goal.timeSeconds ?? 0,
    goal.teamType ?? '',
    goal.scorerJersey ?? 0,
    goal.assist1Jersey ?? 0,
    goal.assist2Jersey ?? 0,
  ].join('|');
}

function eventKeyPenalty(penalty: OcrPenaltyResponse): string {
  return [
    penalty.period ?? 0,
    penalty.timeMinutes ?? 0,
    penalty.timeSeconds ?? 0,
    penalty.teamType ?? '',
    penalty.playerJersey ?? 0,
    penalty.type ?? '',
    penalty.minutes ?? 0,
  ].join('|');
}

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
    const imagesFromArray = formData
      .getAll('images')
      .filter((item): item is File => item instanceof File);
    const singleImage = formData.get('image');
    const images = [...imagesFromArray];
    if (images.length === 0 && singleImage instanceof File) {
      images.push(singleImage);
    }
    const gameId = formData.get('gameId') as string | null;
    const homeTeamName = formData.get('homeTeamName') as string | null;
    const awayTeamName = formData.get('awayTeamName') as string | null;
    const homeRosterJson = formData.get('homeRoster') as string | null;
    const awayRosterJson = formData.get('awayRoster') as string | null;

    if (images.length === 0 || !gameId || !homeTeamName || !awayTeamName) {
      return NextResponse.json(
        { error: 'Missing required fields: images/image, gameId, homeTeamName, awayTeamName' },
        { status: 400 }
      );
    }
    if (gameId !== session.gameId) {
      return NextResponse.json(
        { error: 'Game ID does not match active scorekeeper session' },
        { status: 403 }
      );
    }

    if (images.length > 8) {
      return NextResponse.json(
        { error: 'You can upload up to 8 scoresheet images per submission' },
        { status: 400 }
      );
    }

    for (const image of images) {
      if (!image.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'All files must be image files' },
          { status: 400 }
        );
      }
      if (image.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Each image must be under 10MB' },
          { status: 400 }
        );
      }
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

    // Upload each image to storage BEFORE OCR so photos are preserved even if analysis fails
    const supabaseService = createServiceRoleClient();
    const imagePayloads: Array<{ file: File; base64: string }> = [];
    const scoresheetImageUrls: string[] = [];

    for (const image of images) {
      const arrayBuffer = await image.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      imagePayloads.push({ file: image, base64 });

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const ext = image.type === 'image/png' ? 'png' : 'jpg';
      const storagePath = `${session.leagueId}/${session.gameId}/${timestamp}-${randomSuffix}.${ext}`;

      try {
        const { error: uploadError } = await (supabaseService as any).storage
          .from('game-scoresheets')
          .upload(storagePath, arrayBuffer, { contentType: image.type, upsert: false });

        if (!uploadError) {
          const { data: urlData } = (supabaseService as any).storage
            .from('game-scoresheets')
            .getPublicUrl(storagePath);
          const scoresheetImageUrl = urlData?.publicUrl ?? null;

          if (scoresheetImageUrl) {
            scoresheetImageUrls.push(scoresheetImageUrl);
            await (supabaseService as any)
              .from('game_scoresheets')
              .insert({
                game_id: session.gameId,
                league_id: session.leagueId,
                image_url: scoresheetImageUrl,
                storage_path: storagePath,
              });
          }
        }
      } catch {
        console.warn('Scoresheet storage upload failed (non-fatal)');
      }
    }

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

STRUCTURED TEMPLATE (if this appears to be an official HockeyLife score sheet):
- TWO-COLUMN LAYOUT: the sheet is split vertically — left column = HOME team, right column = AWAY team.
  Use column position to determine teamType. Do NOT try to read a written "H" or "A".
- NUMBERED PENALTY CODES: scorekeepers write a number 1–14 in the Code box:
  1=Tripping, 2=Hooking, 3=Slashing, 4=Cross-checking, 5=Roughing, 6=High-sticking, 7=Holding,
  8=Interference, 9=Boarding, 10=Delay of game, 11=Too many men, 12=Unsportsmanlike conduct,
  13=Fighting, 14=Misconduct
  If you see a 1–14 number in the penalty Code column, map it to the type name above.
- TIME FORMAT: pre-printed ___:___ boxes — the number before the colon is minutes, after is seconds.
If the sheet does NOT appear to be this structured template, use your standard handwriting rules above.

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

    const mergedGoals: OcrGoalResponse[] = [];
    const mergedPenalties: OcrPenaltyResponse[] = [];
    const seenGoals = new Set<string>();
    const seenPenalties = new Set<string>();

    for (let i = 0; i < imagePayloads.length; i += 1) {
      const current = imagePayloads[i];
      const perImagePrompt = `${prompt}\n\nThis is photo ${i + 1} of ${imagePayloads.length}. Extract only what is visible in this photo.`;
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: perImagePrompt },
              {
                type: 'image_url',
                image_url: { url: `data:${current.file.type};base64,${current.base64}` },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        continue;
      }

      const payload = (parsed ?? {}) as {
        goals?: OcrGoalResponse[];
        penalties?: OcrPenaltyResponse[];
      };

      for (const goal of asArray<OcrGoalResponse>(payload.goals)) {
        const key = eventKeyGoal(goal);
        if (!seenGoals.has(key)) {
          seenGoals.add(key);
          mergedGoals.push(goal);
        }
      }

      for (const penalty of asArray<OcrPenaltyResponse>(payload.penalties)) {
        const key = eventKeyPenalty(penalty);
        if (!seenPenalties.has(key)) {
          seenPenalties.add(key);
          mergedPenalties.push(penalty);
        }
      }
    }

    return NextResponse.json({
      goals: mergedGoals,
      penalties: mergedPenalties,
      scoresheetImageUrl: scoresheetImageUrls[0] ?? null,
      scoresheetImageUrls,
      analyzedImageCount: imagePayloads.length,
      savedImageCount: scoresheetImageUrls.length,
    });
  } catch (error) {
    console.error('Score sheet analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze score sheet' },
      { status: 500 }
    );
  }
}
