/**
 * Scorekeeper Daily Reminder Email Template
 *
 * Sent on the morning of a game to remind the assigned scorekeeper.
 * Supports multiple games per day with individual token-embedded links.
 */

import { getBaseEmailTemplate, createDetailsList, createBadge } from './base';

export interface ScorekeeperReminderGame {
  homeTeamName: string;
  awayTeamName: string;
  gameTime: string;
  venue: string;
  accessLink: string;
}

export interface ScorekeeperReminderEmailProps {
  scorekeeperName: string;
  leagueName: string;
  gameDate: string;
  games: ScorekeeperReminderGame[];
  unsubscribeUrl?: string;
}

function renderSingleGame(game: ScorekeeperReminderGame): string {
  const details = [
    { label: 'Matchup', value: `${game.homeTeamName} vs ${game.awayTeamName}` },
    { label: 'Time', value: game.gameTime },
    { label: 'Venue', value: game.venue },
  ];

  return `
    ${createDetailsList(details)}

    <div style="text-align: center; margin: 24px 0;">
      <a href="${game.accessLink}" style="display: inline-block; background: linear-gradient(to right, #22D3EE, #3B82F6); color: #070A0F !important; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
        Open Scorekeeper — ${game.homeTeamName} vs ${game.awayTeamName}
      </a>
    </div>
  `;
}

function renderMultipleGames(games: ScorekeeperReminderGame[]): string {
  return games
    .map(
      (game, index) => `
      <div style="margin: ${index > 0 ? '32px' : '0'} 0 0 0; ${index > 0 ? 'border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;' : ''}">
        <h3 style="color: #fafafa; margin: 0 0 8px 0; font-size: 16px;">
          Game ${index + 1}: ${game.homeTeamName} vs ${game.awayTeamName}
        </h3>
        ${renderSingleGame(game)}
      </div>
    `
    )
    .join('');
}

export function getScorekeeperReminderEmail(props: ScorekeeperReminderEmailProps): string {
  const { scorekeeperName, leagueName, gameDate, games, unsubscribeUrl } = props;

  const gameCount = games.length;
  const firstGame = games[0];
  const subjectMatchup = `${firstGame.homeTeamName} vs ${firstGame.awayTeamName}`;

  const content = `
    <p>Hi ${scorekeeperName},</p>

    ${createBadge('Game Day Reminder', 'warning')}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>You have ${gameCount === 1 ? 'a game' : `${gameCount} games`} today!</strong>
    </p>

    <p>
      ${gameDate} — ${gameCount === 1 ? "here are your game details and direct access link. No login required." : "here are your games and direct access links. No login required."}
    </p>

    ${gameCount === 1 ? renderSingleGame(firstGame) : renderMultipleGames(games)}

    <div style="background-color: rgba(245, 158, 11, 0.1); border-radius: 12px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #F59E0B;">Quick Checklist:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #fafafa;">
        <li style="margin-bottom: 8px;">Arrive 10–15 minutes before game time</li>
        <li style="margin-bottom: 8px;">Verify both team rosters are correct</li>
        <li style="margin-bottom: 8px;">Test your device and connection at the rink</li>
        <li style="margin-bottom: 0;">Contact the league admin if you can't make it</li>
      </ul>
    </div>

    <p style="color: #a3a3a3; font-size: 14px;">
      <strong>Tip:</strong> Click your access link now to load the interface — it works offline too,
      so you'll be ready even if rink Wi-Fi is spotty.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Game Day Reminder',
    preheader: `You have ${gameCount === 1 ? 'a game' : `${gameCount} games`} today — ${subjectMatchup}`,
    content,
    footerNote: "Can't make it? Contact your league administrator as soon as possible.",
    unsubscribeUrl,
    leagueName,
  });
}
