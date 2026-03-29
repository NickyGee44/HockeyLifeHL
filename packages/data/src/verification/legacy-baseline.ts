const LEGACY_TEAM_LABEL = 'Legacy baseline';
const LEGACY_PLAYER_PREFIX = 'legacy:';

export interface BaselineSkaterCareerRow {
  baseline_player_id: string;
  profile_id: string | null;
  player_name: string;
  games_played: number;
  goals: number;
  assists: number;
  points?: number | null;
}

export interface NativeSkaterSeasonRow {
  player_id: string;
  player_name: string;
  season_id: string;
  team_id: string;
  team_name: string;
  position: string | null;
  is_goalie?: boolean;
  games_played: number;
  goals: number;
  assists: number;
  points?: number | null;
  penalty_minutes?: number | null;
  plus_minus?: number | null;
}

export interface VerifiedSkaterCareerLine {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  position: string | null;
  games_played: number;
  baseline_games_played: number;
  native_games_played: number;
  goals: number;
  assists: number;
  points: number;
  penalty_minutes: number;
  plus_minus: number;
}

export interface BaselineGoalieCareerRow {
  baseline_player_id: string;
  profile_id: string | null;
  player_name: string;
  games_played: number;
  wins: number;
  ties?: number | null;
  saves?: number | null;
  goals_against: number;
  shutouts: number;
  save_percentage?: number | null;
  goals_against_average?: number | null;
  can_recompute_save_percentage?: boolean;
}

export interface NativeGoalieSeasonRow {
  player_id: string;
  player_name: string;
  season_id: string;
  team_id: string;
  team_name: string;
  position?: string | null;
  games_played: number;
  wins: number;
  losses: number;
  ties?: number | null;
  saves: number;
  goals_against: number;
  shutouts: number;
}

export interface VerifiedGoalieCareerLine {
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  position: string;
  games_played: number;
  baseline_games_played: number;
  native_games_played: number;
  wins: number;
  losses: number;
  ties: number;
  saves: number;
  goals_against: number;
  shutouts: number;
  save_percentage: number | null;
  goals_against_average: number | null;
}

export interface LegacyBaselineArtifactSummary {
  counts?: {
    total_rows?: number;
    skaters?: number;
    goalies?: number;
    matched_profiles?: number;
    unmatched_profiles?: number;
  };
  repo_expected_counts?: {
    total_rows?: number;
    skaters?: number;
    goalies?: number;
  };
}

export interface AcceptanceCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface LegacyBaselineFixture {
  baselineSkaters: BaselineSkaterCareerRow[];
  nativeSkaters: NativeSkaterSeasonRow[];
  baselineGoalies: BaselineGoalieCareerRow[];
  nativeGoalies: NativeGoalieSeasonRow[];
  targetSeasonId: string;
}

function toPoints(goals: number, assists: number, points?: number | null): number {
  return typeof points === 'number' ? points : goals + assists;
}

function isGoaliePosition(position: string | null | undefined): boolean {
  if (!position) {
    return false;
  }

  const normalized = position.trim().toLowerCase();
  return normalized === 'g' || normalized === 'goalie';
}

function baselinePlayerKey(baselinePlayerId: string, profileId: string | null): string {
  return profileId || `${LEGACY_PLAYER_PREFIX}${baselinePlayerId}`;
}

function sortByGamesThenName<T extends { games_played: number; player_name: string }>(left: T, right: T): number {
  return right.games_played - left.games_played || left.player_name.localeCompare(right.player_name);
}

