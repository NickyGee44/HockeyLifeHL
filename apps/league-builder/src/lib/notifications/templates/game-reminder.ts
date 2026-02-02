/**
 * Game Reminder Email Template
 *
 * Sent 24 hours and 2 hours before a game
 */

import { getBaseEmailTemplate, createDetailsList, createBadge } from './base';

export interface GameReminderEmailProps {
  playerName: string;
  teamName: string;
  opponentName: string;
  gameDate: string;
  gameTime: string;
  venueName: string;
  venueAddress?: string;
  hoursUntilGame: number;
  dashboardUrl: string;
  unsubscribeUrl?: string;
  leagueName?: string;
}

export function getGameReminderEmail(props: GameReminderEmailProps): string {
  const {
    playerName,
    teamName,
    opponentName,
    gameDate,
    gameTime,
    venueName,
    venueAddress,
    hoursUntilGame,
    dashboardUrl,
    unsubscribeUrl,
    leagueName = 'HockeyLifeHL',
  } = props;

  const urgencyBadge = hoursUntilGame <= 2
    ? createBadge('Starting Soon', 'warning')
    : createBadge('Upcoming Game', 'gold');

  const details = [
    { label: 'Your Team', value: teamName },
    { label: 'Opponent', value: opponentName },
    { label: 'Date', value: gameDate },
    { label: 'Time', value: gameTime },
    { label: 'Venue', value: venueName },
  ];

  if (venueAddress) {
    details.push({ label: 'Address', value: venueAddress });
  }

  const greeting = hoursUntilGame <= 2
    ? `Your game is starting in ${hoursUntilGame} hours!`
    : `Your game is tomorrow!`;

  const content = `
    <p>Hi ${playerName},</p>

    ${urgencyBadge}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>${greeting}</strong>
    </p>

    <p>
      Get ready - ${teamName} is taking on ${opponentName}.
      Make sure you arrive at least 15 minutes early for warm-ups.
    </p>

    ${createDetailsList(details)}

    <p style="color: #a3a3a3;">
      Don't forget your gear! Check your equipment and make sure everything is ready to go.
    </p>
  `;

  return getBaseEmailTemplate({
    title: `Game Reminder: ${teamName} vs ${opponentName}`,
    preheader: `${greeting} ${teamName} vs ${opponentName} at ${venueName}`,
    content,
    buttonText: 'View Game Details',
    buttonUrl: dashboardUrl,
    footerNote: hoursUntilGame <= 2
      ? 'This is a final reminder. See you on the ice!'
      : 'Need to make changes? Contact your team captain.',
    unsubscribeUrl,
    leagueName,
  });
}
