'use server';

import { revalidatePath } from 'next/cache';
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/server';

type TeamReturnRecordStatus =
  | 'pending_outreach'
  | 'contacted'
  | 'interested'
  | 'follow_up_needed'
  | 'confirmed'
  | 'declined';

type RegistrationFacingTeamStatus =
  | 'confirmed'
  | 'pending_team_return'
  | 'team_not_returning';

type SeasonSummaryRow = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
};

type TeamReturnRow = {
  id: string;
  league_id: string;
  season_id: string;
  team_id: string;
  status: TeamReturnRecordStatus;
  owner_flag: string;
  captain_profile_id: string | null;
  captain_name: string | null;
  captain_email: string | null;
  notes: string | null;
  internal_notes: string | null;
  declined_reason: string | null;
  last_contacted_at: string | null;
  last_response_at: string | null;
  confirmed_at: string | null;
  declined_at: string | null;
  metadata: Record<string, unknown> | null;
};

type RegistrationDraftLike = {
  requested_team_id?: string | null;
  previous_team_id?: string | null;
  requested_team_name?: string | null;
  previous_team_name?: string | null;
  team_return_status?: string | null;
};

type PendingRegistrationRow = {
  id: string;
  team_id: string | null;
  draft_data: RegistrationDraftLike | null;
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface CaptainTeamReturnEntry {
  recordId: string;
  teamId: string;
  teamName: string;
  teamSlug: string | null;
  divisionName: string | null;
  status: TeamReturnRecordStatus;
  captainName: string | null;
  captainEmail: string | null;
  sharedNote: string | null;
  declinedReason: string | null;
  captainResponseNote: string | null;
  captainResponseAt: string | null;
  lastContactedAt: string | null;
  lastResponseAt: string | null;
  waitingPlayerCount: number;
  confirmedPlayerCount: number;
  teamNotReturningPlayerCount: number;
}

export interface CaptainTeamReturnOverview {
  league: {
    id: string;
    name: string;
    slug: string;
  };
  targetSeason: SeasonSummaryRow | null;
  sourceSeason: SeasonSummaryRow | null;
  entries: CaptainTeamReturnEntry[];
}

function byNewestStart(a: SeasonSummaryRow, b: SeasonSummaryRow) {
  const aTime = a.start_date ? new Date(a.start_date).getTime() : 0;
  const bTime = b.start_date ? new Date(b.start_date).getTime() : 0;
  return bTime - aTime;
}

function pickTargetSeason(seasons: SeasonSummaryRow[], seasonId?: string): SeasonSummaryRow | null {
  if (seasons.length === 0) return null;
  if (seasonId) {
    return seasons.find((season) => season.id === seasonId) ?? null;
  }

  const upcoming = seasons
    .filter((season) => season.status === 'upcoming')
    .sort((a, b) => {
      const aTime = a.start_date ? new Date(a.start_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.start_date ? new Date(b.start_date).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })[0];

  if (upcoming) return upcoming;

  const draft = seasons.filter((season) => season.status === 'draft').sort(byNewestStart)[0];
  if (draft) return draft;

  const operational = seasons
    .filter((season) => season.status === 'active' || season.status === 'playoffs')
    .sort(byNewestStart)[0];

  return operational ?? seasons.sort(byNewestStart)[0] ?? null;
}

function pickSourceSeason(
  seasons: SeasonSummaryRow[],
  targetSeason: SeasonSummaryRow | null
): SeasonSummaryRow | null {
  if (!targetSeason) return null;

  const targetTime = targetSeason.start_date
    ? new Date(targetSeason.start_date).getTime()
    : Number.MAX_SAFE_INTEGER;

  return seasons
    .filter((season) => season.id !== targetSeason.id)
    .filter((season) => {
      const seasonTime = season.start_date ? new Date(season.start_date).getTime() : 0;
      return seasonTime <= targetTime;
    })
    .sort(byNewestStart)[0] ?? null;
}

function getRegistrationTeamKey(draftData: RegistrationDraftLike | null | undefined): string | null {
  if (!draftData) return null;
  return draftData.previous_team_id || draftData.requested_team_id || null;
}

function mapReturnRecordToRegistrationStatus(
  status: TeamReturnRecordStatus | null | undefined
): RegistrationFacingTeamStatus {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'declined') return 'team_not_returning';
  return 'pending_team_return';
}

async function getLeagueAndUser(leagueSlug: string) {
  const authSupabase = await createAuthClient();
  const serviceSupabase = createServiceRoleClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    throw new Error('You need to sign in to manage team returns.');
  }

  const { data: league, error: leagueError } = await serviceSupabase
    .from('leagues')
    .select('id, name, slug')
    .eq('slug', leagueSlug)
    .single();

  if (leagueError || !league) {
    throw new Error('League not found.');
  }

  return { user, league, serviceSupabase };
}

