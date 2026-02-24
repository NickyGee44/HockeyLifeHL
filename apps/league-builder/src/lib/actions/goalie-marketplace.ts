// @ts-nocheck — new tables pending migration; regenerate types after running migrations
'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notifications/email-service';
import {
  getGoalieRequestNotificationEmail,
  getGoalieRequestFilledCaptainEmail,
  getGoalieRequestFilledGoalieEmail,
} from '@/lib/notifications/templates';

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export type GoalieSkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type GoalieStatus = 'active' | 'inactive' | 'blacklisted' | 'pending';
export type GoalieRequestStatus = 'open' | 'filled' | 'cancelled' | 'expired';

export interface GoaliePoolItem {
  id: string;
  league_id: string;
  name: string;
  email: string;
  phone: string | null;
  skill_level: GoalieSkillLevel | null;
  availability: Record<string, boolean>;
  has_full_gear: boolean;
  rate_per_game: number;
  preferred_arenas: string[];
  status: GoalieStatus;
  verification_token: string;
  registered_via: 'manual' | 'self_registration' | 'import';
  created_at: string;
  updated_at: string;
  average_rating?: number;
  rating_count?: number;
}

export interface GoalieRequestItem {
  id: string;
  game_id: string;
  team_id: string;
  league_id: string;
  requested_by: string;
  skill_level_needed: GoalieSkillLevel | null;
  compensation: string | null;
  notes: string | null;
  status: GoalieRequestStatus;
  filled_by: string | null;
  filled_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface GoalieFilters {
  status?: GoalieStatus;
  skillLevel?: GoalieSkillLevel;
}

interface GoalieRequestFilters {
  status?: GoalieRequestStatus;
  gameId?: string;
  teamId?: string;
}

interface AddGoalieInput {
  name: string;
  email: string;
  phone?: string;
  skill_level?: GoalieSkillLevel;
  availability?: Record<string, boolean>;
  has_full_gear?: boolean;
  rate_per_game?: number;
  preferred_arenas?: string[];
  status?: GoalieStatus;
  registered_via?: 'manual' | 'self_registration' | 'import';
}

interface CreateGoalieRequestInput {
  skill_level_needed?: GoalieSkillLevel;
  compensation?: string;
  notes?: string;
}

interface RateGoalieInput {
  stars: number;
  tags?: string[];
  private_note?: string;
}

function getPublicSiteUrl(): string {
  return process.env.NEXT_PUBLIC_LEAGUE_SITES_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function verifyLeagueAdmin(leagueId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: league } = await supabase
    .from('leagues')
    .select('owner_id, created_by')
    .eq('id', leagueId)
    .single();

  if (league && (league.owner_id === userId || league.created_by === userId)) {
    return true;
  }

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role,status')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .single();

  return !!membership;
}

async function verifyCaptainOrLeagueAdmin(teamId: string, userId: string): Promise<{ authorized: boolean; leagueId?: string }> {
  const supabase = await createClient();

  const { data: team } = await supabase
    .from('teams')
    .select('id, league_id, captain_id')
    .eq('id', teamId)
    .single();

  if (!team) return { authorized: false };
  if (team.captain_id === userId) return { authorized: true, leagueId: team.league_id };

  const isAdmin = await verifyLeagueAdmin(team.league_id, userId);
  return { authorized: isAdmin, leagueId: team.league_id };
}

export async function getGoaliePool(leagueId: string, filters?: GoalieFilters): Promise<ActionResult<GoaliePoolItem[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = (supabase as any)
      .from('goalie_pool' as any)
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.skillLevel) query = query.eq('skill_level', filters.skillLevel);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const goalies = (data || []) as GoaliePoolItem[];

    if (!goalies.length) {
      return { success: true, data: [] };
    }

    const goalieIds = goalies.map(g => g.id);
    const { data: ratings } = await (supabase as any)
      .from('goalie_ratings' as any)
      .select('goalie_id, stars')
      .in('goalie_id', goalieIds);

    const ratingsByGoalie = new Map<string, { total: number; count: number }>();
    for (const rating of ratings || []) {
      const goalieId = rating.goalie_id as string;
      const current = ratingsByGoalie.get(goalieId) || { total: 0, count: 0 };
      current.total += Number(rating.stars || 0);
      current.count += 1;
      ratingsByGoalie.set(goalieId, current);
    }