export function mergeAllTimeSkaterStats(input: {
  baselineRows?: BaselineSkaterCareerRow[];
  nativeRows?: NativeSkaterSeasonRow[];
  useBaseline?: boolean;
}): VerifiedSkaterCareerLine[] {
  const baselineRows = input.useBaseline === false ? [] : input.baselineRows || [];
  const nativeRows = input.nativeRows || [];
  const playerMap = new Map<
    string,
    VerifiedSkaterCareerLine & {
      best_team_games: number;
    }
  >();

  for (const row of baselineRows) {
    const key = baselinePlayerKey(row.baseline_player_id, row.profile_id);
    playerMap.set(key, {
      player_id: key,
      player_name: row.player_name,
      team_id: '',
      team_name: LEGACY_TEAM_LABEL,
      position: null,
      games_played: row.games_played,
      baseline_games_played: row.games_played,
      native_games_played: 0,
      goals: row.goals,
      assists: row.assists,
      points: toPoints(row.goals, row.assists, row.points),
      penalty_minutes: 0,
      plus_minus: 0,
      best_team_games: 0,
    });
  }

  for (const row of nativeRows) {
    if (row.is_goalie || isGoaliePosition(row.position)) {
      continue;
    }

    const key = row.player_id;
    const existing = playerMap.get(key) || {
      player_id: key,
      player_name: row.player_name,
      team_id: row.team_id,
      team_name: row.team_name,
      position: row.position,
      games_played: 0,
      baseline_games_played: 0,
      native_games_played: 0,
      goals: 0,
      assists: 0,
      points: 0,
      penalty_minutes: 0,
      plus_minus: 0,
      best_team_games: 0,
    };

    existing.player_name = existing.player_name || row.player_name;
    existing.games_played += row.games_played;
    existing.native_games_played += row.games_played;
    existing.goals += row.goals;
    existing.assists += row.assists;
    existing.points += toPoints(row.goals, row.assists, row.points);
    existing.penalty_minutes += row.penalty_minutes || 0;
    existing.plus_minus += row.plus_minus || 0;

    if (row.games_played >= existing.best_team_games) {
      existing.best_team_games = row.games_played;
      existing.team_id = row.team_id;
      existing.team_name = row.team_name;
      existing.position = row.position;
    }

    playerMap.set(key, existing);
  }

  return Array.from(playerMap.values())
    .map(({ best_team_games: _bestTeamGames, ...row }) => row)
    .sort(sortByGamesThenName);
}

export function getSeasonSpecificSkaterStats(
  nativeRows: NativeSkaterSeasonRow[],
  seasonId: string,
): VerifiedSkaterCareerLine[] {
  return nativeRows
    .filter((row) => row.season_id === seasonId)
    .filter((row) => !row.is_goalie && !isGoaliePosition(row.position))
    .map((row) => ({
      player_id: row.player_id,
      player_name: row.player_name,
      team_id: row.team_id,
      team_name: row.team_name,
      position: row.position,
      games_played: row.games_played,
      baseline_games_played: 0,
      native_games_played: row.games_played,
      goals: row.goals,
      assists: row.assists,
      points: toPoints(row.goals, row.assists, row.points),
      penalty_minutes: row.penalty_minutes || 0,
      plus_minus: row.plus_minus || 0,
    }))
    .sort(sortByGamesThenName);
}

