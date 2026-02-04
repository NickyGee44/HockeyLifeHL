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
