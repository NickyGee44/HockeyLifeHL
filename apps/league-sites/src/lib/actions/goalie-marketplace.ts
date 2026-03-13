// @ts-nocheck — new tables pending migration; regenerate types after running migrations
'use server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { verifyTeamLeadershipAccess } from './team-captain-access';

type ActionResult<T = unknown> = Promise<
  | { success: true; data: T }
  | { success: false; error: string }
>;

export type GoalieMarketplaceSkillLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type GoalieRequestPaymentStatus = 'unpaid' | 'paid';

export interface CaptainGoalieMarketplaceItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  skillLevel: GoalieMarketplaceSkillLevel;
  ratePerGame: number;
  hasFullGear: boolean;
  preferredArenas: string[];
  averageRating: number;
  ratingCount: number;
}

export interface CaptainGoalieUpcomingGame {
  id: string;
  scheduledAt: string;
  location: string | null;
  status: string;
  opponentName: string;
  existingRequestId: string | null;
  existingRequestStatus: string | null;
}

export interface CaptainGoalieRequestItem {
  id: string;
  gameId: string;
  gameLabel: string;
  scheduledAt: string | null;
  location: string | null;
  status: string;
  skillLevelNeeded: GoalieMarketplaceSkillLevel | null;
  compensation: string | null;
  notes: string | null;
  createdAt: string;
  filledAt: string | null;
  filledGoalieId: string | null;
  filledGoalieName: string | null;
  filledGoalieEmail: string | null;
  filledGoaliePhone: string | null;
  paymentStatus: GoalieRequestPaymentStatus;
  paidAmountCents: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentNotes: string | null;
  paidAt: string | null;
  userRatingStars: number | null;
  userRatingNote: string | null;
}

export interface CaptainGoalieDashboardData {
  activeGoalies: CaptainGoalieMarketplaceItem[];
  upcomingGames: CaptainGoalieUpcomingGame[];
  requests: CaptainGoalieRequestItem[];
  unpaidFilledRequests: number;
}

type GoaliePaymentMethod = 'e_transfer' | 'cash' | 'check' | 'other' | 'stripe';

