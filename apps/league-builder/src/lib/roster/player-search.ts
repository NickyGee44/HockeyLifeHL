export interface LeaguePlayerProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface LeagueRosterHistoryEntry {
  player_id: string;
  team_id: string | null;
  season_id: string | null;
  team_name?: string | null;
  season_name?: string | null;
  status?: string | null;
  joined_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface LeagueRegistrationHistoryEntry {
  player_id: string;
  season_id: string | null;
  team_id?: string | null;
  assigned_team_id?: string | null;
  team_name?: string | null;
  assigned_team_name?: string | null;
  season_name?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
}

export interface LeaguePlayerSearchResult extends LeaguePlayerProfile {
  latest_team_name: string | null;
  latest_season_name: string | null;
  source: 'roster' | 'registration';
}

interface SearchContext {
  latest_team_name: string | null;
  latest_season_name: string | null;
  sort_value: number;
  source: 'roster' | 'registration';
}

interface BuildLeaguePlayerSearchResultsParams {
  profiles: LeaguePlayerProfile[];
  rosterHistory: LeagueRosterHistoryEntry[];
  registrationHistory: LeagueRegistrationHistoryEntry[];
  currentTeamId?: string;
  currentSeasonId?: string;
  limit?: number;
}

function toSortValue(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue;
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return 0;
}

function pickPreferredContext(
  current: SearchContext | undefined,
  candidate: SearchContext
) {
  if (!current) {
    return candidate;
  }

  if (candidate.sort_value > current.sort_value) {
    return candidate;
  }

  if (
    candidate.sort_value === current.sort_value &&
    candidate.source === 'roster' &&
    current.source === 'registration'
  ) {
    return candidate;
  }

  return current;
}

export function buildLeaguePlayerSearchResults({
  profiles,
  rosterHistory,
  registrationHistory,
  currentTeamId,
  currentSeasonId,
  limit = 10,
}: BuildLeaguePlayerSearchResultsParams): LeaguePlayerSearchResult[] {
  const playersAlreadyOnRoster = new Set(
    rosterHistory
      .filter((entry) => {
        if (!currentTeamId || !currentSeasonId) {
          return false;
        }

        return (
          entry.team_id === currentTeamId &&
          entry.season_id === currentSeasonId &&
          entry.status === 'active' &&
          !entry.end_date
        );
      })
      .map((entry) => entry.player_id)
  );

  const contextByPlayerId = new Map<string, SearchContext>();

  for (const entry of rosterHistory) {
    const candidate: SearchContext = {
      latest_team_name: entry.team_name ?? null,
      latest_season_name: entry.season_name ?? null,
      sort_value: toSortValue(entry.joined_at, entry.start_date),
      source: 'roster',
    };

    contextByPlayerId.set(
      entry.player_id,
      pickPreferredContext(contextByPlayerId.get(entry.player_id), candidate)
    );
  }

  for (const entry of registrationHistory) {
    const candidate: SearchContext = {
      latest_team_name: entry.assigned_team_name ?? entry.team_name ?? null,
      latest_season_name: entry.season_name ?? null,
      sort_value: toSortValue(entry.submitted_at, entry.created_at),
      source: 'registration',
    };

    contextByPlayerId.set(
      entry.player_id,
      pickPreferredContext(contextByPlayerId.get(entry.player_id), candidate)
    );
  }

  const results: LeaguePlayerSearchResult[] = [];

  for (const profile of profiles) {
    if (playersAlreadyOnRoster.has(profile.id)) {
      continue;
    }

    const context = contextByPlayerId.get(profile.id);
    if (!context) {
      continue;
    }

    results.push({
      ...profile,
      latest_team_name: context.latest_team_name,
      latest_season_name: context.latest_season_name,
      source: context.source,
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}
