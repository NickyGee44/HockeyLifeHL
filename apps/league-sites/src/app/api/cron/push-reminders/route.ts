import { NextResponse, type NextRequest } from 'next/server';
import { requireCronSecret } from '@/lib/api/guards';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendPushNotification, type WebPushPayload } from '@/lib/push/server';

export const runtime = 'nodejs';

type NotificationType = 'sunday_checkin_t4d' | 'game_reminder_t4h' | 'game_recap';

interface PushGame {
  id: string;
  scheduled_at: string;
  location: string | null;
  league_id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  home_team?: PushTeam | PushTeam[] | null;
  away_team?: PushTeam | PushTeam[] | null;
  league?: PushLeague | PushLeague[] | null;
}

interface PushTeam {
  id: string;
  name: string;
  slug: string | null;
  push_enabled?: boolean | null;
}

interface PushLeague {
  id: string;
  name: string;
  slug: string;
  timezone: string | null;
  status: string | null;
}

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface DueNotification {
  type: NotificationType;
  game: PushGame;
  title: string;
  body: string;
  url: string;
  tag: string;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const auth = requireCronSecret(request);
  if ('response' in auth) return auth.response;

  const supabase = createServiceRoleClient();
  const now = new Date();

  try {
    const dueNotifications = await findDueNotifications(supabase, now);
    const totals = {
      due: dueNotifications.length,
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedDuplicate: 0,
      skippedSuppressed: 0,
      skippedNoSubscription: 0,
      disabledSubscriptions: 0,
      sendLogInserted: 0,
    };

    for (const notification of dueNotifications) {
      const result = await sendNotificationToRoster(supabase, notification);
      totals.attempted += result.attempted;
      totals.sent += result.sent;
      totals.failed += result.failed;
      totals.skippedDuplicate += result.skippedDuplicate;
      totals.skippedSuppressed += result.skippedSuppressed;
      totals.skippedNoSubscription += result.skippedNoSubscription;
      totals.disabledSubscriptions += result.disabledSubscriptions;
      totals.sendLogInserted += result.sendLogInserted;
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      ...totals,
    });
  } catch (error) {
    console.error('[cron/push-reminders] Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

async function findDueNotifications(supabase: any, now: Date): Promise<DueNotification[]> {
  const notifications: DueNotification[] = [];

  const [checkinGames, reminderGames, recaps] = await Promise.all([
    fetchGamesInWindow(supabase, new Date(now.getTime() + 4 * DAY_MS), new Date(now.getTime() + 4 * DAY_MS + HOUR_MS)),
    fetchGamesInWindow(supabase, new Date(now.getTime() + 4 * HOUR_MS), new Date(now.getTime() + 5 * HOUR_MS)),
    fetchRecentRecaps(supabase, new Date(now.getTime() - DAY_MS), now),
  ]);

  for (const game of checkinGames) {
    const league = unwrap(game.league);
    const timezone = league?.timezone || 'America/Toronto';
    if (!isSunday(game.scheduled_at, timezone)) continue;

    const teams = getTeams(game);
    notifications.push({
      type: 'sunday_checkin_t4d',
      game,
      title: 'Sunday check-in is open',
      body: `${teams.away.name} vs ${teams.home.name} is coming up Sunday. Let your captain know if you can play.`,
      url: gameUrl(game, false),
      tag: `blh-sunday-checkin-${game.id}`,
    });
  }

  for (const game of reminderGames) {
    const teams = getTeams(game);
    notifications.push({
      type: 'game_reminder_t4h',
      game,
      title: 'Game in 4 hours',
      body: `${teams.away.name} vs ${teams.home.name}${game.location ? ` at ${game.location}` : ''}.`,
      url: gameUrl(game, false),
      tag: `blh-game-reminder-${game.id}`,
    });
  }

  for (const recap of recaps) {
    const game = unwrap(recap.game);
    if (!game) continue;

    const teams = getTeams(game);
    notifications.push({
      type: 'game_recap',
      game,
      title: 'Game recap is live',
      body: `${teams.away.name} vs ${teams.home.name} recap is ready.`,
      url: gameUrl(game, true),
      tag: `blh-game-recap-${game.id}`,
    });
  }

  return notifications;
}

async function fetchGamesInWindow(supabase: any, start: Date, end: Date): Promise<PushGame[]> {
  const { data, error } = await supabase
    .from('games')
    .select(`
      id,
      scheduled_at,
      location,
      league_id,
      season_id,
      home_team_id,
      away_team_id,
      home_team:teams!games_home_team_id_fkey(id, name, slug, push_enabled),
      away_team:teams!games_away_team_id_fkey(id, name, slug, push_enabled),
      league:leagues!games_league_id_fkey(id, name, slug, timezone, status)
    `)
    .eq('status', 'scheduled')
    .gte('scheduled_at', start.toISOString())
    .lt('scheduled_at', end.toISOString());

  if (error) throw new Error(error.message);

  return ((data || []) as PushGame[]).filter((game) => unwrap(game.league)?.status === 'active');
}

async function fetchRecentRecaps(supabase: any, start: Date, end: Date): Promise<Array<{ game?: PushGame | PushGame[] | null }>> {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id,
      published_at,
      game:games!articles_game_id_fkey(
        id,
        scheduled_at,
        location,
        league_id,
        season_id,
        home_team_id,
        away_team_id,
        home_team:teams!games_home_team_id_fkey(id, name, slug, push_enabled),
        away_team:teams!games_away_team_id_fkey(id, name, slug, push_enabled),
        league:leagues!games_league_id_fkey(id, name, slug, timezone, status)
      )
    `)
    .eq('type', 'game_recap')
    .eq('published', true)
    .not('game_id', 'is', null)
    .gte('published_at', start.toISOString())
    .lte('published_at', end.toISOString());

  if (error) throw new Error(error.message);

  return ((data || []) as Array<{ game?: PushGame | PushGame[] | null }>).filter(
    (row) => unwrap(row.game)?.league && unwrap(unwrap(row.game)?.league)?.status === 'active',
  );
}

async function sendNotificationToRoster(supabase: any, notification: DueNotification) {
  const game = notification.game;
  const teams = getTeams(game);
  const enabledTeamIds = [teams.home, teams.away]
    .filter((team) => team.push_enabled !== false)
    .map((team) => team.id);

  const result = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skippedDuplicate: 0,
    skippedSuppressed: [teams.home, teams.away].length - enabledTeamIds.length,
    skippedNoSubscription: 0,
    disabledSubscriptions: 0,
    sendLogInserted: 0,
  };

  if (enabledTeamIds.length === 0) return result;

  const { data: rosterRows, error: rosterError } = await supabase
    .from('team_rosters')
    .select('player_id, team_id')
    .eq('league_id', game.league_id)
    .eq('season_id', game.season_id)
    .eq('status', 'active')
    .is('end_date', null)
    .in('team_id', enabledTeamIds);

  if (rosterError) throw new Error(rosterError.message);

  const playerIds = [
    ...new Set(
      ((rosterRows || []) as Array<{ player_id: string | null }>)
        .map((row) => row.player_id)
        .filter((playerId): playerId is string => Boolean(playerId)),
    ),
  ];
  if (playerIds.length === 0) return result;

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', playerIds)
    .is('disabled_at', null);

  if (subscriptionsError) throw new Error(subscriptionsError.message);

  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const subscription of (subscriptions || []) as PushSubscriptionRow[]) {
    const current = subscriptionsByUser.get(subscription.user_id) || [];
    current.push(subscription);
    subscriptionsByUser.set(subscription.user_id, current);
  }

  const payload: WebPushPayload = {
    title: notification.title,
    body: notification.body,
    url: notification.url,
    tag: notification.tag,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: {
      notificationType: notification.type,
      gameId: game.id,
    },
  };

  for (const playerId of playerIds) {
    const playerSubscriptions = subscriptionsByUser.get(playerId) || [];
    if (playerSubscriptions.length === 0) {
      result.skippedNoSubscription += 1;
      continue;
    }

    const { data: sendLog, error: logError } = await supabase
      .from('notification_send_log')
      .insert({
        notification_type: notification.type,
        game_id: game.id,
        user_id: playerId,
        payload,
      })
      .select('id')
      .single();

    if (logError) {
      if (logError.code === '23505') {
        result.skippedDuplicate += 1;
        continue;
      }

      throw new Error(logError.message);
    }

    result.sendLogInserted += 1;
    result.attempted += 1;

    let delivered = 0;
    for (const subscription of playerSubscriptions) {
      try {
        await sendPushNotification(subscription, payload);
        delivered += 1;
      } catch (error) {
        const statusCode = getPushStatusCode(error);
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .update({ disabled_at: new Date().toISOString(), failure_count: 0 })
            .eq('id', subscription.id);
          result.disabledSubscriptions += 1;
        } else {
          await supabase
            .from('push_subscriptions')
            .update({ failure_count: 1 })
            .eq('id', subscription.id);
        }
      }
    }

    if (delivered > 0) {
      result.sent += 1;
    } else {
      result.failed += 1;
      await supabase
        .from('notification_send_log')
        .delete()
        .eq('id', sendLog.id);
    }
  }

  return result;
}

function getTeams(game: PushGame) {
  const home = unwrap(game.home_team);
  const away = unwrap(game.away_team);

  if (!home || !away) {
    throw new Error(`Game ${game.id} is missing team data`);
  }

  return { home, away };
}

function gameUrl(game: PushGame, recap: boolean) {
  const league = unwrap(game.league);
  const slug = league?.slug;
  const baseUrl =
    process.env.NEXT_PUBLIC_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.beerleaguehockey.ca';
  const origin = baseUrl.replace(/\/$/, '');
  const path = slug ? `/${slug}/games/${game.id}` : `/games/${game.id}`;

  return `${origin}${path}${recap ? '#recap' : ''}`;
}

function isSunday(date: string, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  }).format(new Date(date)) === 'Sun';
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getPushStatusCode(error: unknown) {
  if (typeof error === 'object' && error && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === 'number' ? statusCode : null;
  }

  return null;
}