export function mergeAllTimeGoalieStats(input: {
  baselineRows?: BaselineGoalieCareerRow[];
  nativeRows?: NativeGoalieSeasonRow[];
  useBaseline?: boolean;
}): VerifiedGoalieCareerLine[] {
  const baselineRows = input.useBaseline === false ? [] : input.baselineRows || [];
  const nativeRows = input.nativeRows || [];
  const goalieMap = new Map<
    string,
    VerifiedGoalieCareerLine & {
      best_team_games: number;
      save_percentage_mode: 'unset' | 'recomputable' | 'stored-only' | 'non-blendable';
      stored_save_percentage: number | null;
    }
  >();

  for (const row of baselineRows) {
    const key = baselinePlayerKey(row.baseline_player_id, row.profile_id);
    const ties = row.ties || 0;
    const losses = Math.max(row.games_played - row.wins - ties, 0);
    const canRecomputeSavePercentage = Boolean(row.can_recompute_save_percentage);
    const saves = canRecomputeSavePercentage ? row.saves || 0 : 0;

    goalieMap.set(key, {
      player_id: key,
      player_name: row.player_name,
      team_id: '',
      team_name: LEGACY_TEAM_LABEL,
      position: 'G',
      games_played: row.games_played,
      baseline_games_played: row.games_played,
      native_games_played: 0,
      wins: row.wins,
      losses,
      ties,
      saves,
      goals_against: row.goals_against,
      shutouts: row.shutouts,
      save_percentage: null,
      goals_against_average: row.goals_against_average ?? null,
      best_team_games: 0,
      save_percentage_mode: canRecomputeSavePercentage ? 'recomputable' : 'stored-only',
      stored_save_percentage: row.save_percentage ?? null,
    });
  }

  for (const row of nativeRows) {
    const key = row.player_id;
    const existing = goalieMap.get(key) || {
      player_id: key,
      player_name: row.player_name,
      team_id: row.team_id,
      team_name: row.team_name,
      position: 'G',
      games_played: 0,
      baseline_games_played: 0,
      native_games_played: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      saves: 0,
      goals_against: 0,
      shutouts: 0,
      save_percentage: null,
      goals_against_average: null,
      best_team_games: 0,
      save_percentage_mode: 'recomputable' as const,
      stored_save_percentage: null,
    };

    existing.games_played += row.games_played;
    existing.native_games_played += row.games_played;
    existing.wins += row.wins;
    existing.losses += row.losses;
    existing.ties += row.ties || 0;
    existing.saves += row.saves;
    existing.goals_against += row.goals_against;
    existing.shutouts += row.shutouts;

    if (existing.save_percentage_mode === 'stored-only') {
      existing.save_percentage_mode = 'non-blendable';
    }

    if (row.games_played >= existing.best_team_games) {
      existing.best_team_games = row.games_played;
      existing.team_id = row.team_id;
      existing.team_name = row.team_name;
    }

    goalieMap.set(key, existing);
  }

  return Array.from(goalieMap.values())
    .map(({ best_team_games: _bestTeamGames, save_percentage_mode, stored_save_percentage, ...row }) => {
      let savePercentage: number | null = null;

      if (save_percentage_mode === 'stored-only') {
        savePercentage = stored_save_percentage;
      } else if (save_percentage_mode === 'recomputable') {
        const shotsAgainst = row.saves + row.goals_against;
        savePercentage = shotsAgainst > 0 ? row.saves / shotsAgainst : null;
      } else {
        savePercentage = null;
      }

      return {
        ...row,
        save_percentage: savePercentage,
        goals_against_average: row.games_played > 0 ? row.goals_against / row.games_played : null,
      };
    })
    .sort(sortByGamesThenName);
}

export function buildLegacyBaselineAcceptanceFixture(): LegacyBaselineFixture {
  return {
    baselineSkaters: [
      {
        baseline_player_id: 'baseline-skater-1',
        profile_id: 'profile-skater-1',
        player_name: 'Alex Match',
        games_played: 100,
        goals: 60,
        assists: 70,
        points: 130,
      },
      {
        baseline_player_id: 'baseline-skater-2',
        profile_id: null,
        player_name: 'Unclaimed Legacy',
        games_played: 40,
        goals: 18,
        assists: 22,
        points: 40,
      },
    ],
    nativeSkaters: [
      {
        player_id: 'profile-skater-1',
        player_name: 'Alex Match',
        season_id: 'season-2025',
        team_id: 'team-wolves',
        team_name: 'Wolves',
        position: 'C',
        games_played: 10,
        goals: 5,
        assists: 6,
        points: 11,
        penalty_minutes: 4,
        plus_minus: 3,
      },
      {
        player_id: 'profile-skater-1',
        player_name: 'Alex Match',
        season_id: 'season-2026',
        team_id: 'team-wolves',
        team_name: 'Wolves',
        position: 'C',
        games_played: 8,
        goals: 4,
        assists: 3,
        points: 7,
        penalty_minutes: 2,
        plus_minus: 1,
      },
      {
        player_id: 'profile-hybrid',
        player_name: 'Hybrid Goalie',
        season_id: 'season-2025',
        team_id: 'team-goalies',
        team_name: 'Goalies',
        position: 'G',
        is_goalie: true,
        games_played: 3,
        goals: 1,
        assists: 1,
        points: 2,
      },
    ],
    baselineGoalies: [
      {
        baseline_player_id: 'baseline-goalie-1',
        profile_id: 'profile-goalie-1',
        player_name: 'Gina Goalie',
        games_played: 50,
        wins: 30,
        ties: 5,
        saves: 0,
        goals_against: 120,
        shutouts: 4,
        save_percentage: 0.91,
        goals_against_average: 2.4,
        can_recompute_save_percentage: false,
      },
    ],
    nativeGoalies: [
      {
        player_id: 'profile-goalie-1',
        player_name: 'Gina Goalie',
        season_id: 'season-2026',
        team_id: 'team-ice',
        team_name: 'Ice',
        games_played: 4,
        wins: 2,
        losses: 1,
        ties: 1,
        saves: 120,
        goals_against: 10,
        shutouts: 1,
      },
      {
        player_id: 'profile-hybrid',
        player_name: 'Hybrid Goalie',
        season_id: 'season-2025',
        team_id: 'team-goalies',
        team_name: 'Goalies',
        games_played: 3,
        wins: 1,
        losses: 2,
        saves: 90,
        goals_against: 12,
        shutouts: 0,
      },
    ],
    targetSeasonId: 'season-2025',
  };
}

