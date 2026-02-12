/**
 * iCalendar (.ics) generation utilities for hockey games.
 * Produces RFC 5545 compliant calendar events.
 */

interface GameLike {
  id: string;
  scheduled_at: string;
  venue?: string | null;
  home_team?: { name?: string } | null;
  away_team?: { name?: string } | null;
  home_score?: number | null;
  away_score?: number | null;
  status?: string;
}

const GAME_DURATION_MS = 90 * 60 * 1000; // 1.5 hours

function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toIcalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function buildEvent(game: GameLike): string {
  const start = new Date(game.scheduled_at);
  const end = new Date(start.getTime() + GAME_DURATION_MS);
  const away = game.away_team?.name || 'TBD';
  const home = game.home_team?.name || 'TBD';
  const summary = `${away} vs ${home}`;
  const location = game.venue || '';

  const lines = [
    'BEGIN:VEVENT',
    `UID:game-${game.id}@beerleaguehockey.ca`,
    `DTSTAMP:${toIcalDate(new Date())}`,
    `DTSTART:${toIcalDate(start)}`,
    `DTEND:${toIcalDate(end)}`,
    `SUMMARY:${escapeIcal(summary)}`,
  ];

  if (location) {
    lines.push(`LOCATION:${escapeIcal(location)}`);
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

export function generateGameIcal(game: GameLike): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BeerLeagueHockey//Mobile//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    buildEvent(game),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function generateScheduleIcal(games: GameLike[], calendarName: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BeerLeagueHockey//Mobile//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcal(calendarName)}`,
    ...games.map(buildEvent),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}