    return {
      success: true,
      data: goalies.map(goalie => {
        const agg = ratingsByGoalie.get(goalie.id);
        return {
          ...goalie,
          average_rating: agg ? Number((agg.total / agg.count).toFixed(2)) : 0,
          rating_count: agg?.count || 0,
        };
      }),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch goalie pool' };
  }
}

export async function addGoalieToPool(leagueId: string, goalieData: AddGoalieInput): Promise<ActionResult<GoaliePoolItem>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const isAdmin = await verifyLeagueAdmin(leagueId, userId);
    if (!isAdmin) return { success: false, error: 'Not authorized to manage goalie pool' };

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('goalie_pool' as any)
      .insert({
        league_id: leagueId,
        name: goalieData.name,
        email: goalieData.email.toLowerCase(),
        phone: goalieData.phone ?? null,
        skill_level: goalieData.skill_level ?? 'intermediate',
        availability: goalieData.availability ?? {},
        has_full_gear: goalieData.has_full_gear ?? true,
        rate_per_game: goalieData.rate_per_game ?? 0,
        preferred_arenas: goalieData.preferred_arenas ?? [],
        status: goalieData.status ?? 'active',
        registered_via: goalieData.registered_via ?? 'manual',
      })
      .select('*')
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Failed to add goalie' };
    }

    revalidatePath('/dashboard/leagues');
    return { success: true, data: data as GoaliePoolItem };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add goalie' };
  }
}

export async function updateGoalie(goalieId: string, updates: Partial<AddGoalieInput>): Promise<ActionResult<GoaliePoolItem>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    const { data: existing } = await (supabase as any)
      .from('goalie_pool' as any)
      .select('league_id')
      .eq('id', goalieId)
      .single();

    if (!existing) return { success: false, error: 'Goalie not found' };

    const isAdmin = await verifyLeagueAdmin(existing.league_id as string, userId);
    if (!isAdmin) return { success: false, error: 'Not authorized to update goalie' };

    const { data, error } = await (supabase as any)
      .from('goalie_pool' as any)
      .update({
        ...updates,
        email: updates.email ? updates.email.toLowerCase() : undefined,
      })
      .eq('id', goalieId)
      .select('*')
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Failed to update goalie' };

    revalidatePath('/dashboard/leagues');
    return { success: true, data: data as GoaliePoolItem };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update goalie' };
  }
}

