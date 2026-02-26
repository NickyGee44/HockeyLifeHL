// @ts-nocheck — new tables pending migration; regenerate types after running migrations
'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';

type ActionResult<T = unknown> = Promise<
  | { success: true; data: T }
  | { success: false; error: string }
>;

type GoalieRegistrationInput = {
  name: string;
  email: string;
  phone?: string;
  skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  availability?: Record<string, boolean>;
  has_full_gear?: boolean;
  rate_per_game?: number;
  preferred_arenas?: string[];
};

export async function registerGoalieSelf(
  leagueSlug: string,
  input: GoalieRegistrationInput,
): ActionResult<{ goalieId: string; verificationToken: string }> {
  try {
    const supabase = createServiceRoleClient();

    const { data: league } = await supabase
      .from('leagues')
      .select('id')
      .eq('slug', leagueSlug)
      .eq('status', 'active')
      .single();

    if (!league) return { success: false, error: 'League not found' };

    const { data, error } = await (supabase as any)
      .from('goalie_pool' as any)
      .insert({
        league_id: league.id,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone || null,
        skill_level: input.skill_level || 'intermediate',
        availability: input.availability || {},
        has_full_gear: input.has_full_gear ?? true,
        rate_per_game: input.rate_per_game ?? 0,
        preferred_arenas: input.preferred_arenas || [],
        status: 'pending',
        registered_via: 'self_registration',
      })
      .select('id, verification_token')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Unable to submit registration' };
    }

    return {
      success: true,
      data: {
        goalieId: data.id as string,
        verificationToken: data.verification_token as string,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unable to submit registration' };
  }
}

export async function getGoalieAcceptView(
  leagueSlug: string,
  token: string,
): ActionResult<{
  requestId: string;
  requestStatus: string;
  gameDate: string | null;
  teamName: string;
  leagueName: string;
  compensation: string | null;
  notes: string | null;
  goalieName: string;
}> {
  try {
    const supabase = createServiceRoleClient();

    const { data: notification } = await (supabase as any)
      .from('goalie_request_notifications' as any)
      .select(`
        request_id,
        goalie_id,
        request:goalie_requests(
          id,
          status,
          compensation,
          notes,
          league:leagues(name, slug),
          team:teams(name),
          game:games(scheduled_at)
        ),
        goalie:goalie_pool(name)
      `)
      .eq('accept_token', token)
      .single();

    if (!notification) return { success: false, error: 'Invalid token' };

    const request = Array.isArray(notification.request) ? notification.request[0] : notification.request;
    const league = Array.isArray(request?.league) ? request.league[0] : request?.league;
    const team = Array.isArray(request?.team) ? request.team[0] : request?.team;
    const game = Array.isArray(request?.game) ? request.game[0] : request?.game;
    const goalie = Array.isArray(notification.goalie) ? notification.goalie[0] : notification.goalie;

    if (!request || !league || league.slug !== leagueSlug) {
      return { success: false, error: 'Invalid token for this league' };
    }

    return {
      success: true,
      data: {
        requestId: request.id,
        requestStatus: request.status,
        gameDate: game?.scheduled_at || null,
        teamName: team?.name || 'Team',
        leagueName: league.name || 'League',
        compensation: request.compensation,
        notes: request.notes,
        goalieName: goalie?.name || 'Goalie',
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load request' };
  }
}

export async function createGoalieRequest(
  gameId: string,
  teamId: string,
  data: { skillLevelNeeded?: string; compensation?: string; notes?: string }
): Promise<{ success: boolean; data?: { goaliesNotified: number }; error?: string }> {
  try {
    // Auth + captain role check
    const { createAuthClient } = await import('@/lib/supabase/server');
    const authClient = await createAuthClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: membership } = await authClient
      .from('team_rosters')
      .select('leadership_role')
      .eq('team_id', teamId)
      .eq('player_id', user.id)
      .single();

    if (
      !membership ||
      !['captain', 'alternate_captain'].includes(membership.leadership_role || '')
    ) {
      return { success: false, error: 'Captain role required' };
    }

    const supabase = createServiceRoleClient();

    // Get game + league info
    const { data: game } = await supabase
      .from('games')
      .select('scheduled_at, league_id, home_team_id, away_team_id')
      .eq('id', gameId)
      .single();

    if (!game) return { success: false, error: 'Game not found' };
    if (game.home_team_id !== teamId && game.away_team_id !== teamId) {
      return { success: false, error: 'Team is not in this game' };
    }

    // Check for existing open request
    const { data: existing } = await (supabase as any)
      .from('goalie_requests' as any)
      .select('id')
      .eq('game_id', gameId)
      .eq('team_id', teamId)
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'A goalie request already exists for this game' };
    }

    const expiresAt = new Date(
      new Date(game.scheduled_at).getTime() - 60 * 60 * 1000
    ).toISOString();

    // Create the request
    const { data: request, error: requestError } = await (supabase as any)
      .from('goalie_requests' as any)
      .insert({
        game_id: gameId,
        team_id: teamId,
        league_id: game.league_id,
        requested_by: user.id,
        skill_level_needed: data.skillLevelNeeded || 'intermediate',
        compensation: data.compensation || null,
        notes: data.notes || null,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (requestError || !request) {
      return {
        success: false,
        error: requestError?.message || 'Failed to create goalie request',
      };
    }

    // Notify all active goalies in this league
    const { data: goalies } = await (supabase as any)
      .from('goalie_pool' as any)
      .select('id, email')
      .eq('league_id', game.league_id)
      .eq('status', 'active');

    if (goalies && goalies.length > 0) {
      const { randomUUID } = await import('crypto');
      await (supabase as any)
        .from('goalie_request_notifications' as any)
        .insert(
          goalies.map((g: any) => ({
            request_id: request.id,
            goalie_id: g.id,
            accept_token: randomUUID(),
            status: 'pending',
          }))
        );
    }

    return { success: true, data: { goaliesNotified: goalies?.length ?? 0 } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create goalie request',
    };
  }
}

export async function acceptGoalieRequestByToken(
  leagueSlug: string,
  token: string,
): ActionResult<{ status: 'accepted' | 'already_filled' | 'expired'; requestId: string }> {
  try {
    const supabase = createServiceRoleClient();

    const { data: notification } = await (supabase as any)
      .from('goalie_request_notifications' as any)
      .select(`
        id,
        goalie_id,
        request_id,
        request:goalie_requests(
          id,
          status,
          expires_at,
          league:leagues(slug)
        )
      `)
      .eq('accept_token', token)
      .single();

    if (!notification) return { success: false, error: 'Invalid token' };

    const request = Array.isArray(notification.request) ? notification.request[0] : notification.request;
    const league = Array.isArray(request?.league) ? request.league[0] : request?.league;

    if (!request || !league || league.slug !== leagueSlug) {
      return { success: false, error: 'Invalid token for this league' };
    }

    const isExpired = request.expires_at ? new Date(request.expires_at) < new Date() : false;
    if (request.status !== 'open' || isExpired) {
      return { success: true, data: { status: 'expired', requestId: request.id } };
    }

    const { data: updated } = await (supabase as any)
      .from('goalie_requests' as any)
      .update({
        status: 'filled',
        filled_by: notification.goalie_id,
        filled_at: new Date().toISOString(),
      })
      .eq('id', request.id)
      .eq('status', 'open')
      .is('filled_by', null)
      .select('id')
      .single();

    if (!updated) {
      return { success: true, data: { status: 'already_filled', requestId: request.id } };
    }

    await Promise.all([
      (supabase as any)
        .from('goalie_request_notifications' as any)
        .update({ status: 'accepted' })
        .eq('id', notification.id),
      (supabase as any)
        .from('goalie_request_notifications' as any)
        .update({ status: 'expired' })
        .eq('request_id', request.id)
        .neq('id', notification.id),
    ]);

    return { success: true, data: { status: 'accepted', requestId: request.id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to accept request' };
  }
}
