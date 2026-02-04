/**
 * iCal Export Utility
 * Generates .ics file for personal calendar integration
 */

import type { Game } from '@/lib/offline/db';
import { format } from 'date-fns';

/**
 * Generate iCal format date string
 */
function formatICalDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss");
}

/**
 * Generate unique event ID
 */
function generateUID(game: Game): string {
  return `${game.id}@hockeylifehl.com`;
}

/**
 * Escape special characters for iCal
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate iCal event for a single game
 */
function generateGameEvent(game: Game): string {
  const startDate = new Date(game.scheduled_at);
  // Assume games are 90 minutes
  const endDate = new Date(startDate.getTime() + 90 * 60 * 1000);

  const summary = game.is_home
    ? `${game.home_team_name} vs ${game.away_team_name}`
    : `${game.away_team_name} @ ${game.home_team_name}`;

  const location = game.venue
    ? `${game.venue}${game.rink ? `, ${game.rink}` : ''}`
    : 'TBD';

  const description = game.is_home ? 'Home Game' : 'Away Game';

  return [
    'BEGIN:VEVENT',
    `UID:${generateUID(game)}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${escapeICalText(summary)}`,
    `LOCATION:${escapeICalText(location)}`,
    `DESCRIPTION:${escapeICalText(description)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P0DT2H0M0S',
    'ACTION:DISPLAY',
    'DESCRIPTION:Game in 2 hours',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-P1DT0H0M0S',
    'ACTION:DISPLAY',
    'DESCRIPTION:Game tomorrow',
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n');
}

/**
 * Generate full iCal calendar file
 */
export function generateICalCalendar(games: Game[], teamName: string): string {
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HockeyLifeHL//Player Companion//EN',
    `X-WR-CALNAME:${escapeICalText(teamName)} Schedule`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...games.map(generateGameEvent),
    'END:VCALENDAR',
  ].join('\r\n');

  return calendar;
}

/**
 * Download iCal file
 */
export function downloadICalFile(games: Game[], teamName: string): void {
  const icalContent = generateICalCalendar(games, teamName);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${teamName.replace(/\s+/g, '_')}_schedule.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate subscription URL for calendar apps
 * Note: This requires a server endpoint to serve the dynamic calendar
 */
export function getSubscriptionUrl(teamId: string): string {
  return `${window.location.origin}/api/calendar/${teamId}`;
}