export async function removeGoalie(goalieId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    const { data: existing } = await (supabase as any)
      .from('goalie_pool' as any)
      .select('league_id')
      .eq('id', goalieId)
      .single();

    if (!existing) return { success: false, error: 'Goalie not found' };

    const isAdmin = await verifyLeagueAdmin(existing.league_id as string, userId);
    if (!isAdmin) return { success: false, error: 'Not authorized to remove goalie' };

    const { error } = await (supabase as any)
      .from('goalie_pool' as any)
      .update({ status: 'blacklisted' })
      .eq('id', goalieId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/leagues');
    return { success: true, data: { id: goalieId } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove goalie' };
  }
}

export async function createGoalieRequest(
  gameId: string,
  teamId: string,
  requestData: CreateGoalieRequestInput,
): Promise<ActionResult<GoalieRequestItem>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const access = await verifyCaptainOrLeagueAdmin(teamId, userId);
    if (!access.authorized || !access.leagueId) {
      return { success: false, error: 'Only team captains or league admins can request a goalie' };
    }

    const supabase = await createClient();
    const { data: game } = await supabase
      .from('games')
      .select('id, league_id, scheduled_at, home_team_id, away_team_id')
      .eq('id', gameId)
      .single();

    if (!game) return { success: false, error: 'Game not found' };
    if (game.league_id !== access.leagueId) return { success: false, error: 'Game/team league mismatch' };
    if (game.home_team_id !== teamId && game.away_team_id !== teamId) {
      return { success: false, error: 'Selected team is not in this game' };
    }

    const expiresAt = new Date(new Date(game.scheduled_at).getTime() - 60 * 60 * 1000).toISOString();

    const { data: request, error } = await (supabase as any)
      .from('goalie_requests' as any)
      .insert({
        game_id: gameId,
        team_id: teamId,
        league_id: access.leagueId,
        requested_by: userId,
        skill_level_needed: requestData.skill_level_needed ?? 'intermediate',
        compensation: requestData.compensation ?? null,
        notes: requestData.notes ?? null,
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (error || !request) {
      return { success: false, error: error?.message || 'Failed to create request' };
    }

    // Notify all active goalies in this league
    const [goaliesResult, leagueResult, teamResult] = await Promise.all([
      (supabase as any)
        .from('goalie_pool' as any)
        .select('id, name, email')
        .eq('league_id', access.leagueId)
        .eq('status', 'active'),
      supabase.from('leagues').select('name, slug').eq('id', access.leagueId).single(),
      supabase.from('teams').select('name').eq('id', teamId).single(),
    ]);

    const goalies = goaliesResult.data || [];
    if (goalies.length > 0) {
      const { data: notifications } = await (supabase as any)
        .from('goalie_request_notifications' as any)
        .insert(goalies.map((goalie: { id: string }) => ({ request_id: request.id, goalie_id: goalie.id })))
        .select('goalie_id, accept_token');

      const tokenByGoalieId = new Map<string, string>();
      for (const item of notifications || []) {
        tokenByGoalieId.set(item.goalie_id as string, item.accept_token as string);
      }

      const teamName = teamResult.data?.name || 'Team';
      const leagueName = leagueResult.data?.name || 'League';
      const leagueSlug = leagueResult.data?.slug || '';
      const gameDate = new Date(game.scheduled_at).toLocaleString();

      await Promise.all(
        goalies.map(async (goalie: { id: string; name: string; email: string }) => {
          const acceptToken = tokenByGoalieId.get(goalie.id);
          if (!acceptToken) return;

          const acceptUrl = `${getPublicSiteUrl()}/${leagueSlug}/goalies/accept/${acceptToken}`;
          const html = getGoalieRequestNotificationEmail({
            leagueName,
            goalieName: goalie.name,
            teamName,
            gameDate,
            compensation: request.compensation,
            notes: request.notes,
            acceptUrl,
          });

          await sendEmail({
            to: goalie.email,
            subject: `${leagueName}: Goalie sub needed for ${teamName}`,
            html,
            tags: [{ name: 'type', value: 'goalie_request' }],
          });
        })
      );
    }

    revalidatePath('/dashboard/leagues');
    return { success: true, data: request as GoalieRequestItem };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create request' };
  }
}

export async function cancelGoalieRequest(requestId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    const { data: request } = await (supabase as any)
      .from('goalie_requests' as any)
      .select('id, league_id, requested_by')
      .eq('id', requestId)
      .single();

    if (!request) return { success: false, error: 'Request not found' };

    const isAdmin = await verifyLeagueAdmin(request.league_id as string, userId);
    if (!isAdmin && request.requested_by !== userId) {
      return { success: false, error: 'Not authorized to cancel this request' };
    }

    const { error } = await (supabase as any)
      .from('goalie_requests' as any)
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('status', 'open');

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/leagues');
    return { success: true, data: { id: requestId } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel request' };
  }
}

export async function getGoalieRequests(
  leagueId: string,
  filters?: GoalieRequestFilters,
): Promise<ActionResult<GoalieRequestItem[]>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = (supabase as any)
      .from('goalie_requests' as any)
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.gameId) query = query.eq('game_id', filters.gameId);
    if (filters?.teamId) query = query.eq('team_id', filters.teamId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data || []) as GoalieRequestItem[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch requests' };
  }
}

export async function getGoalieRatings(goalieId: string): Promise<ActionResult<Array<{
  id: string;
  stars: number;
  tags: string[];
  private_note: string | null;
  created_at: string;
  rated_by: string;
}>>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('goalie_ratings' as any)
      .select('id, stars, tags, private_note, created_at, rated_by')
      .eq('goalie_id', goalieId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch ratings' };
  }
}

