'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';
import {
  createDateAtTimeInTimeZone,
  getDateKeyInTimeZone,
  resolveScheduleTimeZone,
} from '@/lib/schedule/timezone';
import { sendEmail } from '@/lib/notifications/email-service';

export type ReplacementInviteCandidate = {
  teamId: string;
  teamName: string;
  divisionName: string | null;
  captainName: string;
  captainEmail: string;
};

export type ReplacementInviteSummary = {
  gameId: string;
  leagueId: string;
  leagueName: string;
  scheduledAt: string;
  timezone: string;
  dateKey: string;
  location: string | null;
  matchupLabel: string;
  divisionLabel: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  candidates: ReplacementInviteCandidate[];
};

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type TeamRow = {
  id: string;
  name: string;
  division_id: string | null;
  captain_id: string | null;
  status?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatGameDateTime(date: Date, timeZone: string) {
  return {
    date: new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  };
}

async function loadReplacementInviteSummary(gameId: string): Promise<ActionResult<ReplacementInviteSummary>> {
  const serviceClient = createServiceRoleClient();

  const { data: game, error: gameError } = await serviceClient
    .from('games')
    .select('id, league_id, scheduled_at, location, home_team_id, away_team_id')
    .eq('id', gameId)
    .maybeSingle();

  if (gameError || !game) {
    return { success: false, error: 'Game not found.' };
  }

  const access = await verifyLeagueOwnerAccess(game.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized to manage this league.' };
  }

  const { data: league, error: leagueError } = await serviceClient
    .from('leagues')
    .select('id, name, timezone')
    .eq('id', game.league_id)
    .maybeSingle();

  if (leagueError || !league) {
    return { success: false, error: 'League not found.' };
  }

  const { data: teams, error: teamsError } = await serviceClient
    .from('teams')
    .select('id, name, division_id, captain_id, status')
    .eq('league_id', game.league_id)
    .neq('status', 'inactive')
    .order('name');

  if (teamsError) {
    return { success: false, error: 'Failed to load teams.' };
  }

  const teamsById = new Map((teams || []).map((team) => [team.id, team as TeamRow]));
  const homeTeam = teamsById.get(game.home_team_id);
  const awayTeam = teamsById.get(game.away_team_id);

  if (!homeTeam || !awayTeam) {
    return { success: false, error: 'Game teams could not be loaded.' };
  }

  const divisionIds = [...new Set(
    (teams || [])
      .map((team) => team.division_id)
      .filter((divisionId): divisionId is string => Boolean(divisionId)),
  )];
  const { data: divisions } = divisionIds.length > 0
    ? await serviceClient.from('divisions').select('id, name').in('id', divisionIds)
    : { data: [] };

  const divisionNameById = new Map(
    (divisions || []).map((division: { id: string; name: string }) => [division.id, division.name]),
  );

  const timeZone = resolveScheduleTimeZone((league as { timezone?: string | null }).timezone);
  const gameDate = new Date(game.scheduled_at);
  const dateKey = getDateKeyInTimeZone(gameDate, timeZone);
  const dayStart = createDateAtTimeInTimeZone(dateKey, '00:00', timeZone);
  const nextDayStart = createDateAtTimeInTimeZone(dateKey, '23:59', timeZone);

  const { data: sameNightGames, error: sameNightError } = await serviceClient
    .from('games')
    .select('id, home_team_id, away_team_id, scheduled_at, status')
    .eq('league_id', game.league_id)
    .in('status', ['scheduled', 'in_progress'])
    .gte('scheduled_at', dayStart.toISOString())
    .lte('scheduled_at', nextDayStart.toISOString());

  if (sameNightError) {
    return { success: false, error: 'Failed to load same-night schedule.' };
  }

  const occupiedTeamIds = new Set<string>();
  for (const scheduledGame of sameNightGames || []) {
    if (scheduledGame.id === game.id) continue;
    occupiedTeamIds.add(scheduledGame.home_team_id);
    occupiedTeamIds.add(scheduledGame.away_team_id);
  }

  const candidateTeams = (teams || []).filter((team) => {
    if (!team.captain_id) return false;
    if (team.id === game.home_team_id || team.id === game.away_team_id) return false;
    return !occupiedTeamIds.has(team.id);
  });

  const captainIds = [...new Set(
    candidateTeams
      .map((team) => team.captain_id)
      .filter((captainId): captainId is string => Boolean(captainId)),
  )];
  const { data: captains } = captainIds.length > 0
    ? await serviceClient.from('profiles').select('id, full_name, email').in('id', captainIds)
    : { data: [] };

  const captainById = new Map(
    (captains || []).map((captain: { id: string; full_name: string | null; email: string | null }) => [captain.id, captain]),
  );

  const candidates = candidateTeams
    .map((team) => {
      const captain = team.captain_id ? captainById.get(team.captain_id) : null;
      if (!captain?.email) {
        return null;
      }

      return {
        teamId: team.id,
        teamName: team.name,
        divisionName: team.division_id ? divisionNameById.get(team.division_id) ?? null : null,
        captainName: captain.full_name || 'Team Captain',
        captainEmail: captain.email,
      } satisfies ReplacementInviteCandidate;
    })
    .filter((candidate): candidate is ReplacementInviteCandidate => candidate !== null)
    .sort((left, right) => {
      const divisionCompare = (left.divisionName || '').localeCompare(right.divisionName || '');
      return divisionCompare !== 0 ? divisionCompare : left.teamName.localeCompare(right.teamName);
    });

  const homeDivision = homeTeam.division_id ? divisionNameById.get(homeTeam.division_id) ?? null : null;
  const awayDivision = awayTeam.division_id ? divisionNameById.get(awayTeam.division_id) ?? null : null;
  const divisionLabel =
    homeDivision && awayDivision
      ? homeDivision === awayDivision
        ? homeDivision
        : `${homeDivision} / ${awayDivision}`
      : homeDivision || awayDivision || 'League play';

  return {
    success: true,
    data: {
      gameId: game.id,
      leagueId: game.league_id,
      leagueName: league.name,
      scheduledAt: game.scheduled_at,
      timezone: timeZone,
      dateKey,
      location: game.location,
      matchupLabel: `${homeTeam.name} vs ${awayTeam.name}`,
      divisionLabel,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      candidates,
    },
  };
}

export async function getReplacementInviteCandidates(
  gameId: string,
): Promise<ActionResult<ReplacementInviteSummary>> {
  return loadReplacementInviteSummary(gameId);
}

export async function sendReplacementTeamInvites(input: {
  gameId: string;
  locale: string;
  teamIds: string[];
  note?: string;
}): Promise<ActionResult<{ sent: number; failed: string[] }>> {
  const summaryResult = await loadReplacementInviteSummary(input.gameId);
  if (!summaryResult.success) {
    return summaryResult;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated.' };
  }

  const selectedTeamIds = Array.from(new Set(input.teamIds.filter(Boolean)));
  if (selectedTeamIds.length === 0) {
    return { success: false, error: 'Select at least one team captain to invite.' };
  }

  const summary = summaryResult.data;
  const selectedCandidates = summary.candidates.filter((candidate) => selectedTeamIds.includes(candidate.teamId));
  if (selectedCandidates.length === 0) {
    return { success: false, error: 'No eligible team captains were selected.' };
  }

  const { date, time } = formatGameDateTime(new Date(summary.scheduledAt), summary.timezone);
  const replyTo = user.email || undefined;
  const gameUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.beerleaguehockey.ca'}/${input.locale}/dashboard/leagues/${summary.leagueId}/games/${summary.gameId}`;
  const failed: string[] = [];
  const sentTeamIds: string[] = [];

  for (const candidate of selectedCandidates) {
    const note = input.note?.trim();
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.6;">
        <p>Hi ${escapeHtml(candidate.captainName)},</p>
        <p>${escapeHtml(summary.leagueName)} is looking for a fill-in team for an open game slot, and your team is not currently scheduled that night.</p>
        <div style="margin: 16px 0; padding: 16px; border: 1px solid #d1d5db; border-radius: 12px; background: #f8fafc;">
          <p style="margin: 0 0 8px;"><strong>Matchup:</strong> ${escapeHtml(summary.matchupLabel)}</p>
          <p style="margin: 0 0 8px;"><strong>Division:</strong> ${escapeHtml(summary.divisionLabel)}</p>
          <p style="margin: 0 0 8px;"><strong>Date:</strong> ${escapeHtml(date)}</p>
          <p style="margin: 0 0 8px;"><strong>Time:</strong> ${escapeHtml(time)} (${escapeHtml(summary.timezone)})</p>
          <p style="margin: 0;"><strong>Location:</strong> ${escapeHtml(summary.location || 'TBD')}</p>
        </div>
        ${note ? `<p><strong>League note:</strong> ${escapeHtml(note)}</p>` : ''}
        <p>If ${escapeHtml(candidate.teamName)} can fill in, reply to this email and the league will confirm the replacement slot details with you.</p>
        <p><a href="${gameUrl}" style="color: #1d4ed8;">View the game in Beer League Hockey</a></p>
      </div>
    `;

    const result = await sendEmail({
      to: candidate.captainEmail,
      subject: `Fill-in opportunity: ${summary.matchupLabel} on ${date}`,
      html,
      replyTo,
      tags: [
        { name: 'type', value: 'replacement_team_invite' },
        { name: 'league_id', value: summary.leagueId },
        { name: 'game_id', value: summary.gameId },
      ],
    });

    if (result.success) {
      sentTeamIds.push(candidate.teamId);
    } else {
      failed.push(candidate.teamName);
    }
  }

  if (sentTeamIds.length > 0) {
    const serviceClient = createServiceRoleClient();
    await serviceClient.from('game_audit_log').insert({
      game_id: summary.gameId,
      league_id: summary.leagueId,
      action: 'replacement_invite_sent',
      changed_by: user.id,
      previous_data: null,
      new_data: {
        invited_team_ids: sentTeamIds,
        invited_count: sentTeamIds.length,
      },
      reason: input.note?.trim() || 'Replacement team invite sent',
    });
  }

  revalidatePath(`/${input.locale}/dashboard/leagues/${summary.leagueId}/games/${summary.gameId}`);

  if (sentTeamIds.length === 0) {
    return { success: false, error: 'No invites were sent. Check the selected captains and try again.' };
  }

  return {
    success: true,
    data: {
      sent: sentTeamIds.length,
      failed,
    },
  };
}
