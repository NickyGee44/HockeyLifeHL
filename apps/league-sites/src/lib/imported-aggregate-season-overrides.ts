import { isHistoricalCareerBaselineSeasonName } from './all-time-stats';
import type { UnifiedGoalieStatsRow, UnifiedSkaterStatsRow } from './types';

export const HLHL_WINTER_2026_SEASON_ID = '30ee2c0b-5981-4df4-b0cc-d7cae05b9e37';

const HLHL_WINTER_2026_SKATER_GP = [
  ['Steve Almond', 10],
  ['Mitch Bedard', 10],
  ['Craig Bettridge', 11],
  ['Jim Bloxam', 11],
  ['Jonathan Brougham', 9],
  ['Lyndon Bulda', 11],
  ['Vince Carducci', 8],
  ['Andre Carruthers', 6],
  ['Cris Cervoni', 8],
  ['Terry Drew', 9],
  ['Paul Gibson', 10],
  ['Matt Grossi', 10],
  ['Sam Haight', 9],
  ['Marty Hanke', 10],
  ['Eric Hartley', 8],
  ['Adrian Hartley', 8],
  ['Cooper Hatfield', 11],
  ['Tristan Hatfield', 11],
  ['Dhurim Ismaili', 7],
  ['Marek Klimowicz', 10],
  ['Adam Klimowicz', 11],
  ['Stefan Kowlessar', 11],
  ['Adrian Kwasek', 11],
  ['Jeff Lobodzinski', 11],
  ['Dan Macgillavray', 9],
  ['Garrett Mcinerney', 11],
  ['David Miskus', 10],
  ['Eric Morston', 10],
  ['Cory Nott', 11],
  ['Trevor Paterson', 9],
  ['Daryl Patterson', 9],
  ['Adam Raphael', 2],
  ['Hayden Reginier', 9],
  ['Andrew Sawchuk', 9],
  ['Cameron Sheppard', 11],
  ['Sonny Teale', 11],
  ['Sean Teasdale', 9],
  ['Cameron Wallace', 11],
  ['David Watson', 10],
  ['Nathan Zaplatar', 5],
  ['Ben Austin', 1],
  ['Max Bowman', 2],
  ['Caleb Cook', 3],
  ['Cameron DeBoer', 3],
  ['Jack Foote', 1],
  ['Eric Gagliardi', 2],
  ['Kyle Geraghty', 4],
  ['Daniel Jackson', 1],
  ['Jeremy Jennison', 5],
  ['Randy Killburn', 2],
  ['Steve Lobodzinski', 1],
  ['Steve Mati', 2],
  ['Ash Moore', 4],
  ['Matt Morden', 2],
  ['Aidan Murphy', 4],
  ['Troy Murphy', 2],
  ['Jared Myatte', 1],
  ['Blake Neufeld', 1],
  ['John Pilon', 2],
  ['Torey Robinson', 3],
  ['Kelly Schuh', 4],
  ['Casey Simon', 2],
] as const;

const HLHL_WINTER_2026_GOALIE = [
  ['Cody Bolman', { games_played: 8, wins: 4, losses: 4 }],
  ['Aaron Buehler', { games_played: 11, wins: 5, losses: 5 }],
  ['Shawn Fucile', { games_played: 1, wins: 0, losses: 1 }],
  ['Connor Geraghty', { games_played: 7, wins: 3, losses: 3 }],
  ['JC Keenleyside-Richter', { games_played: 1, wins: 0, losses: 1 }],
  ['Erik Leipala', { games_played: 4, wins: 2, losses: 2 }],
  ['Leaf Lunnen', { games_played: 1, wins: 0, losses: 0 }],
  ['Vince Mitalas', { games_played: 1, wins: 1, losses: 0 }],
  ['Steven Wild', { games_played: 10, wins: 5, losses: 4 }],
] as const;

function normalizePlayerName(name?: string | null) {
  return name?.trim().toLowerCase() ?? '';
}

const skaterGpOverrides = new Map(
  HLHL_WINTER_2026_SKATER_GP.map(([name, gamesPlayed]) => [normalizePlayerName(name), gamesPlayed]),
);

const goalieOverrides = new Map(
  HLHL_WINTER_2026_GOALIE.map(([name, value]) => [normalizePlayerName(name), value]),
);

export function isImportedAggregateSeasonId(seasonId?: string | null) {
  return seasonId === HLHL_WINTER_2026_SEASON_ID;
}

export function isAggregateOnlySeasonView(seasonId?: string | null, seasonName?: string | null) {
  return isImportedAggregateSeasonId(seasonId) || isHistoricalCareerBaselineSeasonName(seasonName);
}

export function getImportedAggregateSkaterGamesPlayed(seasonId: string | null | undefined, playerName?: string | null) {
  if (!isImportedAggregateSeasonId(seasonId)) {
    return null;
  }

  return skaterGpOverrides.get(normalizePlayerName(playerName)) ?? null;
}

export function getImportedAggregateGoalieOverride(seasonId: string | null | undefined, playerName?: string | null) {
  if (!isImportedAggregateSeasonId(seasonId)) {
    return null;
  }

  return goalieOverrides.get(normalizePlayerName(playerName)) ?? null;
}

export function applyImportedAggregateSkaterOverride(
  row: UnifiedSkaterStatsRow,
  seasonId?: string | null,
): UnifiedSkaterStatsRow {
  const gamesPlayed = getImportedAggregateSkaterGamesPlayed(seasonId, row.player_name);
  if (!gamesPlayed || gamesPlayed === row.games_played) {
    return row;
  }

  return {
    ...row,
    games_played: gamesPlayed,
    points_per_game: gamesPlayed > 0 ? Number((row.points / gamesPlayed).toFixed(2)) : 0,
    goals_per_game: gamesPlayed > 0 ? Number((row.goals / gamesPlayed).toFixed(2)) : 0,
    assists_per_game: gamesPlayed > 0 ? Number((row.assists / gamesPlayed).toFixed(2)) : 0,
    shots_per_game: gamesPlayed > 0 ? Number((row.shots / gamesPlayed).toFixed(2)) : 0,
  };
}

export function applyImportedAggregateGoalieOverride(
  row: UnifiedGoalieStatsRow,
  seasonId?: string | null,
): UnifiedGoalieStatsRow {
  const override = getImportedAggregateGoalieOverride(seasonId, row.player_name);
  if (!override) {
    return row;
  }

  return {
    ...row,
    games_played: override.games_played,
    wins: override.wins,
    losses: override.losses,
    goals_against_average:
      override.games_played > 0 && row.goals_against != null
        ? Number((row.goals_against / override.games_played).toFixed(2))
        : row.goals_against_average,
  };
}