export async function rateGoalie(
  goalieId: string,
  gameId: string,
  ratingData: RateGoalieInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    if (!Number.isInteger(ratingData.stars) || ratingData.stars < 1 || ratingData.stars > 5) {
      return { success: false, error: 'Stars must be between 1 and 5' };
    }

    const supabase = await createClient();

    const { data: request } = await (supabase as any)
      .from('goalie_requests' as any)
      .select('league_id, team_id')
      .eq('game_id', gameId)
      .eq('filled_by', goalieId)
      .single();

    if (!request) {
      return { success: false, error: 'No filled goalie request found for this game/goalie' };
    }

    const access = await verifyCaptainOrLeagueAdmin(request.team_id as string, userId);
    if (!access.authorized) {
      return { success: false, error: 'Only captains/admins can rate goalies' };
    }

    const { data, error } = await (supabase as any)
      .from('goalie_ratings' as any)
      .upsert({
        goalie_id: goalieId,
        rated_by: userId,
        game_id: gameId,
        league_id: request.league_id,
        stars: ratingData.stars,
        tags: ratingData.tags ?? [],
        private_note: ratingData.private_note ?? null,
      }, {
        onConflict: 'goalie_id,rated_by,game_id',
      })
      .select('id')
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Failed to rate goalie' };

    revalidatePath('/dashboard/leagues');
    return { success: true, data: { id: data.id as string } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to rate goalie' };
  }
}

export async function acceptGoalieRequest(acceptToken: string): Promise<ActionResult<{
  requestId: string;
  status: 'accepted' | 'already_filled' | 'expired';
}>> {
  try {
    const supabase = createServiceRoleClient();

    const { data: notification, error: notificationError } = await (supabase as any)
      .from('goalie_request_notifications' as any)
      .select(`
        id,
        status,
        request_id,
        goalie_id,
        accept_token,
        request:goalie_requests(
          id,
          status,
          expires_at,
          game_id,
          team_id,
          league_id,
          requested_by,
          compensation,
          notes,
          game:games(scheduled_at),
          team:teams(name),
          league:leagues(name, slug)
        ),
        goalie:goalie_pool(name, email)
      `)
      .eq('accept_token', acceptToken)
      .single();

    if (notificationError || !notification) {
      return { success: false, error: 'Invalid token' };
    }

    const request = Array.isArray(notification.request) ? notification.request[0] : notification.request;
    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    const isExpired = request.expires_at ? new Date(request.expires_at) < new Date() : false;
    if (request.status !== 'open' || isExpired) {
      await (supabase as any)
        .from('goalie_request_notifications' as any)
        .update({ status: 'expired' })
        .eq('id', notification.id);
      return { success: true, data: { requestId: request.id, status: 'expired' } };
    }

    const { data: updatedRequest } = await (supabase as any)
      .from('goalie_requests' as any)
      .update({
        status: 'filled',
        filled_by: notification.goalie_id,
        filled_at: new Date().toISOString(),
      })
      .eq('id', request.id)
      .eq('status', 'open')
      .is('filled_by', null)
      .select('*')
      .single();

    if (!updatedRequest) {
      return { success: true, data: { requestId: request.id, status: 'already_filled' } };
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

    const league = Array.isArray(request.league) ? request.league[0] : request.league;
    const team = Array.isArray(request.team) ? request.team[0] : request.team;
    const game = Array.isArray(request.game) ? request.game[0] : request.game;
    const goalie = Array.isArray(notification.goalie) ? notification.goalie[0] : notification.goalie;

    const gameDate = game?.scheduled_at ? new Date(game.scheduled_at).toLocaleString() : 'TBD';
    const leagueName = league?.name || 'League';
    const teamName = team?.name || 'Team';

    const { data: captain } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', request.requested_by)
      .single();

    if (captain?.email) {
      const captainEmailHtml = getGoalieRequestFilledCaptainEmail({
        captainName: captain.full_name || 'Captain',
        leagueName,
        teamName,
        gameDate,
        goalieName: goalie?.name || 'Goalie',
      });

      await sendEmail({
        to: captain.email,
        subject: `${leagueName}: Your goalie request is filled`,
        html: captainEmailHtml,
        tags: [{ name: 'type', value: 'goalie_request_filled_captain' }],
      });
    }

    if (goalie?.email) {
      const goalieEmailHtml = getGoalieRequestFilledGoalieEmail({
        goalieName: goalie.name || 'Goalie',
        leagueName,
        teamName,
        gameDate,
        compensation: request.compensation,
        notes: request.notes,
      });

      await sendEmail({
        to: goalie.email,
        subject: `${leagueName}: You are confirmed as goalie sub`,
        html: goalieEmailHtml,
        tags: [{ name: 'type', value: 'goalie_request_filled_goalie' }],
      });
    }

    return {
      success: true,
      data: { requestId: request.id, status: 'accepted' },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to accept request' };
  }
}
