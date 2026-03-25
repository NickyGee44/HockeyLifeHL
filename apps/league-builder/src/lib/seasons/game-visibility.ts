export const AGGREGATE_STATS_GAME_LOCATION_PREFIX = '[aggregate-only]';

export function isAggregateStatsGameLocation(location: string | null | undefined): boolean {
  return (location ?? '').startsWith(AGGREGATE_STATS_GAME_LOCATION_PREFIX);
}

export function toAggregateStatsGameLocation(label: string): string {
  return `${AGGREGATE_STATS_GAME_LOCATION_PREFIX} ${label}`;
}
