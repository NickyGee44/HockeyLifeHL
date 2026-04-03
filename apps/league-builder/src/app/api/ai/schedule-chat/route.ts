import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import {
  AnthropicRouteError,
  callAnthropicMessages,
} from '@/lib/ai/anthropic';
import { getSeasonParticipationTeams } from '@/lib/seasons/team-participation';
import type {
  ConfigPatch,
  ScheduleAssistantResponse,
  ScheduleConfig,
  ScheduleConstraint,
  ScheduleConstraintConfig,
} from '@/lib/schedule/types';

type ChatRequestBody = {
  leagueId: string;
  seasonId: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  currentConfig: Record<string, unknown>;
};

function extractAnthropicText(data: Awaited<ReturnType<typeof callAnthropicMessages>>) {
  return (data.content ?? [])
    .map((block) => block.text ?? '')
    .join('\n')
    .trim();
}

function tryParseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return null;
    }

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizePatch(value: unknown): ConfigPatch | null {
  if (!isRecord(value)) {
    return null;
  }

  const patch: ConfigPatch = {
    configUpdates: isRecord(value.configUpdates)
      ? (value.configUpdates as Partial<ScheduleConfig>)
      : {},
    newConstraints: Array.isArray(value.newConstraints)
      ? (value.newConstraints as Partial<ScheduleConstraint>[])
      : [],
    constraintConfig: isRecord(value.constraintConfig)
      ? (value.constraintConfig as Partial<ScheduleConstraintConfig>)
      : {},
    summary: typeof value.summary === 'string' ? value.summary : '',
  };

  const hasContent =
    Object.keys(patch.configUpdates).length > 0 ||
    patch.newConstraints.length > 0 ||
    Object.keys(patch.constraintConfig).length > 0 ||
    patch.summary.length > 0;

  return hasContent ? patch : null;
}

function normalizeAssistantResponse(value: unknown): ScheduleAssistantResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const reply =
    typeof value.reply === 'string'
      ? value.reply.trim()
      : '';

  const questions = Array.isArray(value.questions)
    ? value.questions
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

  const patch = normalizePatch(value.patch);

  return {
    reply:
      reply ||
      (questions.length > 0
        ? 'I need one or two details before I change the schedule settings.'
        : 'I reviewed the request and did not find a safe schedule change to apply yet.'),
    questions,
    patch,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { leagueId, seasonId, messages, currentConfig } = body;

  if (!leagueId || !seasonId || !Array.isArray(messages) || !isRecord(currentConfig)) {
    return NextResponse.json(
      { error: 'Missing required fields: leagueId, seasonId, messages, currentConfig' },
      { status: 400 }
    );
  }

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validatedMessages = messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role,
      content: String(message.content ?? '').slice(0, 4000),
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-12);

  if (validatedMessages.length === 0) {
    return NextResponse.json({ error: 'At least one message is required' }, { status: 400 });
  }

  const [teams, venuesResult, seasonResult] = await Promise.all([
    getSeasonParticipationTeams(supabase as any, leagueId, seasonId),
    supabase
      .from('venues')
      .select('id, name, address, number_of_rinks')
      .eq('league_id', leagueId)
      .order('name'),
    supabase
      .from('seasons')
      .select('start_date, end_date, name')
      .eq('id', seasonId)
      .eq('league_id', leagueId)
      .maybeSingle(),
  ]);

  const venueLines = (venuesResult.data ?? []).map((venue) => ({
    id: venue.id,
    name: venue.name,
    address: venue.address ?? '',
    rinkCount: venue.number_of_rinks ?? 1,
  }));

  const teamLines = teams.map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.short_name,
    divisionId: team.division_id,
    homeVenueId: team.home_venue_id,
  }));

  const systemPrompt = `You are a scheduling assistant for a recreational hockey league platform.

Your job is to help a league owner adjust schedule settings in plain English while staying safe and specific.

Return ONLY valid JSON. Do not include markdown fences, explanations outside the JSON, or any extra text.

The exact response shape must be:
{
  "reply": "Short plain-English response for the owner",
  "questions": ["optional clarifying question"],
  "patch": {
    "configUpdates": {},
    "newConstraints": [],
    "constraintConfig": {},
    "summary": "Short summary of what would change"
  }
}

Rules:
- If the owner request is ambiguous, keep "patch" as null and ask 1-2 short clarifying questions in "questions".
- Only include fields that actually need to change.
- Keep "reply" concise and owner-friendly.
- Use plain language. Avoid jargon like division-aware or time-slot category unless the owner already used it.
- Use the exact team and venue IDs from the data below when referencing specific teams or venues.
- "configUpdates" may include scheduleType, gamesPerTeam, allowBackToBack, homeAwayBalance, divisionGamesRatio, divisionAware, crossDivisionGamesPerTeam, gameDays, gameTimes, gameDurationMinutes, startDate, endDate, allowByeWeeks, byeWeeksPerTeam, defaultVenueId, rotateHomeVenue, skipHolidays, holidayDates, playoffFormat, playoffTeams, playoffQualificationMode, playoffPercentage.
- "newConstraints" may include partial constraint records. Use camelCase when possible. Valid constraintType values include "team_blackout" and "venue_blackout".
- "constraintConfig" may include lateNightStartTime, globalMaxLateNightGamesPerTeam, earlyMorningEndTime, globalMaxEarlyMorningGamesPerTeam, maxGamesPerVenuePerDay, enforceSeniorityPreferences, targetWeekendGamePercentage.
- If no change is needed, return "patch": null.

CURRENT CONFIG:
${JSON.stringify(currentConfig, null, 2)}

SEASON:
${JSON.stringify(
  {
    name: seasonResult.data?.name ?? 'Unknown season',
    startDate: seasonResult.data?.start_date ?? null,
    endDate: seasonResult.data?.end_date ?? null,
  },
  null,
  2
)}

PARTICIPATING TEAMS:
${JSON.stringify(teamLines, null, 2)}

AVAILABLE VENUES:
${JSON.stringify(venueLines, null, 2)}`;

  try {
    const data = await callAnthropicMessages({
      feature: 'scheduleChat',
      system: systemPrompt,
      messages: validatedMessages,
      maxTokens: 1200,
    });

    const textContent = extractAnthropicText(data);
    if (!textContent) {
      return NextResponse.json(
        { error: 'AI assistant is temporarily unavailable.' },
        { status: 502 }
      );
    }

    const parsed = tryParseJsonObject(textContent);
    const normalized = normalizeAssistantResponse(parsed);

    if (!normalized) {
      console.error('Failed to parse schedule assistant JSON:', textContent.slice(0, 500));
      return NextResponse.json(
        { error: 'AI assistant is temporarily unavailable.' },
        { status: 502 }
      );
    }

    return NextResponse.json(normalized);
  } catch (error) {
    if (error instanceof AnthropicRouteError) {
      return NextResponse.json({ error: error.userMessage }, { status: error.status });
    }

    console.error('Unexpected schedule chat error:', error);
    return NextResponse.json(
      { error: 'AI assistant is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
