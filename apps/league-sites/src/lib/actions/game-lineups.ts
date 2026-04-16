'use server';

import { revalidatePath } from 'next/cache';
import { createAuthClient, createClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  buildDefaultLineupLayout,
  normalizeLineupLayout,
  type GameLineupEditorData,
  type GameTeamLineupLayout,
  type GameTeamLineupStatus,
  type LineupAvailability,
  type LineupRosterPlayer,
  type PublishedGameTeamLineup,
  type TeamLineupIdentity,
} from '@/lib/lineups/types';

type AuthenticatedLineupAccess = {
  userId: string;
  leagueId: string;
  leagueSlug: string;
  game: {
    id: string;
    scheduled_at: string;
    location: string | null;
    status: string;
    home_team_id: string;
    away_team_id: string;
    season_id: string | null;
    home_team: any;
    away_team: any;
  };
};

type EditorResult =
  | { success: true; data: GameLineupEditorData }
  | { success: false; error: string };

type SaveResult =
  | {
      success: true;
      data: GameLineupEditorData['lineup'];
    }
  | { success: false; error: string };

function formatTeamIdentity(rawTeam: any): TeamLineupIdentity {
  const team = Array.isArray(rawTeam) ? rawTeam[0] : rawTeam;
  return {
    id: team?.id,
    name: team?.name,
    slug: team?.slug ?? null,
    logoUrl: team?.logo_url ?? null,
    primaryColor: team?.primary_color ?? null,
    secondaryColor: team?.secondary_color ?? null,
  };
}

function buildRosterSnapshot(rosterRows: any[] | null, checkins: Map<string, LineupAvailability>) {
  const roster: LineupRosterPlayer[] = (rosterRows || []).map((row: any) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return {
      playerId: row.player_id,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      jerseyNumber: row.jersey_number ?? null,
      position: row.position ?? null,
      availability: checkins.get(row.player_id) ?? 'no_response',
      isSub: false,
    } satisfies LineupRosterPlayer;
  });

  return roster.length > 0 ? roster : [];
}

async function loadAcceptedSubSnapshotForGameTeam(
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
  gameId: string,
  teamId: string,
  checkins: Map<string, LineupAvailability>,
  existingRosterIds: Set<string>
) {
  const { data: acceptedSubs } = await (serviceSupabase.from('sub_invitations') as any)
    .select(`
      invited_player_id,
      invited_player_profile:profiles!sub_invitations_invited_player_id_fkey(full_name, avatar_url)
    `)
    .eq('game_id', gameId)
    .eq('team_id', teamId)
    .eq('status', 'accepted');

  const subs: LineupRosterPlayer[] = [];

  for (const row of acceptedSubs || []) {
    if (!row.invited_player_id || existingRosterIds.has(row.invited_player_id)) {
      continue;
    }

    const profile = Array.isArray(row.invited_player_profile)
      ? row.invited_player_profile[0]
      : row.invited_player_profile;

    subs.push({
      playerId: row.invited_player_id,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      jerseyNumber: null,
      position: null,
      availability: checkins.get(row.invited_player_id) ?? 'confirmed',
      isSub: true,
    });
  }

  return subs;
}

async function loadRosterSnapshotForGameTeam(
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
  gameId: string,
  teamId: string,
  seasonId?: string | null,
) {
  let rosterQuery = (serviceSupabase.from('team_rosters') as any)
    .select(`
      player_id,
      position,
      jersey_number,
      season_id,
      profile:profiles!team_rosters_player_id_fkey(full_name, avatar_url)
    `)
    .eq('team_id', teamId)
    .eq('status', 'active')
    .is('end_date', null);

  if (seasonId) {
    rosterQuery = rosterQuery.eq('season_id', seasonId);
  }

  const [rosterResult, checkinResult] = await Promise.all([
    rosterQuery,
    (serviceSupabase.from('game_checkins') as any)
      .select('player_id, status')
      .eq('game_id', gameId)
      .eq('team_id', teamId),
  ]);

  const checkins = new Map<string, LineupAvailability>();
  for (const row of checkinResult.data || []) {
    const status =
      row.status === 'confirmed' || row.status === 'tentative' || row.status === 'out'
        ? row.status
        : 'no_response';
    checkins.set(row.player_id, status);
  }

  const roster = buildRosterSnapshot(rosterResult.data || null, checkins);
  const acceptedSubs = await loadAcceptedSubSnapshotForGameTeam(
    serviceSupabase,
    gameId,
    teamId,
    checkins,
    new Set(roster.map((player) => player.playerId)),
  );

  return [...roster, ...acceptedSubs];
}

