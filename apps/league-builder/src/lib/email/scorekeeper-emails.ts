/**
 * Scorekeeper Email Notifications
 *
 * Email sending functions for scorekeeper assignment and notifications.
 * Uses premium branded email templates with Resend for delivery.
 */

import { sendEmail } from '@/lib/notifications/email-service';
import {
  getScorekeeperAssignmentEmail,
  type ScorekeeperAssignmentEmailProps,
} from '@/lib/notifications/templates/scorekeeper-assignment';
import {
  getScorekeeperReminderEmail,
  type ScorekeeperReminderGame,
} from '@/lib/notifications/templates/scorekeeper-reminder';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Send scorekeeper assignment email
 */
export async function sendScorekeeperAssignmentEmail(params: {
  to: string;
  scorekeeperName: string;
  leagueName: string;
  homeTeamName: string;
  awayTeamName: string;
  gameDate: string;
  gameTime: string;
  token: string;
  accessLink: string;
  expiresAt: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    scorekeeperName,
    leagueName,
    homeTeamName,
    awayTeamName,
    gameDate,
    gameTime,
    token,
    accessLink,
    expiresAt,
  } = params;

  const templateProps: ScorekeeperAssignmentEmailProps = {
    scorekeeperName,
    leagueName,
    homeTeamName,
    awayTeamName,
    gameDate,
    gameTime,
    token,
    accessLink,
    expiresAt,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  };

  const html = getScorekeeperAssignmentEmail(templateProps);

  return sendEmail({
    to,
    subject: `Scorekeeper Assignment: ${homeTeamName} vs ${awayTeamName}`,
    html,
    tags: [
      { name: 'category', value: 'scorekeeper' },
      { name: 'type', value: 'assignment' },
    ],
  });
}

/**
 * Send a daily reminder email to a scorekeeper with all their games for today.
 * Only call this when the scorekeeper has at least one game.
 */
export async function sendScorekeeperDailyReminder(params: {
  to: string;
  scorekeeperName: string;
  leagueName: string;
  gameDate: string;
  games: ScorekeeperReminderGame[];
}): Promise<{ success: boolean; error?: string }> {
  const { to, scorekeeperName, leagueName, gameDate, games } = params;

  if (games.length === 0) {
    return { success: true }; // Nothing to send
  }

  const firstGame = games[0];
  const subject =
    games.length === 1
      ? `Game Day: ${firstGame.homeTeamName} vs ${firstGame.awayTeamName} — ${firstGame.gameTime}`
      : `Game Day: You have ${games.length} games today`;

  const html = getScorekeeperReminderEmail({
    scorekeeperName,
    leagueName,
    gameDate,
    games,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  });

  return sendEmail({
    to,
    subject,
    html,
    tags: [
      { name: 'category', value: 'scorekeeper' },
      { name: 'type', value: 'daily-reminder' },
    ],
  });
}