export function verifyLegacyArtifactSummary(
  summary: LegacyBaselineArtifactSummary,
): AcceptanceCheck[] {
  const counts = summary.counts || {};
  const expected = summary.repo_expected_counts || {};

  return [
    {
      name: 'artifact total row count matches repo expectation',
      passed:
        typeof counts.total_rows === 'number' &&
        typeof expected.total_rows === 'number' &&
        counts.total_rows === expected.total_rows,
      detail: `artifact=${counts.total_rows ?? 'n/a'} expected=${expected.total_rows ?? 'n/a'}`,
    },
    {
      name: 'artifact skater count matches repo expectation',
      passed:
        typeof counts.skaters === 'number' &&
        typeof expected.skaters === 'number' &&
        counts.skaters === expected.skaters,
      detail: `artifact=${counts.skaters ?? 'n/a'} expected=${expected.skaters ?? 'n/a'}`,
    },
    {
      name: 'artifact goalie count matches repo expectation',
      passed:
        typeof counts.goalies === 'number' &&
        typeof expected.goalies === 'number' &&
        counts.goalies === expected.goalies,
      detail: `artifact=${counts.goalies ?? 'n/a'} expected=${expected.goalies ?? 'n/a'}`,
    },
    {
      name: 'artifact shows all legacy rows matched to profiles',
      passed:
        typeof counts.total_rows === 'number' &&
        typeof counts.matched_profiles === 'number' &&
        counts.matched_profiles === counts.total_rows,
      detail: `matched=${counts.matched_profiles ?? 'n/a'} total=${counts.total_rows ?? 'n/a'}`,
    },
  ];
}

