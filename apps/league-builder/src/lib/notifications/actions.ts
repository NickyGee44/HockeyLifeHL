'use server';

/**
 * Notification Actions
 *
 * Server actions for sending notifications and managing preferences
 */

import { createClient } from '@/lib/supabase/server';
import { sendEmail, sendBatchEmails, getUnsubscribeUrl, type BatchEmailRecipient } from './email-service';
import {
  getGameReminderEmail,
  getRosterChangeEmail,
  getLeagueAnnouncementEmail,
  sanitizeAnnouncementContent,
  getSuspensionIssuedPlayerEmail,
  getSuspensionIssuedCaptainEmail,
} from './templates';

// =============================================================================
// Types
// =============================================================================

export interface NotificationResult {
  success: boolean;
  sent?: number;
  failed?: number;
  error?: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  email_game_updates: boolean;
  email_registration: boolean;
  email_draft: boolean;
  email_billing: boolean;
  email_marketing: boolean;
  sms_enabled: boolean;
  sms_game_updates: boolean;
  sms_urgent_only: boolean;
  push_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
}

// =============================================================================
// Notification Preferences
// =============================================================================

/**
 * Get current user's notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    // Return defaults if no preferences exist
    return {
      email_enabled: true,
      email_game_updates: true,
      email_registration: true,
      email_draft: true,
      email_billing: true,
      email_marketing: false,
      sms_enabled: false,
      sms_game_updates: false,
      sms_urgent_only: true,
      push_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      timezone: 'America/Toronto',
    };
  }

  return data as NotificationPreferences;
}

/**
 * Update current user's notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('user_notification_preferences')
    .upsert({
      user_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('[Notifications] Update preferences error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Unsubscribe using token (for one-click unsubscribe)
 * Tokens expire after 1 year for security
 */
export async function unsubscribeWithToken(
  token: string,
  notificationType?: string
): Promise<NotificationResult> {
  const supabase = await createClient();

  // Find user by unsubscribe token and validate expiry
  const { data: prefs, error: findError } = await supabase
    .from('user_notification_preferences')
    .select('user_id, unsubscribe_token_expires_at')
    .eq('unsubscribe_token', token)
    .single();

  if (findError || !prefs) {
    return { success: false, error: 'Invalid unsubscribe token' };
  }

  // Check if token has expired
  if (prefs.unsubscribe_token_expires_at) {
    const expiryDate = new Date(prefs.unsubscribe_token_expires_at);
    if (expiryDate < new Date()) {
      return { success: false, error: 'Unsubscribe token has expired. Please use your account settings to manage preferences.' };
    }
  }

  // Update preferences based on type
  const updates: Partial<NotificationPreferences> = {};

  switch (notificationType) {
    case 'game_updates':
      updates.email_game_updates = false;
      break;
    case 'registration':
      updates.email_registration = false;
      break;
    case 'draft':
      updates.email_draft = false;
      break;
    case 'billing':
      updates.email_billing = false;
      break;
    case 'marketing':
      updates.email_marketing = false;
      break;
    default:
      // Unsubscribe from all
      updates.email_enabled = false;
  }

  const { error } = await supabase
    .from('user_notification_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', prefs.user_id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =============================================================================
// Helper: Check user preferences before sending
// =============================================================================

async function shouldSendEmail(
  userId: string,
  notificationType: 'game_updates' | 'registration' | 'draft' | 'billing' | 'marketing'
): Promise<{ canSend: boolean; unsubscribeToken?: string }> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('user_notification_preferences')
    .select('email_enabled, email_game_updates, email_registration, email_draft, email_billing, email_marketing, unsubscribe_token')
    .eq('user_id', userId)
    .single();

  if (!data) {
    // No preferences = default to allowed (except marketing)
    return {
      canSend: notificationType !== 'marketing',
      unsubscribeToken: undefined,
    };
  }

  if (!data.email_enabled) {
    return { canSend: false };
  }

  const typeMap = {
    game_updates: data.email_game_updates,
    registration: data.email_registration,
    draft: data.email_draft,
    billing: data.email_billing,
    marketing: data.email_marketing,
  };

  return {
    canSend: typeMap[notificationType] ?? true,
    unsubscribeToken: data.unsubscribe_token ?? undefined,
  };
}

// =============================================================================
// Helper: Log notification to database
// =============================================================================

async function logNotification(params: {
  leagueId: string;
  userId: string;
  type: string;
  channel: 'email' | 'sms' | 'push';
  subject: string;
  body?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  status: 'pending' | 'sent' | 'failed';
  providerMessageId?: string;
  failureReason?: string;
}): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      league_id: params.leagueId,
      user_id: params.userId,
      type: params.type,
      channel: params.channel,
      subject: params.subject,
      body: params.body || '',
      related_entity_type: params.relatedEntityType,
      related_entity_id: params.relatedEntityId,
      status: params.status,
      provider_message_id: params.providerMessageId,
      failure_reason: params.failureReason,
      sent_at: params.status === 'sent' ? new Date().toISOString() : null,
      failed_at: params.status === 'failed' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Notifications] Log error:', error);
    return null;
  }

  return data.id;
}

