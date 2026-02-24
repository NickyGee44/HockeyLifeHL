import type { Enums } from '@hockey-life/database/types';

export type PlayerGrade = Enums<'player_rating'>;

export interface PlayerRatingRecord {
  league_id: string;
  season_id: string;
  player_id: string;
  division_id: string | null;
  rating: PlayerGrade;
  games_played: number;
  attendance_rate: number;
  points_per_game: number;
  raw_percentile: number;
  overall_percentile: number;
  position: 'skater' | 'goalie';
  stats_json: Record<string, unknown>;
  calculated_at: string;
}

export interface TeamRatingRecord {
  team_id: string;
  season_id: string;
  league_id: string;
  division_id: string | null;
  overall_grade: PlayerGrade;
  overall_percentile: number;
  offense_rating: number;
  defense_rating: number;
  goaltending_rating: number;
  record_factor: number;
  roster_count: number;
  calculated_at: string;
}

export interface DivisionRecommendation {
  teamId: string;
  teamName: string;
  fromDivisionId: string | null;
  fromDivisionName: string;
  toDivisionId: string | null;
  toDivisionName: string;
  direction: 'move_up' | 'move_down';
  reason: string;
  impact: number;
}

export interface DivisionTeamBalance {
  teamId: string;
  teamName: string;
  overallPercentile: number;
  overallGrade: PlayerGrade;
  zScore: number;
  flag: 'above' | 'below' | null;
}

export interface DivisionBalanceResult {
  leagueId: string;
  seasonId: string;
  balanceScore: number;
  divisions: Array<{
    divisionId: string | null;
    divisionName: string;
    mean: number;
    stdDev: number;
    teams: DivisionTeamBalance[];
  }>;
  recommendations: DivisionRecommendation[];
  calculatedAt: string;
}

export interface RatingCalculationSummary {
  seasonId: string;
  leagueId: string;
  playersProcessed: number;
  playersRated: number;
  teamsRated?: number;
  skippedForMinGames: number;
}