async function verifyGameLineupManagerAccess(
  gameId: string,
  teamId: string
): Promise<{ authorized: true; data: AuthenticatedLineupAccess } | { authorized: false; error: string }> {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const serviceSupabase = createServiceRoleClient();
  const { data: game, error: gameError } = await (serviceSupabase.from('games') as any)
    .select(`
      id,
      league_id,
      scheduled_at,
      location,
      status,
      home_team_id,
      away_team_id,
      season_id,
      league:leagues!games_league_id_fkey(slug),
      home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color),
      away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url, primary_color, secondary_color)
    `)
    .eq('id', gameId)
    .maybeSingle();

  if (gameError || !game) {
    return { authorized: false, error: 'Game not found' };
  }

  if (game.home_team_id !== teamId && game.away_team_id !== teamId) {
    return { authorized: false, error: 'That team is not assigned to this game' };
  }

  const [{ data: teamCaptain }, { data: alternateCaptain }, { data: leagueAdmin }] = await Promise.all([
    (serviceSupabase.from('teams') as any)
      .select('id')
      .eq('id', teamId)
      .eq('captain_id', user.id)
      .maybeSingle(),
    (serviceSupabase.from('team_rosters') as any)
      .select('id')
      .eq('team_id', teamId)
      .eq('player_id', user.id)
      .eq('status', 'active')
      .is('end_date', null)
      .eq('leadership_role', 'alternate_captain')
      .maybeSingle(),
    (serviceSupabase.from('league_memberships') as any)
      .select('id')
      .eq('league_id', game.league_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['league_admin', 'commissioner'])
      .maybeSingle(),
  ]);

  if (!teamCaptain && !alternateCaptain && !leagueAdmin) {
    return { authorized: false, error: 'Not authorized to manage this lineup' };
  }

  const rawLeague = Array.isArray(game.league) ? game.league[0] : game.league;

  return {
    authorized: true,
    data: {
      userId: user.id,
      leagueId: game.league_id,
      leagueSlug: rawLeague?.slug ?? '',
      game,
    },
  };
}

async function buildEditorPayload(
  gameId: string,
  teamId: string,
  access: AuthenticatedLineupAccess
): Promise<GameLineupEditorData> {
  const serviceSupabase = createServiceRoleClient();
  const [lineupResult, roster] = await Promise.all([
    (serviceSupabase.from('game_team_lineups' as any) as any)
      .select('id, status, formation, layout_json, published_at, updated_at')
      .eq('game_id', gameId)
      .eq('team_id', teamId)
      .maybeSingle(),
    loadRosterSnapshotForGameTeam(serviceSupabase, gameId, teamId, access.game.season_id ?? null),
  ]);
  const baseLayout = roster.length > 0 ? normalizeLineupLayout(lineupResult.data?.layout_json ?? null, roster) : buildDefaultLineupLayout([]);
  const team = access.game.home_team_id === teamId ? formatTeamIdentity(access.game.home_team) : formatTeamIdentity(access.game.away_team);
  const opponent = access.game.home_team_id === teamId ? formatTeamIdentity(access.game.away_team) : formatTeamIdentity(access.game.home_team);

  return {
    game: {
      id: access.game.id,
      leagueId: access.leagueId,
      leagueSlug: access.leagueSlug,
      scheduledAt: access.game.scheduled_at,
      venue: access.game.location,
      status: access.game.status,
      team,
      opponent,
      isHome: access.game.home_team_id === teamId,
    },
    lineup: {
      id: lineupResult.data?.id ?? null,
      status: (lineupResult.data?.status as GameTeamLineupStatus | undefined) ?? 'draft',
      formation: lineupResult.data?.formation ?? null,
      layout: baseLayout,
      publishedAt: lineupResult.data?.published_at ?? null,
      updatedAt: lineupResult.data?.updated_at ?? null,
    },
  };
}