// =============================================================================
// Send Game Reminder
// =============================================================================

export async function sendGameReminderNotification(
  gameId: string,
  hoursUntilGame: number = 24
): Promise<NotificationResult> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';

  // Get game details with players
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(`
      id,
      scheduled_at,
      league_id,
      location,
      home_team:teams!home_team_id(id, name),
      away_team:teams!away_team_id(id, name),
      league:leagues!league_id(name)
    `)
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return { success: false, error: 'Game not found' };
  }

  // Get all players from both teams using team_rosters
  const { data: players } = await supabase
    .from('team_rosters')
    .select('team_id, player_id, profiles:profiles!player_id(id, email, full_name)')
    .in('team_id', [game.home_team?.id, game.away_team?.id].filter(Boolean))
    .eq('status', 'active');

  if (!players || players.length === 0) {
    return { success: true, sent: 0 };
  }

  const gameDate = new Date(game.scheduled_at);
  let sent = 0;
  let failed = 0;

  for (const player of players) {
    const profile = player.profiles as any;
    if (!profile?.email) continue;

    // Check preferences
    const { canSend, unsubscribeToken } = await shouldSendEmail(profile.id, 'game_updates');
    if (!canSend) continue;

    // Determine which team the player is on
    const playerTeam = player.team_id === game.home_team?.id ? game.home_team : game.away_team;
    const opponentTeam = player.team_id === game.home_team?.id ? game.away_team : game.home_team;

    const emailHtml = getGameReminderEmail({
      playerName: profile.full_name || 'Player',
      teamName: playerTeam?.name || 'Your Team',
      opponentName: opponentTeam?.name || 'Opponent',
      gameDate: gameDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }),
      gameTime: gameDate.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }),
      venueName: game.location || 'TBD',
      venueAddress: undefined,
      hoursUntilGame,
      dashboardUrl: `${siteUrl}/dashboard/games/${gameId}`,
      unsubscribeUrl: unsubscribeToken ? getUnsubscribeUrl(unsubscribeToken, 'game_updates') : undefined,
      leagueName: game.league?.name,
    });

    const result = await sendEmail({
      to: profile.email,
      subject: `Game Reminder: ${playerTeam?.name} vs ${opponentTeam?.name}`,
      html: emailHtml,
    });

    // Log notification
    await logNotification({
      leagueId: game.league_id,
      userId: profile.id,
      type: 'game_reminder',
      channel: 'email',
      subject: `Game Reminder: ${playerTeam?.name} vs ${opponentTeam?.name}`,
      relatedEntityType: 'game',
      relatedEntityId: gameId,
      status: result.success ? 'sent' : 'failed',
      providerMessageId: result.messageId,
      failureReason: result.error,
    });

    if (result.success) sent++;
    else failed++;
  }

  return { success: true, sent, failed };
}

// =============================================================================
// Send Roster Change Notification
// =============================================================================