export function runLegacyBaselineAcceptanceChecks(
  fixture: LegacyBaselineFixture = buildLegacyBaselineAcceptanceFixture(),
): AcceptanceCheck[] {
  const allTimeSkaters = mergeAllTimeSkaterStats({
    baselineRows: fixture.baselineSkaters,
    nativeRows: fixture.nativeSkaters,
    useBaseline: true,
  });
  const nativeOnlySkaters = mergeAllTimeSkaterStats({
    baselineRows: fixture.baselineSkaters,
    nativeRows: fixture.nativeSkaters,
    useBaseline: false,
  });
  const seasonSpecificSkaters = getSeasonSpecificSkaterStats(
    fixture.nativeSkaters,
    fixture.targetSeasonId,
  );
  const allTimeGoalies = mergeAllTimeGoalieStats({
    baselineRows: fixture.baselineGoalies,
    nativeRows: fixture.nativeGoalies,
    useBaseline: true,
  });
  const emptySkaters = mergeAllTimeSkaterStats({ baselineRows: [], nativeRows: [] });
  const emptyGoalies = mergeAllTimeGoalieStats({ baselineRows: [], nativeRows: [] });

  const matchedSkater = allTimeSkaters.find((row) => row.player_id === 'profile-skater-1');
  const unmatchedLegacySkater = allTimeSkaters.find(
    (row) => row.player_id === `${LEGACY_PLAYER_PREFIX}baseline-skater-2`,
  );
  const matchedGoalie = allTimeGoalies.find((row) => row.player_id === 'profile-goalie-1');
  const hybridSkaterLeak = allTimeSkaters.find((row) => row.player_id === 'profile-hybrid');
  const targetSeasonPlayer = seasonSpecificSkaters.find((row) => row.player_id === 'profile-skater-1');
  const nativeOnlyMatchedSkater = nativeOnlySkaters.find((row) => row.player_id === 'profile-skater-1');

  return [
    {
      name: 'matched skater all-time GP uses baseline plus native totals',
      passed:
        matchedSkater?.games_played === 118 &&
        matchedSkater?.baseline_games_played === 100 &&
        matchedSkater?.native_games_played === 18,
      detail: `gp=${matchedSkater?.games_played ?? 'n/a'} baseline=${matchedSkater?.baseline_games_played ?? 'n/a'} native=${matchedSkater?.native_games_played ?? 'n/a'}`,
    },
    {
      name: 'matched skater all-time points are additive across baseline and native rows',
      passed: matchedSkater?.points === 148,
      detail: `points=${matchedSkater?.points ?? 'n/a'}`,
    },
    {
      name: 'season-specific skater stats remain native-only',
      passed:
        targetSeasonPlayer?.games_played === 10 &&
        targetSeasonPlayer?.baseline_games_played === 0 &&
        targetSeasonPlayer?.native_games_played === 10,
      detail: `season_gp=${targetSeasonPlayer?.games_played ?? 'n/a'} baseline=${targetSeasonPlayer?.baseline_games_played ?? 'n/a'}`,
    },
    {
      name: 'unmatched baseline skater is preserved as a standalone identity',
      passed:
        unmatchedLegacySkater?.games_played === 40 &&
        unmatchedLegacySkater?.player_name === 'Unclaimed Legacy',
      detail: `player_id=${unmatchedLegacySkater?.player_id ?? 'missing'}`,
    },
    {
      name: 'goalie rows do not leak into skater all-time aggregation',
      passed: hybridSkaterLeak == null,
      detail: hybridSkaterLeak ? `unexpected player_id=${hybridSkaterLeak.player_id}` : 'no skater leakage',
    },
    {
      name: 'matched goalie all-time GP uses baseline plus native totals',
      passed:
        matchedGoalie?.games_played === 54 &&
        matchedGoalie?.baseline_games_played === 50 &&
        matchedGoalie?.native_games_played === 4,
      detail: `gp=${matchedGoalie?.games_played ?? 'n/a'} baseline=${matchedGoalie?.baseline_games_played ?? 'n/a'} native=${matchedGoalie?.native_games_played ?? 'n/a'}`,
    },
    {
      name: 'goalie save percentage is withheld when baseline shot totals are not blendable',
      passed: matchedGoalie?.save_percentage == null,
      detail: `save_percentage=${matchedGoalie?.save_percentage ?? 'null'}`,
    },
    {
      name: 'non-baseline league path stays native-only',
      passed:
        nativeOnlyMatchedSkater?.games_played === 18 &&
        nativeOnlyMatchedSkater?.baseline_games_played === 0,
      detail: `gp=${nativeOnlyMatchedSkater?.games_played ?? 'n/a'} baseline=${nativeOnlyMatchedSkater?.baseline_games_played ?? 'n/a'}`,
    },
    {
      name: 'empty/non-migrated leagues return empty aggregates',
      passed: emptySkaters.length === 0 && emptyGoalies.length === 0,
      detail: `skaters=${emptySkaters.length} goalies=${emptyGoalies.length}`,
    },
  ];
}
