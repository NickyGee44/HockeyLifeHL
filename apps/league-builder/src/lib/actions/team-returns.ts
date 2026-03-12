'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';
import { getSeasonParticipationTeamIds } from '@/lib/seasons/team-participation';
import { sendBatchEmails, type BatchEmailRecipient } from '@/lib/notifications/email-service';
import {
  getLeagueAnnouncementEmail,
  sanitizeAnnouncementContent,
} from '@/lib/notifications/templates/league-announcement';

type TeamReturnRecordStatus =
  | 'pending_outreach'
  | 'contacted'
  | 'interested'
  | 'follow_up_needed'
  | 'confirmed'
  | 'declined';

export type TeamReturnOwnerFlag =
  | 'normal'
  | 'priority_follow_up'
  | 'waitlist_watch'
  | 'at_risk'
  | 'ready_to_confirm';

type RegistrationFacingTeamStatus =
  | 'confirmed'
  | 'pending_team_return'
  | 'team_not_returning'
  | 'not_applicable';

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
  source_season_id: string | null;
  status: TeamReturnRecordStatus;
  owner_flag: TeamReturnOwnerFlag;
  captain_profile_id: string | null;
  captain_name: string | null;
  captain_email: string | null;
  captain_phone: string | null;
  notes: string | null;
  internal_notes: string | null;
  declined_reason: string | null;
  last_contacted_at: string | null;
  last_response_at: string | null;
  confirmed_at: string | null;
  declined_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type TeamReturnCampaignRow = {
  id: string;
  subject: string;
  campaign_type: string;
  team_count: number;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

type RegistrationDraftLike = {
  requested_team_id?: string | null;
  previous_team_id?: string | null;
  requested_team_name?: string | null;
  previous_team_name?: string | null;
  registration_intent?: string | null;
  team_return_status?: string | null;
};

type PendingRegistrationRow = {
  id: string;
  player_id: string;
  status: string;
  team_id: string | null;
  draft_data: RegistrationDraftLike | null;
  player: {
    full_name: string | null;
    email: string | null;
  } | null;
};

export interface TeamReturnDashboardEntry {
  recordId: string;
  teamId: string;
  teamName: string;
  shortName: string | null;
  divisionName: string | null;
  status: TeamReturnRecordStatus;
  ownerFlag: TeamReturnOwnerFlag;
  captainName: string | null;
  captainEmail: string | null;
  captainPhone: string | null;
  notes: string | null;
  internalNotes: string | null;
  declinedReason: string | null;
  captainResponseNote: string | null;
  captainResponseAt: string | null;
  captainResponseBy: string | null;
  lastContactedAt: string | null;
  lastResponseAt: string | null;
  waitingPlayerCount: number;
  confirmedPlayerCount: number;
  teamNotReturningPlayerCount: number;
  latestCampaignSubject: string | null;
}

export interface TeamReturnOverview {
  targetSeason: SeasonSummaryRow | null;
  sourceSeason: SeasonSummaryRow | null;
  summary: {
    totalTeams: number;
    confirmedTeams: number;
    pendingOutreachTeams: number;
    followUpTeams: number;
    declinedTeams: number;
    waitingPlayers: number;
  };
  entries: TeamReturnDashboardEntry[];
  campaigns: TeamReturnCampaignRow[];
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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

  const draft = seasons
    .filter((season) => season.status === 'draft')
    .sort(byNewestStart)[0];

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

function mapReturnRecordToRegistrationStatus(
  status: TeamReturnRecordStatus | null | undefined
): RegistrationFacingTeamStatus {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'declined') return 'team_not_returning';
  return 'pending_team_return';
}

function getRegistrationTeamKey(draftData: RegistrationDraftLike | null | undefined): string | null {
  if (!draftData) return null;
  return draftData.previous_team_id || draftData.requested_team_id || null;
}

async function getSeasonContext(leagueId: string, seasonId?: string) {
  const serviceSupabase = createServiceRoleClient();
  const { data: seasons, error } = await serviceSupabase
    .from('seasons')
    .select('id, name, status, start_date, registration_opens_at, registration_closes_at')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  if (error) {
    throw new Error('Failed to load seasons.');
  }

  const seasonRows = (seasons ?? []) as SeasonSummaryRow[];
  const targetSeason = pickTargetSeason(seasonRows, seasonId);
  const sourceSeason = pickSourceSeason(seasonRows, targetSeason);

  return { seasons: seasonRows, targetSeason, sourceSeason };
}

async function ensureTeamReturnRecords(params: {
  leagueId: string;
  seasonId: string;
  sourceSeasonId?: string | null;
}) {
  const { leagueId, seasonId, sourceSeasonId } = params;
  const serviceSupabase = createServiceRoleClient();

  if (!sourceSeasonId) {
    return { synced: 0 };
  }

  const sourceTeamIds = await getSeasonParticipationTeamIds(serviceSupabase, leagueId, sourceSeasonId);
  if (sourceTeamIds.length === 0) {
    return { synced: 0 };
  }

  const [{ data: teamRows }, { data: existingRows }, { data: leaderRows }, confirmedTeamIds] =
    await Promise.all([
      serviceSupabase
        .from('teams')
        .select('id, name, short_name, division_id, captain_id, contact_email, contact_phone')
        .eq('league_id', leagueId)
        .in('id', sourceTeamIds),
      ((serviceSupabase.from as any)('season_team_returns'))
        .select('*')
        .eq('league_id', leagueId)
        .eq('season_id', seasonId)
        .in('team_id', sourceTeamIds),
      serviceSupabase
        .from('team_rosters')
        .select(`
          team_id,
          leadership_role,
          player_id,
          profile:profiles!team_rosters_player_id_fkey(full_name, email, phone)
        `)
        .eq('league_id', leagueId)
        .eq('season_id', sourceSeasonId)
        .eq('status', 'active')
        .in('team_id', sourceTeamIds)
        .in('leadership_role', ['captain', 'alternate_captain']),
      getSeasonParticipationTeamIds(serviceSupabase, leagueId, seasonId),
    ]);

  const teamById = new Map((teamRows ?? []).map((team) => [team.id, team]));
  const existingByTeamId = new Map(
    ((existingRows ?? []) as TeamReturnRow[]).map((row) => [row.team_id, row])
  );

  const leaderByTeamId = new Map<
    string,
    {
      playerId: string | null;
      name: string | null;
      email: string | null;
      phone: string | null;
    }
  >();

  for (const row of leaderRows ?? []) {
    const profile = Array.isArray((row as any).profile)
      ? (row as any).profile[0]
      : (row as any).profile;

    const existing = leaderByTeamId.get(row.team_id);
    if (existing && (row.leadership_role !== 'captain')) {
      continue;
    }

    leaderByTeamId.set(row.team_id, {
      playerId: row.player_id ?? null,
      name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
    });
  }

  const confirmedSet = new Set(confirmedTeamIds);
  const rowsToUpsert = sourceTeamIds
    .map((teamId) => {
      const team = teamById.get(teamId);
      if (!team) return null;

      const existing = existingByTeamId.get(teamId);
      const leader = leaderByTeamId.get(teamId);
      const defaultStatus: TeamReturnRecordStatus = confirmedSet.has(teamId)
        ? 'confirmed'
        : 'pending_outreach';

      return {
        league_id: leagueId,
        season_id: seasonId,
        team_id: teamId,
        source_season_id: sourceSeasonId,
        status: existing?.status ?? defaultStatus,
        owner_flag: existing?.owner_flag ?? 'normal',
        captain_profile_id: existing?.captain_profile_id ?? leader?.playerId ?? team.captain_id ?? null,
        captain_name: existing?.captain_name ?? leader?.name ?? null,
        captain_email: existing?.captain_email ?? leader?.email ?? team.contact_email ?? null,
        captain_phone: existing?.captain_phone ?? leader?.phone ?? team.contact_phone ?? null,
        notes: existing?.notes ?? null,
        internal_notes: existing?.internal_notes ?? null,
        declined_reason: existing?.declined_reason ?? null,
        last_contacted_at: existing?.last_contacted_at ?? null,
        last_response_at: existing?.last_response_at ?? null,
        confirmed_at: existing?.confirmed_at ?? null,
        confirmed_by: (existing as any)?.confirmed_by ?? null,
        declined_at: existing?.declined_at ?? null,
        metadata: {
          contact_email: team.contact_email ?? null,
          contact_phone: team.contact_phone ?? null,
          ...(existing?.metadata ?? {}),
        },
      };
    })
    .filter(Boolean);

  if (rowsToUpsert.length === 0) {
    return { synced: 0 };
  }

  const { error: upsertError } = await ((serviceSupabase.from as any)('season_team_returns'))
    .upsert(rowsToUpsert, { onConflict: 'season_id,team_id' });

  if (upsertError) {
    throw new Error('Failed to sync returning teams.');
  }

  return { synced: rowsToUpsert.length };
}

async function loadRegistrationsForReturnSeason(leagueId: string, seasonId: string) {
  const serviceSupabase = createServiceRoleClient();
  const { data, error } = await (serviceSupabase.from('registration_submissions') as any)
    .select(`
      id,
      player_id,
      status,
      team_id,
      draft_data,
      player:profiles!registration_submissions_player_id_fkey(full_name, email)
    `)
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .in('status', ['pending', 'approved', 'waitlisted'])
    .not('submitted_at', 'is', null);

  if (error) {
    throw new Error('Failed to load waiting registrations.');
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
    return matching;
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

  return matching;
}

async function notifyRegistrantsOfTeamReturnChange(params: {
  league: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
  };
  season: SeasonSummaryRow;
  teamName: string;
  registrations: PendingRegistrationRow[];
  registrationStatus: RegistrationFacingTeamStatus;
}) {
  const { league, season, teamName, registrations, registrationStatus } = params;
  const recipients: BatchEmailRecipient[] = [];
  const seen = new Set<string>();

  for (const registration of registrations) {
    const email = registration.player?.email;
    if (!email || seen.has(email) || registration.status === 'approved') {
      continue;
    }
    seen.add(email);
    recipients.push({
      email,
      name: registration.player?.full_name || undefined,
    });
  }

  if (recipients.length === 0) {
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';
  const registrationUrl = `${siteUrl}/${league.slug}/register`;

  const subject =
    registrationStatus === 'confirmed'
      ? `${league.name}: ${teamName} is back for ${season.name}`
      : `${league.name}: ${teamName} is not returning for ${season.name}`;

  const rawContent =
    registrationStatus === 'confirmed'
      ? `Good news — **${teamName}** is confirmed for **${season.name}**.\n\nWe’ve kept your registration tied to that team so league staff can finish review and placement. You do not need to start over.`
      : `**${teamName}** is not returning for **${season.name}**.\n\nWe’ve kept your registration on file so the league can place you elsewhere or move you into the free agent pool without losing your details or waiver.`;

  await sendBatchEmails(
    recipients,
    subject,
    (recipient) =>
      getLeagueAnnouncementEmail({
        recipientName: recipient.name || 'Player',
        subject,
        content: sanitizeAnnouncementContent(rawContent),
        priority: 'normal',
        senderName: league.name,
        senderRole: 'League Administration',
        dashboardUrl: registrationUrl,
        actionButtonText: 'View Registration',
        actionButtonUrl: registrationUrl,
        leagueName: league.name,
        leagueLogo: league.logo_url,
        primaryColor: league.primary_color,
        secondaryColor: league.secondary_color,
        accentColor: league.accent_color,
      }),
    {
      tags: [
        { name: 'type', value: 'team-return-status' },
        { name: 'league_id', value: league.id },
        { name: 'season_id', value: season.id },
      ],
    }
  );
}

async function revalidateLeagueSurfaces(leagueId: string, leagueSlug?: string | null) {
  revalidatePath(`/dashboard/leagues/${leagueId}/teams`);
  revalidatePath(`/dashboard/leagues/${leagueId}/registrations`);

  if (!leagueSlug) return;

  const leagueSitesUrl = process.env.LEAGUE_SITES_URL || 'http://localhost:3001';
  try {
    await fetch(`${leagueSitesUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: leagueSlug,
        paths: [
          `/${leagueSlug}`,
          `/${leagueSlug}/register`,
          `/${leagueSlug}/register/team`,
          `/${leagueSlug}/captain`,
          `/${leagueSlug}/captain/team-return`,
        ],
      }),
    });
  } catch (error) {
    console.warn('[team-returns] Failed to revalidate league-sites:', error);
  }
}

export async function getSeasonTeamReturnsOverview(
  leagueId: string,
  seasonId?: string
): Promise<ActionResult<TeamReturnOverview>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized.' };
  }

  try {
    const { targetSeason, sourceSeason } = await getSeasonContext(leagueId, seasonId);
    if (!targetSeason) {
      return {
        success: true,
        data: {
          targetSeason: null,
          sourceSeason: null,
          summary: {
            totalTeams: 0,
            confirmedTeams: 0,
            pendingOutreachTeams: 0,
            followUpTeams: 0,
            declinedTeams: 0,
            waitingPlayers: 0,
          },
          entries: [],
          campaigns: [],
        },
      };
    }

    await ensureTeamReturnRecords({
      leagueId,
      seasonId: targetSeason.id,
      sourceSeasonId: sourceSeason?.id,
    });

    const serviceSupabase = createServiceRoleClient();
    const [{ data: rows }, { data: campaigns }, registrations, { data: teamRows }] = await Promise.all([
      ((serviceSupabase.from as any)('season_team_returns'))
        .select('*')
        .eq('league_id', leagueId)
        .eq('season_id', targetSeason.id)
        .order('status', { ascending: true })
        .order('updated_at', { ascending: false }),
      ((serviceSupabase.from as any)('season_team_return_campaigns'))
        .select('id, subject, campaign_type, team_ids, team_count, recipient_count, sent_count, failed_count, created_at')
        .eq('league_id', leagueId)
        .eq('season_id', targetSeason.id)
        .order('created_at', { ascending: false })
        .limit(6),
      loadRegistrationsForReturnSeason(leagueId, targetSeason.id),
      serviceSupabase
        .from('teams')
        .select('id, name, short_name, division_id, divisions(name)')
        .eq('league_id', leagueId),
    ]);

    const teamById = new Map(
      (teamRows ?? []).map((team: any) => [
        team.id,
        {
          name: team.name,
          short_name: team.short_name,
          divisionName: Array.isArray(team.divisions) ? team.divisions[0]?.name ?? null : team.divisions?.name ?? null,
        },
      ])
    );

    const latestCampaignByTeamId = new Map<string, string>();
    for (const campaign of (campaigns ?? []) as Array<TeamReturnCampaignRow & { team_ids?: string[] }>) {
      const teamIds = (campaign as any).team_ids as string[] | undefined;
      if (!teamIds) continue;
      for (const teamId of teamIds) {
        if (!latestCampaignByTeamId.has(teamId)) {
          latestCampaignByTeamId.set(teamId, campaign.subject);
        }
      }
    }

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
        shortName: team?.short_name ?? null,
        divisionName: team?.divisionName ?? null,
        status: row.status,
        ownerFlag: row.owner_flag,
        captainName: row.captain_name,
        captainEmail: row.captain_email,
        captainPhone: row.captain_phone,
        notes: row.notes,
        internalNotes: row.internal_notes,
        declinedReason: row.declined_reason,
        captainResponseNote:
          typeof row.metadata?.captain_response_note === 'string'
            ? row.metadata.captain_response_note
            : null,
        captainResponseAt:
          typeof row.metadata?.captain_response_at === 'string'
            ? row.metadata.captain_response_at
            : null,
        captainResponseBy:
          typeof row.metadata?.captain_response_by === 'string'
            ? row.metadata.captain_response_by
            : null,
        lastContactedAt: row.last_contacted_at,
        lastResponseAt: row.last_response_at,
        waitingPlayerCount: counts.waiting,
        confirmedPlayerCount: counts.confirmed,
        teamNotReturningPlayerCount: counts.notReturning,
        latestCampaignSubject: latestCampaignByTeamId.get(row.team_id) ?? null,
      } satisfies TeamReturnDashboardEntry;
    });

    return {
      success: true,
      data: {
        targetSeason,
        sourceSeason,
        summary: {
          totalTeams: entries.length,
          confirmedTeams: entries.filter((entry) => entry.status === 'confirmed').length,
          pendingOutreachTeams: entries.filter((entry) => entry.status === 'pending_outreach').length,
          followUpTeams: entries.filter((entry) => entry.status === 'follow_up_needed').length,
          declinedTeams: entries.filter((entry) => entry.status === 'declined').length,
          waitingPlayers: entries.reduce((sum, entry) => sum + entry.waitingPlayerCount, 0),
        },
        entries,
        campaigns: (campaigns ?? []) as TeamReturnCampaignRow[],
      },
    };
  } catch (error) {
    console.error('Get season team returns overview error:', error);
    return { success: false, error: 'Failed to load return campaign data.' };
  }
}

export async function syncSeasonTeamReturns(
  leagueId: string,
  seasonId?: string
): Promise<ActionResult<{ synced: number }>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized.' };
  }

  try {
    const { targetSeason, sourceSeason } = await getSeasonContext(leagueId, seasonId);
    if (!targetSeason) {
      return { success: false, error: 'No season is available for return tracking yet.' };
    }

    const result = await ensureTeamReturnRecords({
      leagueId,
      seasonId: targetSeason.id,
      sourceSeasonId: sourceSeason?.id,
    });

    revalidatePath(`/dashboard/leagues/${leagueId}/teams`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Sync season team returns error:', error);
    return { success: false, error: 'Failed to sync return targets.' };
  }
}

export async function updateSeasonTeamReturnRecord(params: {
  leagueId: string;
  seasonId: string;
  teamId: string;
  status?: TeamReturnRecordStatus;
  ownerFlag?: TeamReturnOwnerFlag;
  notes?: string | null;
  internalNotes?: string | null;
  declinedReason?: string | null;
}): Promise<ActionResult<{ updated: boolean }>> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized.' };
  }

  try {
    const serviceSupabase = createServiceRoleClient();
    const [{ data: row }, { data: league }, { data: season }, { data: team }] = await Promise.all([
      ((serviceSupabase.from as any)('season_team_returns'))
        .select('*')
        .eq('league_id', params.leagueId)
        .eq('season_id', params.seasonId)
        .eq('team_id', params.teamId)
        .single(),
      serviceSupabase
        .from('leagues')
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color')
        .eq('id', params.leagueId)
        .single(),
      serviceSupabase
        .from('seasons')
        .select('id, name, status, start_date, registration_opens_at, registration_closes_at')
        .eq('id', params.seasonId)
        .single(),
      serviceSupabase
        .from('teams')
        .select('id, name')
        .eq('id', params.teamId)
        .single(),
    ]);

    if (!row || !league || !season || !team) {
      return { success: false, error: 'Return record not found.' };
    }

    const nextStatus = params.status ?? (row.status as TeamReturnRecordStatus);
    const statusChanged = Boolean(params.status && params.status !== row.status);
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      owner_flag: params.ownerFlag ?? row.owner_flag,
      notes: Object.prototype.hasOwnProperty.call(params, 'notes') ? params.notes : row.notes,
      internal_notes: Object.prototype.hasOwnProperty.call(params, 'internalNotes')
        ? params.internalNotes
        : row.internal_notes,
      declined_reason:
        nextStatus === 'declined'
          ? (Object.prototype.hasOwnProperty.call(params, 'declinedReason')
            ? params.declinedReason
            : row.declined_reason)
          : statusChanged
            ? null
            : Object.prototype.hasOwnProperty.call(params, 'declinedReason')
              ? params.declinedReason
              : row.declined_reason,
      last_response_at:
        statusChanged && (nextStatus === 'interested' || nextStatus === 'confirmed' || nextStatus === 'declined')
          ? now
          : row.last_response_at,
      confirmed_at:
        nextStatus === 'confirmed'
          ? row.confirmed_at ?? now
          : statusChanged
            ? null
            : row.confirmed_at,
      declined_at:
        nextStatus === 'declined'
          ? row.declined_at ?? now
          : statusChanged
            ? null
            : row.declined_at,
    };

    const { error: updateError } = await ((serviceSupabase.from as any)('season_team_returns'))
      .update(updatePayload)
      .eq('id', row.id);

    if (updateError) {
      throw updateError;
    }

    if (params.status === 'confirmed' || params.status === 'declined') {
      const registrationStatus = mapReturnRecordToRegistrationStatus(nextStatus);
      const registrations = await syncRegistrationStateForTeam({
        leagueId: params.leagueId,
        seasonId: params.seasonId,
        teamId: params.teamId,
        teamName: team.name,
        registrationStatus,
      });

      await notifyRegistrantsOfTeamReturnChange({
        league,
        season,
        teamName: team.name,
        registrations,
        registrationStatus,
      });
    }

    await revalidateLeagueSurfaces(params.leagueId, league.slug);
    return { success: true, data: { updated: true } };
  } catch (error) {
    console.error('Update season team return record error:', error);
    return { success: false, error: 'Failed to update the team return record.' };
  }
}

export async function sendSeasonTeamReturnCampaign(params: {
  leagueId: string;
  seasonId: string;
  teamIds?: string[];
  subject: string;
  content: string;
  campaignType?: 'return_invite' | 'follow_up' | 'status_update';
  recipientFilter?: 'captains' | 'captains_and_contacts';
}): Promise<ActionResult<{ sent: number; failed: number }>> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized.' };
  }

  try {
    const serviceSupabase = createServiceRoleClient();
    const { targetSeason, sourceSeason } = await getSeasonContext(params.leagueId, params.seasonId);

    if (!targetSeason) {
      return { success: false, error: 'Season not found.' };
    }

    await ensureTeamReturnRecords({
      leagueId: params.leagueId,
      seasonId: params.seasonId,
      sourceSeasonId: sourceSeason?.id,
    });

    const { data: league } = await serviceSupabase
      .from('leagues')
      .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color')
      .eq('id', params.leagueId)
      .single();

    const { data: rows, error: rowsError } = await ((serviceSupabase.from as any)('season_team_returns'))
      .select('*')
      .eq('league_id', params.leagueId)
      .eq('season_id', params.seasonId)
      .in('team_id', params.teamIds && params.teamIds.length > 0 ? params.teamIds : ['00000000-0000-0000-0000-000000000000'])
      .order('team_id');

    let workingRows = (rows ?? []) as TeamReturnRow[];

    if ((!params.teamIds || params.teamIds.length === 0) && workingRows.length === 0) {
      const { data: allRows } = await ((serviceSupabase.from as any)('season_team_returns'))
        .select('*')
        .eq('league_id', params.leagueId)
        .eq('season_id', params.seasonId);

      workingRows = ((allRows ?? []) as TeamReturnRow[]).filter(
        (row) => row.status !== 'confirmed' && row.status !== 'declined'
      );
    }

    if (rowsError) {
      throw rowsError;
    }

    if (!league || workingRows.length === 0) {
      return { success: false, error: 'No teams are available for this campaign.' };
    }

    const sanitizedContent = sanitizeAnnouncementContent(params.content);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';
    const recipients: BatchEmailRecipient[] = [];

    for (const row of workingRows) {
      const emails = [
        row.captain_email,
        params.recipientFilter === 'captains_and_contacts'
          ? ((row.metadata?.contact_email as string | undefined) ?? null)
          : null,
      ].filter((value): value is string => Boolean(value));

      const uniqueEmails = [...new Set(emails)];
      for (const email of uniqueEmails) {
        recipients.push({
          email,
          name: row.captain_name || undefined,
          data: {
            teamId: row.team_id,
          },
        });
      }
    }

    if (recipients.length === 0) {
      return { success: false, error: 'No captain or contact emails were found for the selected teams.' };
    }

    const result = await sendBatchEmails(
      recipients,
      params.subject,
      (recipient) =>
        getLeagueAnnouncementEmail({
          recipientName: recipient.name || 'Team Representative',
          subject: params.subject,
          content: sanitizedContent,
          priority: params.campaignType === 'follow_up' ? 'high' : 'normal',
          senderName: league.name,
          senderRole: 'League Administration',
          dashboardUrl: `${siteUrl}/${league.slug}/captain/team-return?seasonId=${params.seasonId}&teamId=${recipient.data?.teamId}`,
          actionButtonText: 'Respond for Your Team',
          actionButtonUrl: `${siteUrl}/${league.slug}/captain/team-return?seasonId=${params.seasonId}&teamId=${recipient.data?.teamId}`,
          leagueName: league.name,
          leagueLogo: league.logo_url,
          primaryColor: league.primary_color,
          secondaryColor: league.secondary_color,
          accentColor: league.accent_color,
        }),
      {
        tags: [
          { name: 'type', value: 'team-return-campaign' },
          { name: 'league_id', value: params.leagueId },
          { name: 'season_id', value: params.seasonId },
        ],
      }
    );

    const now = new Date().toISOString();
    const teamIds = [
      ...new Set(
        recipients
          .map((recipient) => recipient.data?.teamId)
          .filter((teamId): teamId is string => typeof teamId === 'string' && teamId.length > 0)
      ),
    ];

    const authSupabase = await createClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    const senderId = user?.id ?? null;

    await ((serviceSupabase.from as any)('season_team_return_campaigns')).insert({
      league_id: params.leagueId,
      season_id: params.seasonId,
      source_season_id: sourceSeason?.id ?? null,
      sent_by: senderId,
      campaign_type: params.campaignType ?? 'return_invite',
      subject: params.subject,
      message_body: params.content,
      recipient_filter: params.recipientFilter ?? 'captains',
      team_ids: teamIds,
      team_count: teamIds.length,
      recipient_count: recipients.length,
      sent_count: result.sent,
      failed_count: result.failed,
    });

    await ((serviceSupabase.from as any)('season_team_returns'))
      .update({
        last_contacted_at: now,
        status:
          params.campaignType === 'follow_up'
            ? 'follow_up_needed'
            : 'contacted',
      })
      .eq('league_id', params.leagueId)
      .eq('season_id', params.seasonId)
      .in('team_id', teamIds)
      .in('status', ['pending_outreach', 'contacted', 'follow_up_needed']);

    await revalidateLeagueSurfaces(params.leagueId, league.slug);
    return { success: true, data: { sent: result.sent, failed: result.failed } };
  } catch (error) {
    console.error('Send season team return campaign error:', error);
    return { success: false, error: 'Failed to send the return campaign.' };
  }
}