export async function sendRosterChangeNotification(
  playerId: string,
  teamId: string,
  changeType: 'added' | 'removed',
  changedByUserId?: string,
  reason?: string
): Promise<NotificationResult> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';

  // Get player and team details
  const [playerResult, teamResult, changedByResult] = await Promise.all([
    supabase.from('profiles').select('id, email, full_name').eq('id', playerId).single(),
    // @ts-expect-error - Supabase nested join types cause TS2589 recursion depth
    supabase.from('teams').select('id, name, league_id, leagues:league_id(name), seasons:season_id(name)').eq('id', teamId).single(),
    changedByUserId ? supabase.from('profiles').select('full_name').eq('id', changedByUserId).single() : null,
  ]);

  const player = playerResult.data;
  const team = teamResult.data as any;

  if (!player?.email || !team) {
    return { success: false, error: 'Player or team not found' };
  }

  // Check preferences
  const { canSend, unsubscribeToken } = await shouldSendEmail(player.id, 'registration');
  if (!canSend) {
    return { success: true, sent: 0 };
  }

  const emailHtml = getRosterChangeEmail({
    playerName: player.full_name || 'Player',
    teamName: team.name,
    changeType,
    seasonName: team.seasons?.name || 'Current Season',
    changedByName: changedByResult?.data?.full_name ?? undefined,
    reason,
    dashboardUrl: `${siteUrl}/dashboard`,
    unsubscribeUrl: unsubscribeToken ? getUnsubscribeUrl(unsubscribeToken, 'registration') : undefined,
    leagueName: team.leagues?.name,
  });

  const subject = changeType === 'added'
    ? `Welcome to ${team.name}!`
    : `Roster Update: ${team.name}`;

  const result = await sendEmail({
    to: player.email,
    subject,
    html: emailHtml,
  });

  await logNotification({
    leagueId: team.league_id,
    userId: player.id,
    type: 'roster_change',
    channel: 'email',
    subject,
    relatedEntityType: 'team',
    relatedEntityId: teamId,
    status: result.success ? 'sent' : 'failed',
    providerMessageId: result.messageId,
    failureReason: result.error,
  });

  return {
    success: true,
    sent: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
  };
}

// =============================================================================
// Send League Announcement
// =============================================================================

export async function sendLeagueAnnouncement(params: {
  leagueId: string;
  subject: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recipientFilter?: 'all' | 'captains' | 'players' | 'admins';
  actionButtonText?: string;
  actionButtonUrl?: string;
}): Promise<NotificationResult> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';

  // Get current user (sender)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: sender } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  // Get league details
  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', params.leagueId)
    .single();

  if (!league) {
    return { success: false, error: 'League not found' };
  }

  // Get recipients based on filter
  let query = supabase
    .from('league_memberships')
    .select('user_id, role, profiles:user_id(id, email, full_name)')
    .eq('league_id', params.leagueId)
    .eq('status', 'active');

  if (params.recipientFilter === 'captains') {
    query = query.eq('role', 'captain');
  } else if (params.recipientFilter === 'players') {
    query = query.eq('role', 'player');
  } else if (params.recipientFilter === 'admins') {
    query = query.in('role', ['owner', 'admin']);
  }

  const { data: members } = await query;

  if (!members || members.length === 0) {
    return { success: true, sent: 0 };
  }

  // Sanitize content
  const sanitizedContent = sanitizeAnnouncementContent(params.content);

  // Prepare recipients
  const recipients: BatchEmailRecipient[] = [];
  const recipientPrefs: Map<string, { canSend: boolean; token?: string }> = new Map();

  for (const member of members) {
    const profile = member.profiles as any;
    if (!profile?.email) continue;

    const { canSend, unsubscribeToken } = await shouldSendEmail(profile.id, 'game_updates');
    if (canSend) {
      recipients.push({
        email: profile.email,
        name: profile.full_name,
        data: { userId: profile.id, unsubscribeToken },
      });
      recipientPrefs.set(profile.id, { canSend, token: unsubscribeToken });
    }
  }

  if (recipients.length === 0) {
    return { success: true, sent: 0 };
  }

  // Send batch
  const result = await sendBatchEmails(
    recipients,
    params.subject,
    (recipient) => getLeagueAnnouncementEmail({
      recipientName: recipient.name || 'Member',
      subject: params.subject,
      content: sanitizedContent,
      priority: params.priority,
      senderName: sender?.full_name || 'League Administrator',
      senderRole: 'League Administrator',
      actionButtonText: params.actionButtonText,
      actionButtonUrl: params.actionButtonUrl,
      dashboardUrl: `${siteUrl}/dashboard`,
      unsubscribeUrl: recipient.data?.unsubscribeToken
        ? getUnsubscribeUrl(recipient.data.unsubscribeToken, 'game_updates')
        : undefined,
      leagueName: league.name,
    }),
    {
      tags: [
        { name: 'type', value: 'announcement' },
        { name: 'league_id', value: params.leagueId },
      ],
    }
  );

  // Log notifications
  for (const sendResult of result.results) {
    const recipient = recipients.find(r => r.email === sendResult.email);
    if (recipient?.data?.userId) {
      await logNotification({
        leagueId: params.leagueId,
        userId: recipient.data.userId,
        type: 'league_announcement',
        channel: 'email',
        subject: params.subject,
        body: sanitizedContent,
        status: sendResult.success ? 'sent' : 'failed',
        providerMessageId: sendResult.messageId,
        failureReason: sendResult.error,
      });
    }
  }

  return {
    success: true,
    sent: result.sent,
    failed: result.failed,
  };
}