type GoaliePaymentInput = {
  amountCents: number;
  paymentMethod: GoaliePaymentMethod;
  referenceNumber?: string;
  notes?: string;
};

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
    const auth = await verifyTeamLeadershipAccess(teamId);
    if (!auth.authorized || !auth.userId) {
      return { success: false, error: auth.error || 'Captain role required' };
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
        requested_by: auth.userId,
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

async function getGoalieRequestRows(
  supabase: ReturnType<typeof createServiceRoleClient>,
  teamId: string,
) {
  const query = async (includePaymentColumns: boolean) =>
    (supabase as any)
      .from('goalie_requests' as any)
      .select(`
        id,
        game_id,
        status,
        skill_level_needed,
        compensation,
        notes,
        created_at,
        filled_at,
        filled_by,
        ${includePaymentColumns ? 'payment_status,paid_amount_cents,payment_method,payment_reference,payment_notes,paid_at,' : ''}
        game:games(
          id,
          scheduled_at,
          location,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        ),
        filled_goalie:goalie_pool!goalie_requests_filled_by_fkey(
          id,
          name,
          email,
          phone
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

  let { data, error } = await query(true);
  if (error && (error.code === '42703' || error.message?.includes('payment_'))) {
    const fallback = await query(false);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(error.message || 'Failed to load goalie requests');
  }

  return data || [];
}

export async function getCaptainGoalieDashboard(
  teamId: string,
): ActionResult<CaptainGoalieDashboardData> {
  try {
    const auth = await verifyTeamLeadershipAccess(teamId);
    if (!auth.authorized || !auth.userId || !auth.leagueId) {
      return { success: false, error: auth.error || 'Captain access required' };
    }

    const supabase = createServiceRoleClient();

    const [
      poolResult,
      ratingsResult,
      requestsRows,
      upcomingGamesResult,
      userRatingsResult,
    ] = await Promise.all([
      (supabase as any)
        .from('goalie_pool' as any)
        .select('id, name, email, phone, skill_level, rate_per_game, has_full_gear, preferred_arenas')
        .eq('league_id', auth.leagueId)
        .eq('status', 'active')
        .order('name', { ascending: true }),
      (supabase as any)
        .from('goalie_ratings' as any)
        .select('goalie_id, stars')
        .eq('league_id', auth.leagueId),
      getGoalieRequestRows(supabase, teamId),
      (supabase as any)
        .from('games')
        .select(`
          id,
          scheduled_at,
          location,
          status,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(8),
      (supabase as any)
        .from('goalie_ratings' as any)
        .select('goalie_id, game_id, stars, private_note')
        .eq('rated_by', auth.userId)
        .eq('league_id', auth.leagueId),
    ]);

    const ratingsByGoalie = new Map<string, { total: number; count: number }>();
    for (const rating of ratingsResult.data || []) {
      const goalieId = rating.goalie_id as string;
      const current = ratingsByGoalie.get(goalieId) || { total: 0, count: 0 };
      current.total += Number(rating.stars || 0);
      current.count += 1;
      ratingsByGoalie.set(goalieId, current);
    }

    const activeGoalies: CaptainGoalieMarketplaceItem[] = (poolResult.data || []).map((goalie: any) => {
      const aggregate = ratingsByGoalie.get(goalie.id);
      return {
        id: goalie.id,
        name: goalie.name,
        email: goalie.email,
        phone: goalie.phone ?? null,
        skillLevel: (goalie.skill_level || 'intermediate') as GoalieMarketplaceSkillLevel,
        ratePerGame: Number(goalie.rate_per_game || 0),
        hasFullGear: Boolean(goalie.has_full_gear),
        preferredArenas: Array.isArray(goalie.preferred_arenas) ? goalie.preferred_arenas : [],
        averageRating: aggregate ? Number((aggregate.total / aggregate.count).toFixed(1)) : 0,
        ratingCount: aggregate?.count || 0,
      };
    });

    const requestByGameId = new Map<string, any>();
    const userRatingsByKey = new Map<string, { stars: number; privateNote: string | null }>();

    for (const rating of userRatingsResult.data || []) {
      userRatingsByKey.set(`${rating.game_id}:${rating.goalie_id}`, {
        stars: Number(rating.stars || 0),
        privateNote: rating.private_note ?? null,
      });
    }

    const requests: CaptainGoalieRequestItem[] = requestsRows.map((row: any) => {
      requestByGameId.set(row.game_id, row);

      const game = Array.isArray(row.game) ? row.game[0] : row.game;
      const homeTeam = Array.isArray(game?.home_team) ? game.home_team[0] : game?.home_team;
      const awayTeam = Array.isArray(game?.away_team) ? game.away_team[0] : game?.away_team;
      const filledGoalie = Array.isArray(row.filled_goalie) ? row.filled_goalie[0] : row.filled_goalie;
      const opponentName =
        game?.home_team_id === teamId ? awayTeam?.name || 'Opponent' : homeTeam?.name || 'Opponent';
      const gameLabel = game?.scheduled_at
        ? `${new Intl.DateTimeFormat('en-CA', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(game.scheduled_at))} vs ${opponentName}`
        : opponentName;
      const rating = filledGoalie?.id
        ? userRatingsByKey.get(`${row.game_id}:${filledGoalie.id}`)
        : null;

      return {
        id: row.id,
        gameId: row.game_id,
        gameLabel,
        scheduledAt: game?.scheduled_at ?? null,
        location: game?.location ?? null,
        status: row.status,
        skillLevelNeeded: (row.skill_level_needed || 'intermediate') as GoalieMarketplaceSkillLevel,
        compensation: row.compensation ?? null,
        notes: row.notes ?? null,
        createdAt: row.created_at,
        filledAt: row.filled_at ?? null,
        filledGoalieId: filledGoalie?.id ?? null,
        filledGoalieName: filledGoalie?.name ?? null,
        filledGoalieEmail: filledGoalie?.email ?? null,
        filledGoaliePhone: filledGoalie?.phone ?? null,
        paymentStatus: (row.payment_status || 'unpaid') as GoalieRequestPaymentStatus,
        paidAmountCents: Number(row.paid_amount_cents || 0),
        paymentMethod: row.payment_method ?? null,
        paymentReference: row.payment_reference ?? null,
        paymentNotes: row.payment_notes ?? null,
        paidAt: row.paid_at ?? null,
        userRatingStars: rating?.stars ?? null,
        userRatingNote: rating?.privateNote ?? null,
      };
    });

    const upcomingGames: CaptainGoalieUpcomingGame[] = (upcomingGamesResult.data || []).map((game: any) => {
      const homeTeam = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team;
      const awayTeam = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team;
      const opponentName =
        game.home_team_id === teamId ? awayTeam?.name || 'Opponent' : homeTeam?.name || 'Opponent';
      const existingRequest = requestByGameId.get(game.id);

      return {
        id: game.id,
        scheduledAt: game.scheduled_at,
        location: game.location ?? null,
        status: game.status,
        opponentName,
        existingRequestId: existingRequest?.id ?? null,
        existingRequestStatus: existingRequest?.status ?? null,
      };
    });

    return {
      success: true,
      data: {
        activeGoalies,
        upcomingGames,
        requests,
        unpaidFilledRequests: requests.filter(
          (request) => request.status === 'filled' && request.paymentStatus !== 'paid',
        ).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load goalie marketplace',
    };
  }
}

