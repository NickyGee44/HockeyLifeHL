export type ConflictWatchGame = {
  id: string;
  scheduled_at: string;
  leagueId?: string;
  leagueName: string;
  teamName: string;
  location: string | null;
};

export type ScheduleConflict = {
  key: string;
  dateLabel: string;
  severity: 'overlap' | 'tight' | 'doubleheader';
  title: string;
  subtitle: string;
  games: ConflictWatchGame[];
};

function getDayKey(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function getSeverity(games: ConflictWatchGame[]): ScheduleConflict['severity'] {
  let minGapMinutes = Number.POSITIVE_INFINITY;

  for (let index = 1; index < games.length; index += 1) {
    const previous = new Date(games[index - 1].scheduled_at).getTime();
    const current = new Date(games[index].scheduled_at).getTime();
    minGapMinutes = Math.min(minGapMinutes, Math.round((current - previous) / 60000));
  }

  if (minGapMinutes <= 120) return 'overlap';
  if (minGapMinutes <= 240) return 'tight';
  return 'doubleheader';
}

function getSeverityTitle(severity: ScheduleConflict['severity']) {
  if (severity === 'overlap') return 'Possible overlap';
  if (severity === 'tight') return 'Tight turnaround';
  return 'Doubleheader';
}

export function getScheduleConflicts(games: ConflictWatchGame[]): ScheduleConflict[] {
  const grouped = new Map<string, ConflictWatchGame[]>();

  for (const game of games) {
    const key = getDayKey(game.scheduled_at);
    const current = grouped.get(key) ?? [];
    current.push(game);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const sortedGames = [...items].sort(
        (left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
      );

      if (sortedGames.length < 2) {
        return null;
      }

      const severity = getSeverity(sortedGames);
      const leagueCount = new Set(sortedGames.map((game) => game.leagueName)).size;
      const subtitle =
        leagueCount > 1
          ? `${sortedGames.length} games across ${leagueCount} leagues`
          : `${sortedGames.length} games in one league`;

      return {
        key,
        dateLabel: formatDateLabel(sortedGames[0].scheduled_at),
        severity,
        title: getSeverityTitle(severity),
        subtitle,
        games: sortedGames,
      } satisfies ScheduleConflict;
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = new Date(left!.games[0].scheduled_at).getTime();
      const rightTime = new Date(right!.games[0].scheduled_at).getTime();
      return leftTime - rightTime;
    }) as ScheduleConflict[];
}