// =============================================================================
// Get Notification History
// =============================================================================

export async function getNotificationHistory(params: {
  leagueId?: string;
  limit?: number;
  offset?: number;
  type?: string;
  status?: string;
}): Promise<{ data: any[]; total: number }> {
  const supabase = await createClient();

  // Note: We intentionally do NOT include email addresses in the admin history view
  // to minimize PII exposure in admin interfaces. Emails are only needed for resending.
  let query = supabase
    .from('notifications')
    .select('*, profiles:user_id(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (params.leagueId) {
    query = query.eq('league_id', params.leagueId);
  }

  if (params.type) {
    query = query.eq('type', params.type);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  query = query.range(
    params.offset || 0,
    (params.offset || 0) + (params.limit || 50) - 1
  );

  const { data, count, error } = await query;

  if (error) {
    console.error('[Notifications] History error:', error);
    return { data: [], total: 0 };
  }

  return { data: data || [], total: count || 0 };
}

// =============================================================================
// Resend Failed Notification
// =============================================================================

export async function resendNotification(notificationId: string): Promise<NotificationResult> {
  const supabase = await createClient();

  // Get notification details
  const { data: notification, error } = await supabase
    .from('notifications')
    .select('*, profiles:user_id(email)')
    .eq('id', notificationId)
    .single();

  if (error || !notification) {
    return { success: false, error: 'Notification not found' };
  }

  const email = (notification.profiles as any)?.email;
  if (!email) {
    return { success: false, error: 'Recipient email not found' };
  }

  // Resend the email
  const result = await sendEmail({
    to: email,
    subject: notification.subject || 'Notification',
    html: notification.body,
  });

  // Update notification status
  await supabase
    .from('notifications')
    .update({
      status: result.success ? 'sent' : 'failed',
      sent_at: result.success ? new Date().toISOString() : null,
      failed_at: result.success ? null : new Date().toISOString(),
      failure_reason: result.error,
      retry_count: (notification.retry_count || 0) + 1,
      provider_message_id: result.messageId,
    })
    .eq('id', notificationId);

  return {
    success: result.success,
    sent: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    error: result.error,
  };
}

// =============================================================================
// Send Suspension Notification
// =============================================================================

export async function sendSuspensionNotification(params: {
  leagueId: string;
  playerId: string;
  teamId: string;
  reason: string;
  startDate: string;
  endDate?: string;
  gamesRemaining: number;
}): Promise<NotificationResult> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';

  try {
    // Look up player, team, league, and captain in parallel
    const [playerResult, teamResult, leagueResult, captainResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', params.playerId)
        .single(),
      supabase
        .from('teams')
        .select('id, name')
        .eq('id', params.teamId)
        .single(),
      supabase
        .from('leagues')
        .select('name')
        .eq('id', params.leagueId)
        .single(),
      // Find the team captain via team_rosters
      supabase
        .from('team_rosters')
        .select('player_id, profiles:profiles!player_id(id, email, full_name)')
        .eq('team_id', params.teamId)
        .eq('leadership_role', 'captain' as any)
        .eq('status', 'active')
        .limit(1),
    ]);

    const player = playerResult.data;
    const team = teamResult.data;
    const league = leagueResult.data;
    const captainRoster = captainResult.data?.[0];
    const captain = captainRoster?.profiles as any;

    if (!player?.email || !team) {
      return { success: false, error: 'Player or team not found' };
    }

    const leagueName = league?.name || 'Beer League Hockey';
    const teamName = team.name;
    const playerName = player.full_name || 'Player';
    const dashboardUrl = `${siteUrl}/dashboard`;

    let sent = 0;
    let failed = 0;

    // --- Send email to suspended player ---
    const playerPref = await shouldSendEmail(player.id, 'game_updates');
    if (playerPref.canSend) {
      const playerEmailHtml = getSuspensionIssuedPlayerEmail({
        playerName,
        teamName,
        leagueName,
        reason: params.reason,
        startDate: params.startDate,
        endDate: params.endDate,
        gamesRemaining: params.gamesRemaining,
        dashboardUrl,
        unsubscribeUrl: playerPref.unsubscribeToken
          ? getUnsubscribeUrl(playerPref.unsubscribeToken, 'game_updates')
          : undefined,
      });

      const playerSubject = `Suspension Notice: ${params.gamesRemaining} game${params.gamesRemaining !== 1 ? 's' : ''} - ${leagueName}`;

      const playerResult = await sendEmail({
        to: player.email,
        subject: playerSubject,
        html: playerEmailHtml,
      });

      await logNotification({
        leagueId: params.leagueId,
        userId: player.id,
        type: 'suspension_issued',
        channel: 'email',
        subject: playerSubject,
        relatedEntityType: 'suspension',
        status: playerResult.success ? 'sent' : 'failed',
        providerMessageId: playerResult.messageId,
        failureReason: playerResult.error,
      });

      if (playerResult.success) sent++;
      else failed++;
    }

    // --- Send email to team captain (if found and different from player) ---
    if (captain?.email && captain.id !== player.id) {
      const captainPref = await shouldSendEmail(captain.id, 'game_updates');
      if (captainPref.canSend) {
        const captainEmailHtml = getSuspensionIssuedCaptainEmail({
          captainName: captain.full_name || 'Captain',
          playerName,
          teamName,
          leagueName,
          reason: params.reason,
          startDate: params.startDate,
          endDate: params.endDate,
          gamesRemaining: params.gamesRemaining,
          dashboardUrl,
          unsubscribeUrl: captainPref.unsubscribeToken
            ? getUnsubscribeUrl(captainPref.unsubscribeToken, 'game_updates')
            : undefined,
        });

        const captainSubject = `Team Suspension Alert: ${playerName} - ${teamName}`;

        const captainSendResult = await sendEmail({
          to: captain.email,
          subject: captainSubject,
          html: captainEmailHtml,
        });

        await logNotification({
          leagueId: params.leagueId,
          userId: captain.id,
          type: 'suspension_issued',
          channel: 'email',
          subject: captainSubject,
          relatedEntityType: 'suspension',
          status: captainSendResult.success ? 'sent' : 'failed',
          providerMessageId: captainSendResult.messageId,
          failureReason: captainSendResult.error,
        });

        if (captainSendResult.success) sent++;
        else failed++;
      }
    }

    return { success: true, sent, failed };
  } catch (error) {
    console.error('[Notifications] Suspension notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending suspension notification',
    };
  }
}

// =============================================================================
// Get Delivery Stats
// =============================================================================

export async function getDeliveryStats(leagueId: string): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('status')
    .eq('league_id', leagueId);

  if (error || !data) {
    return { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 };
  }

  const stats = {
    total: data.length,
    sent: data.filter(n => n.status === 'sent').length,
    failed: data.filter(n => n.status === 'failed').length,
    pending: data.filter(n => n.status === 'pending').length,
    successRate: 0,
  };

  if (stats.total > 0) {
    stats.successRate = Math.round((stats.sent / stats.total) * 100);
  }

  return stats;
}
