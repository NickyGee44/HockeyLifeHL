import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import {
  AnthropicRouteError,
  callAnthropicMessagesStream,
} from '@/lib/ai/anthropic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    leagueId: string;
    seasonId: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    currentConfig: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { leagueId, seasonId, messages, currentConfig } = body;

  if (!leagueId || !seasonId || !messages || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: 'Missing required fields: leagueId, seasonId, messages' },
      { status: 400 }
    );
  }

  // Verify league ownership
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch teams, venues, and season data server-side
  const [teamsRes, venuesRes, seasonRes] = await Promise.all([
    supabase
      .from('team_rosters')
      .select('team_id, teams:team_id(id, name, division_id)')
      .eq('season_id', seasonId)
      .eq('league_id', leagueId),
    supabase
      .from('venues')
      .select('id, name, address')
      .eq('league_id', leagueId),
    supabase
      .from('seasons')
      .select('start_date, end_date')
      .eq('id', seasonId)
      .single(),
  ]);

  // Deduplicate teams (team_rosters has one row per player)
  const teamsMap = new Map<string, { id: string; name: string; division_id: string | null }>();
  for (const row of teamsRes.data ?? []) {
    const team = row.teams as unknown as { id: string; name: string; division_id: string | null } | null;
    if (team && !teamsMap.has(team.id)) {
      teamsMap.set(team.id, team);
    }
  }
  const teams = Array.from(teamsMap.values());

  const venues = venuesRes.data ?? [];
  const seasonStartDate = seasonRes.data?.start_date ?? 'Unknown';
  const seasonEndDate = seasonRes.data?.end_date ?? 'Unknown';

  // Build system prompt
  const systemPrompt = `You are a schedule configuration assistant for a beer league hockey platform called Beer League Hockey (BLH).
You help league owners set up their game schedules by asking questions and translating their needs into configuration changes.

CURRENT CONFIGURATION:
${JSON.stringify(currentConfig, null, 2)}

AVAILABLE TEAMS (${teams.length}):
${teams.map(t => `- ${t.name}${t.division_id ? ` (Division: ${t.division_id})` : ''}`).join('\n')}

AVAILABLE VENUES (${venues.length}):
${venues.map(v => `- ${v.name}${v.address ? ` (${v.address})` : ''}`).join('\n')}

SEASON: ${seasonStartDate} to ${seasonEndDate}

You help owners customize their schedule. When they describe preferences, respond with:
1. A friendly, concise confirmation of what you understood
2. A JSON block wrapped in \`\`\`json ... \`\`\` with this shape:
{
  "configUpdates": { },
  "constraintConfig": { },
  "newConstraints": [],
  "summary": "Brief description"
}

CONFIG FIELD MAPPING:
- Game days -> "gameDays": [0-6] where 0=Sunday, 1=Monday... 6=Saturday
- Game times -> "gameTimes": ["19:00", "20:30"] in 24h HH:mm format
- Schedule type -> "scheduleType": "round_robin" | "double_round_robin" | "custom"
- Games per team -> "gamesPerTeam": number
- Date range -> "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"
- Bye weeks -> "allowByeWeeks": true, "byeWeeksPerTeam": 1-4
- Playoff format -> "playoffFormat": "none" | "single_elimination" | "best_of_3" | "best_of_5", "playoffTeams": number
- Default venue -> "defaultVenueId": "venue-uuid-here"
- Game duration -> "gameDurationMinutes": number

CONSTRAINT CONFIG MAPPING:
- Late night limit -> "lateNightStartTime": "22:00", "globalMaxLateNightGamesPerTeam": 0-10
- Early morning limit -> "earlyMorningEndTime": "10:00", "globalMaxEarlyMorningGamesPerTeam": 0-10
- Venue capacity -> "maxGamesPerVenuePerDay": number
- Seniority -> "enforceSeniorityPreferences": true/false
- Weekend balance -> "targetWeekendGamePercentage": 0-100

CONSTRAINT TYPES (for newConstraints array):
- Team blackout: { "constraint_type": "team_blackout", "team_id": "uuid", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "notes": "reason" }
- Venue blackout: { "constraint_type": "venue_blackout", "venue_id": "uuid", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "notes": "reason" }

RULES:
- Only include fields that need to change in configUpdates
- If the user's request is unclear, ask a clarifying question instead of guessing
- Keep responses concise (2-3 sentences + JSON block)
- If no config changes needed (just conversation), omit the JSON block
- Match venue/team names to the lists above when setting IDs`;

  // Validate messages - only allow user and assistant roles
  const validatedMessages = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }));

  if (validatedMessages.length === 0) {
    return NextResponse.json(
      { error: 'At least one message is required' },
      { status: 400 }
    );
  }

  try {
    const stream = await callAnthropicMessagesStream({
      feature: 'scheduleChat',
      system: systemPrompt,
      messages: validatedMessages,
      maxTokens: 1024,
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    if (error instanceof AnthropicRouteError) {
      return NextResponse.json(
        { error: error.userMessage },
        { status: error.status }
      );
    }

    console.error('Unexpected schedule chat error:', error);
    return NextResponse.json(
      { error: 'AI assistant is temporarily unavailable.' },
      { status: 500 }
    );
  }
}
