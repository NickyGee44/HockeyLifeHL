/**
 * Scorekeeper Assignment Email Template
 *
 * Sent when a league owner/admin assigns a scorekeeper to a game
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface ScorekeeperAssignmentEmailProps {
  scorekeeperName: string;
  leagueName: string;
  homeTeamName: string;
  awayTeamName: string;
  gameDate: string;
  gameTime: string;
  token: string;
  accessLink: string;
  expiresAt: string;
  unsubscribeUrl?: string;
}

export function getScorekeeperAssignmentEmail(props: ScorekeeperAssignmentEmailProps): string {
  const {
    scorekeeperName,
    leagueName,
    homeTeamName,
    awayTeamName,
    gameDate,
    gameTime,
    token,
    accessLink,
    expiresAt,
    unsubscribeUrl,
  } = props;

  const details = [
    { label: 'Game', value: `${homeTeamName} vs ${awayTeamName}` },
    { label: 'Date', value: gameDate },
    { label: 'Time', value: gameTime },
    { label: 'Access Token', value: token },
    { label: 'Token Expires', value: expiresAt },
  ];

  const content = `
    <p>Hi ${scorekeeperName},</p>

    ${createBadge('Scorekeeper Assignment', 'gold')}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>You've been assigned as scorekeeper for this game!</strong>
    </p>

    <p>
      You'll be tracking stats and managing the game sheet for this matchup.
      Your access token and direct link are provided below.
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(`
      <p style="margin: 0 0 8px 0;">
        <strong style="color: #22D3EE;">Your Access Token:</strong>
      </p>
      <p style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #22D3EE; font-family: monospace;">
        ${token}
      </p>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #a3a3a3;">
        Enter this code at the scorekeeper login page or use the direct link below.
      </p>
    `)}

    <div style="text-align: center; margin: 24px 0;">
      <a href="${accessLink}" style="display: inline-block; background: linear-gradient(to right, #22D3EE, #3B82F6); color: #070A0F !important; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
        Access Scorekeeper Interface
      </a>
    </div>

    <div style="background-color: rgba(34, 211, 238, 0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #22D3EE;">What You'll Be Doing:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #fafafa;">
        <li style="margin-bottom: 8px;">Track goals, assists, and penalties in real-time</li>
        <li style="margin-bottom: 8px;">Record goalie saves and shots on goal</li>
        <li style="margin-bottom: 8px;">Submit final stats for team captain verification</li>
        <li style="margin-bottom: 0;">Ensure accurate game statistics for league records</li>
      </ul>
    </div>

    <p style="color: #a3a3a3; font-size: 14px;">
      <strong>First time using the scorekeeper interface?</strong><br>
      Don't worry! The interface is intuitive and easy to use. You'll see both team rosters,
      and can quickly add goals, assists, penalties, and saves with just a few taps.
    </p>

    <p style="color: #a3a3a3; font-size: 14px;">
      <strong>Important:</strong> Your access token expires on ${expiresAt}.
      If you need a new token or have any issues, contact the league administrator.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Scorekeeper Assignment',
    preheader: `You've been assigned as scorekeeper for ${homeTeamName} vs ${awayTeamName}`,
    content,
    buttonText: 'Open Scorekeeper Interface',
    buttonUrl: accessLink,
    footerNote: 'Questions? Contact your league administrator for help.',
    unsubscribeUrl,
    leagueName,
  });
}