export async function cancelCaptainGoalieRequest(
  requestId: string,
  teamId: string,
): ActionResult<{ id: string }> {
  try {
    const auth = await verifyTeamLeadershipAccess(teamId);
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Captain access required' };
    }

    const supabase = createServiceRoleClient();
    const { data: request } = await (supabase as any)
      .from('goalie_requests' as any)
      .select('id, team_id, status')
      .eq('id', requestId)
      .eq('team_id', teamId)
      .single();

    if (!request) {
      return { success: false, error: 'Goalie request not found' };
    }

    if (request.status !== 'open') {
      return { success: false, error: 'Only open goalie requests can be cancelled' };
    }

    const { error } = await (supabase as any)
      .from('goalie_requests' as any)
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('team_id', teamId)
      .eq('status', 'open');

    if (error) {
      return { success: false, error: error.message || 'Failed to cancel goalie request' };
    }

    return { success: true, data: { id: requestId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel goalie request',
    };
  }
}

export async function rateCaptainGoalie(
  teamId: string,
  goalieId: string,
  gameId: string,
  data: { stars: number; privateNote?: string },
): ActionResult<{ id: string }> {
  try {
    const auth = await verifyTeamLeadershipAccess(teamId);
    if (!auth.authorized || !auth.userId || !auth.leagueId) {
      return { success: false, error: auth.error || 'Captain access required' };
    }

    if (!Number.isInteger(data.stars) || data.stars < 1 || data.stars > 5) {
      return { success: false, error: 'Choose a rating between 1 and 5 stars' };
    }

    const supabase = createServiceRoleClient();
    const { data: request } = await (supabase as any)
      .from('goalie_requests' as any)
      .select('id')
      .eq('team_id', teamId)
      .eq('game_id', gameId)
      .eq('filled_by', goalieId)
      .eq('status', 'filled')
      .maybeSingle();

    if (!request) {
      return { success: false, error: 'No filled goalie request found for this game' };
    }

    const { data: rating, error } = await (supabase as any)
      .from('goalie_ratings' as any)
      .upsert(
        {
          goalie_id: goalieId,
          rated_by: auth.userId,
          game_id: gameId,
          league_id: auth.leagueId,
          stars: data.stars,
          private_note: data.privateNote?.trim() || null,
          tags: [],
        },
        {
          onConflict: 'goalie_id,rated_by,game_id',
        },
      )
      .select('id')
      .single();

    if (error || !rating) {
      return { success: false, error: error?.message || 'Failed to save goalie rating' };
    }

    return { success: true, data: { id: rating.id as string } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save goalie rating',
    };
  }
}

export async function recordCaptainGoaliePayment(
  teamId: string,
  requestId: string,
  data: GoaliePaymentInput,
): ActionResult<{ id: string }> {
  try {
    const auth = await verifyTeamLeadershipAccess(teamId);
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Captain access required' };
    }

    if (!Number.isInteger(data.amountCents) || data.amountCents < 0) {
      return { success: false, error: 'Enter a valid payment amount' };
    }

    const supabase = createServiceRoleClient();
    const { data: request } = await (supabase as any)
      .from('goalie_requests' as any)
      .select('id, status')
      .eq('id', requestId)
      .eq('team_id', teamId)
      .single();

    if (!request) {
      return { success: false, error: 'Goalie request not found' };
    }

    if (request.status !== 'filled') {
      return { success: false, error: 'Only filled goalie requests can be marked as paid' };
    }

    const { error } = await (supabase as any)
      .from('goalie_requests' as any)
      .update({
        payment_status: 'paid',
        paid_amount_cents: data.amountCents,
        payment_method: data.paymentMethod,
        payment_reference: data.referenceNumber?.trim() || null,
        payment_notes: data.notes?.trim() || null,
        paid_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('team_id', teamId);

    if (error) {
      if (error.code === '42703' || error.message?.includes('payment_')) {
        return {
          success: false,
          error: 'Goalie payment tracking is not available in this environment yet.',
        };
      }

      return { success: false, error: error.message || 'Failed to record goalie payment' };
    }

    return { success: true, data: { id: requestId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record goalie payment',
    };
  }
}