async function getAuthorizedCaptainTeamIds(params: {
  leagueId: string;
  userId: string;
}) {
  const { leagueId, userId } = params;
  const serviceSupabase = createServiceRoleClient();

  const [captainedTeams, rosterLeadership, returnLeadership] = await Promise.all([
    serviceSupabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .eq('captain_id', userId),
    serviceSupabase
      .from('team_rosters')
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('player_id', userId)
      .eq('status', 'active')
      .in('leadership_role', ['captain', 'alternate_captain']),
    ((serviceSupabase.from as any)('season_team_returns'))
      .select('team_id')
      .eq('league_id', leagueId)
      .eq('captain_profile_id', userId),
  ]);

  return [
    ...(captainedTeams.data ?? []).map((row: { id: string }) => row.id),
    ...(rosterLeadership.data ?? []).map((row: { team_id: string | null }) => row.team_id),
    ...(returnLeadership.data ?? []).map((row: { team_id: string | null }) => row.team_id),
  ].filter((teamId, index, array): teamId is string => Boolean(teamId) && array.indexOf(teamId) === index);
}

async function loadRegistrationsForReturnSeason(leagueId: string, seasonId: string) {
  const serviceSupabase = createServiceRoleClient();
  const { data, error } = await (serviceSupabase.from('registration_submissions') as any)
    .select('id, team_id, draft_data')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .in('status', ['pending', 'approved', 'waitlisted'])
    .not('submitted_at', 'is', null);

  if (error) {
    throw new Error('Failed to load team-return registrations.');
  }

  return (data ?? []) as PendingRegistrationRow[];
}

async function syncRegistrationStateForTeam(params: {
  leagueId: string;
  seasonId: string;
  teamId: string;
  teamName: string;
  registrationStatus: RegistrationFacingTeamStatus;
}) {
  const { leagueId, seasonId, teamId, teamName, registrationStatus } = params;
  const serviceSupabase = createServiceRoleClient();
  const registrations = await loadRegistrationsForReturnSeason(leagueId, seasonId);

  const matching = registrations.filter((registration) => {
    const key = getRegistrationTeamKey(registration.draft_data);
    return key === teamId;
  });

  if (matching.length === 0) {
    return;
  }

  await Promise.all(
    matching.map(async (registration) => {
      const draftData = (registration.draft_data ?? {}) as RegistrationDraftLike;
      const updatedDraft = {
        ...draftData,
        team_return_status: registrationStatus,
        requested_team_name: draftData.requested_team_name || teamName,
        previous_team_name: draftData.previous_team_name || teamName,
        team_return_status_updated_at: new Date().toISOString(),
      };

      const updatePayload: Record<string, unknown> = {
        draft_data: updatedDraft,
      };

      if (registrationStatus === 'confirmed') {
        updatePayload.team_id = teamId;
      } else if (registrationStatus === 'team_not_returning') {
        updatePayload.team_id = null;
      }

      const { error } = await (serviceSupabase.from('registration_submissions') as any)
        .update(updatePayload)
        .eq('id', registration.id);

      if (error) {
        throw error;
      }
    })
  );
}

