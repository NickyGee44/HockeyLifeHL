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