async function persistGameTeamLineup(
  gameId: string,
  teamId: string,
  leagueSlug: string,
  payload: {
    formation?: string | null;
    layout: GameTeamLineupLayout;
    publish: boolean;
  }
): Promise<SaveResult> {
  const access = await verifyGameLineupManagerAccess(gameId, teamId);
  if (!access.authorized) {
    return { success: false, error: access.error };
  }

  if (access.data.game.status === 'completed' || access.data.game.status === 'cancelled') {
    return { success: false, error: 'Completed or cancelled games can no longer be edited.' };
  }

  const serviceSupabase = createServiceRoleClient();
  const [existingResult, roster] = await Promise.all([
    (serviceSupabase.from('game_team_lineups' as any) as any)
      .select('status, published_at, published_by')
      .eq('game_id', gameId)
      .eq('team_id', teamId)
      .maybeSingle(),
    loadRosterSnapshotForGameTeam(serviceSupabase, gameId, teamId, access.data.game.season_id ?? null),
  ]);
  const existing = existingResult.data;
  const normalizedLayout = normalizeLineupLayout(
    {
      ...payload.layout,
      roster,
    },
    roster
  );

  const nextStatus: GameTeamLineupStatus = payload.publish
    ? 'published'
    : existing?.status === 'published'
      ? 'published'
      : 'draft';

  const publishedAt = payload.publish
    ? new Date().toISOString()
    : existing?.published_at ?? null;

  const publishedBy = payload.publish
    ? access.data.userId
    : existing?.published_by ?? null;

  const { data, error } = await (serviceSupabase.from('game_team_lineups' as any) as any)
    .upsert(
      {
        game_id: gameId,
        league_id: access.data.leagueId,
        team_id: teamId,
        status: nextStatus,
        formation: payload.formation ?? null,
        layout_json: normalizedLayout,
        published_at: publishedAt,
        published_by: publishedBy,
        updated_by: access.data.userId,
      },
      { onConflict: 'game_id,team_id' }
    )
    .select('id, status, formation, layout_json, published_at, updated_at')
    .single();

  if (error || !data) {
    console.error('[game-lineups] save error:', error);
    const details = error?.message ? `: ${error.message}` : '';
    return { success: false, error: `Failed to save lineup${details}` };
  }

  revalidatePath(`/${leagueSlug}/captain`);
  revalidatePath(`/${leagueSlug}/checkin`);
  revalidatePath(`/${leagueSlug}/captain/lineups/${gameId}`);
  revalidatePath(`/${leagueSlug}/games/${gameId}`);

  return {
    success: true,
    data: {
      id: data.id,
      status: data.status,
      formation: data.formation ?? null,
      layout: normalizeLineupLayout(data.layout_json, normalizedLayout.roster),
      publishedAt: data.published_at ?? null,
      updatedAt: data.updated_at ?? null,
    },
  };
}

export async function getCaptainGameLineupEditorData(
  gameId: string,
  teamId: string
): Promise<EditorResult> {
  const access = await verifyGameLineupManagerAccess(gameId, teamId);
  if (!access.authorized) {
    return { success: false, error: access.error };
  }

  const data = await buildEditorPayload(gameId, teamId, access.data);
  return { success: true, data };
}

export async function saveGameTeamLineupDraft(input: {
  gameId: string;
  teamId: string;
  leagueSlug: string;
  formation?: string | null;
  layout: GameTeamLineupLayout;
}): Promise<SaveResult> {
  return persistGameTeamLineup(input.gameId, input.teamId, input.leagueSlug, {
    formation: input.formation ?? null,
    layout: input.layout,
    publish: false,
  });
}

export async function publishGameTeamLineup(input: {
  gameId: string;
  teamId: string;
  leagueSlug: string;
  formation?: string | null;
  layout: GameTeamLineupLayout;
}): Promise<SaveResult> {
  return persistGameTeamLineup(input.gameId, input.teamId, input.leagueSlug, {
    formation: input.formation ?? null,
    layout: input.layout,
    publish: true,
  });
}

export async function getPublishedGameTeamLineups(gameId: string): Promise<PublishedGameTeamLineup[]> {
  const supabase = await createClient();
  const { data, error } = await ((supabase.from as any)('game_team_lineups') as any)
    .select(`
      id,
      game_id,
      team_id,
      status,
      formation,
      layout_json,
      published_at,
      updated_at,
      team:teams(id, name, slug, logo_url, primary_color, secondary_color)
    `)
    .eq('game_id', gameId)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as any[]).map((row) => ({
    id: row.id,
    gameId: row.game_id,
    teamId: row.team_id,
    status: row.status,
    formation: row.formation ?? null,
    layout: normalizeLineupLayout(row.layout_json, Array.isArray(row.layout_json?.roster) ? row.layout_json.roster : []),
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at ?? null,
    team: formatTeamIdentity(row.team),
  }));
}