export async function getCaptainTeamReturnRequests(params: {
  leagueSlug: string;
  seasonId?: string;
  teamId?: string;
}): Promise<ActionResult<CaptainTeamReturnOverview>> {
  try {
    const { user, league, serviceSupabase } = await getLeagueAndUser(params.leagueSlug);

    const { data: seasons, error: seasonsError } = await serviceSupabase
      .from('seasons')
      .select('id, name, status, start_date, registration_opens_at, registration_closes_at')
      .eq('league_id', league.id)
      .order('start_date', { ascending: false });

    if (seasonsError) {
      throw new Error('Failed to load seasons.');
    }

    const seasonRows = (seasons ?? []) as SeasonSummaryRow[];
    const targetSeason = pickTargetSeason(seasonRows, params.seasonId);
    const sourceSeason = pickSourceSeason(seasonRows, targetSeason);

    if (!targetSeason) {
      return {
        success: true,
        data: {
          league,
          targetSeason: null,
          sourceSeason: null,
          entries: [],
        },
      };
    }

    const authorizedTeamIds = await getAuthorizedCaptainTeamIds({
      leagueId: league.id,
      userId: user.id,
    });

    if (authorizedTeamIds.length === 0) {
      return {
        success: true,
        data: {
          league,
          targetSeason,
          sourceSeason,
          entries: [],
        },
      };
    }

    const filteredTeamIds = params.teamId
      ? authorizedTeamIds.filter((teamId) => teamId === params.teamId)
      : authorizedTeamIds;

    if (filteredTeamIds.length === 0) {
      return { success: false, error: 'You are not authorized to respond for that team.' };
    }

    const [{ data: rows }, registrations, { data: teamRows }] = await Promise.all([
      ((serviceSupabase.from as any)('season_team_returns'))
        .select('*')
        .eq('league_id', league.id)
        .eq('season_id', targetSeason.id)
        .in('team_id', filteredTeamIds)
        .order('updated_at', { ascending: false }),
      loadRegistrationsForReturnSeason(league.id, targetSeason.id),
      serviceSupabase
        .from('teams')
        .select('id, name, slug, divisions(name)')
        .eq('league_id', league.id)
        .in('id', filteredTeamIds),
    ]);

    const teamById = new Map<string, { name: string; slug: string | null; divisionName: string | null }>(
      (teamRows ?? []).map((team: any) => [
        team.id,
        {
          name: team.name,
          slug: team.slug ?? null,
          divisionName: Array.isArray(team.divisions)
            ? team.divisions[0]?.name ?? null
            : team.divisions?.name ?? null,
        },
      ])
    );

    const registrationCounts = new Map<
      string,
      { waiting: number; confirmed: number; notReturning: number }
    >();

    for (const registration of registrations) {
      const teamId = getRegistrationTeamKey(registration.draft_data);
      if (!teamId) continue;

      const current = registrationCounts.get(teamId) ?? {
        waiting: 0,
        confirmed: 0,
        notReturning: 0,
      };

      switch ((registration.draft_data?.team_return_status as string | undefined) ?? 'pending_team_return') {
        case 'confirmed':
          current.confirmed += 1;
          break;
        case 'team_not_returning':
          current.notReturning += 1;
          break;
        default:
          current.waiting += 1;
          break;
      }

      registrationCounts.set(teamId, current);
    }

    const entries = ((rows ?? []) as TeamReturnRow[]).map((row) => {
      const team = teamById.get(row.team_id);
      const counts = registrationCounts.get(row.team_id) ?? {
        waiting: 0,
        confirmed: 0,
        notReturning: 0,
      };

      return {
        recordId: row.id,
        teamId: row.team_id,
        teamName: team?.name ?? 'Team',
        teamSlug: team?.slug ?? null,
        divisionName: team?.divisionName ?? null,
        status: row.status,
        captainName: row.captain_name,
        captainEmail: row.captain_email,
        sharedNote: row.notes,
        declinedReason: row.declined_reason,
        captainResponseNote:
          typeof row.metadata?.captain_response_note === 'string'
            ? row.metadata.captain_response_note
            : null,
        captainResponseAt:
          typeof row.metadata?.captain_response_at === 'string'
            ? row.metadata.captain_response_at
            : null,
        lastContactedAt: row.last_contacted_at,
        lastResponseAt: row.last_response_at,
        waitingPlayerCount: counts.waiting,
        confirmedPlayerCount: counts.confirmed,
        teamNotReturningPlayerCount: counts.notReturning,
      } satisfies CaptainTeamReturnEntry;
    });

    return {
      success: true,
      data: {
        league,
        targetSeason,
        sourceSeason,
        entries,
      },
    };
  } catch (error) {
    console.error('Get captain team return requests error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load team return requests.',
    };
  }
}

export async function respondToTeamReturnRequest(params: {
  leagueSlug: string;
  seasonId: string;
  teamId: string;
  status: 'interested' | 'confirmed' | 'declined';
  note?: string | null;
  declinedReason?: string | null;
}): Promise<ActionResult<{ updated: boolean }>> {
  try {
    const { user, league, serviceSupabase } = await getLeagueAndUser(params.leagueSlug);
    const authorizedTeamIds = await getAuthorizedCaptainTeamIds({
      leagueId: league.id,
      userId: user.id,
    });

    if (!authorizedTeamIds.includes(params.teamId)) {
      return { success: false, error: 'You are not authorized to respond for that team.' };
    }

    const [{ data: row }, { data: season }, { data: team }, { data: profile }] = await Promise.all([
      ((serviceSupabase.from as any)('season_team_returns'))
        .select('*')
        .eq('league_id', league.id)
        .eq('season_id', params.seasonId)
        .eq('team_id', params.teamId)
        .single(),
      serviceSupabase
        .from('seasons')
        .select('id, name')
        .eq('id', params.seasonId)
        .eq('league_id', league.id)
        .single(),
      serviceSupabase
        .from('teams')
        .select('id, name')
        .eq('id', params.teamId)
        .eq('league_id', league.id)
        .single(),
      serviceSupabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (!row || !season || !team) {
      return { success: false, error: 'Team return request not found.' };
    }

    const now = new Date().toISOString();
    const existingMetadata = (row.metadata ?? {}) as Record<string, unknown>;
    const trimmedNote = params.note?.trim() || null;
    const trimmedDeclineReason = params.declinedReason?.trim() || null;
    const displayName = profile?.full_name || user.email || 'Captain';

    const updatePayload: Record<string, unknown> = {
      status: params.status,
      last_response_at: now,
      confirmed_at:
        params.status === 'confirmed'
          ? row.confirmed_at ?? now
          : params.status !== row.status
            ? null
            : row.confirmed_at,
      confirmed_by:
        params.status === 'confirmed'
          ? user.id
          : params.status !== row.status
            ? null
            : (row as any).confirmed_by ?? null,
      declined_at:
        params.status === 'declined'
          ? row.declined_at ?? now
          : params.status !== row.status
            ? null
            : row.declined_at,
      declined_reason:
        params.status === 'declined'
          ? trimmedDeclineReason
          : params.status !== row.status
            ? null
            : row.declined_reason,
      metadata: {
        ...existingMetadata,
        captain_response_note: trimmedNote,
        captain_response_at: now,
        captain_response_by: displayName,
        captain_response_user_id: user.id,
        captain_response_status: params.status,
        captain_response_channel: 'captain_portal',
      },
    };

    const { error: updateError } = await ((serviceSupabase.from as any)('season_team_returns'))
      .update(updatePayload)
      .eq('id', row.id);

    if (updateError) {
      throw updateError;
    }

    if (params.status === 'confirmed' || params.status === 'declined') {
      await syncRegistrationStateForTeam({
        leagueId: league.id,
        seasonId: params.seasonId,
        teamId: params.teamId,
        teamName: team.name,
        registrationStatus: mapReturnRecordToRegistrationStatus(params.status),
      });
    }

    revalidatePath(`/${league.slug}`);
    revalidatePath(`/${league.slug}/captain`);
    revalidatePath(`/${league.slug}/captain/team-return`);
    revalidatePath(`/${league.slug}/register`);
    revalidatePath(`/${league.slug}/register/team`);

    return { success: true, data: { updated: true } };
  } catch (error) {
    console.error('Respond to team return request error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update the team return request.',
    };
  }
}
