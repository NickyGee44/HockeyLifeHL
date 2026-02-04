/**
 * Platform 2 (League Sites) Type Definitions
 *
 * Types for public-facing league website data
 */

export interface League {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: 'draft' | 'active' | 'archived';
  organization_id: string;
  created_at: string;
}

export interface LeagueTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  bannerUrl: string | null;
}

export interface Season {
  id: string;
  name: string;
  league_id: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  is_current: boolean;
}

export interface Division {
  id: string;
  name: string;
  season_id: string;
  league_id: string;
  sort_order: number;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  colors: string | null;
  logo: string | null;
  league_id: string;
  division_id: string | null;
  created_at: string;
  // Joined data
  division?: Division;
}

export interface TeamStanding {
  team_id: string;
  team_name: string;
  team_logo: string | null;
  division_id: string | null;
  division_name: string | null;
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  overtime_losses: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_differential: number;
  streak: string | null;
  last_10: string | null;
}

export interface Game {
  id: string;
  league_id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled';
  period: number | null;
  period_time: string | null;
  created_at: string;
  // Joined data
  home_team?: Team;
  away_team?: Team;
}

export interface Player {
  id: string;
  profile_id: string;
  team_id: string;
  jersey_number: string | null;
  position: 'C' | 'LW' | 'RW' | 'D' | 'G' | null;
  is_captain: boolean;
  is_alternate: boolean;
  // Joined data
  profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export interface PlayerStats {
  player_id: string;
  player_name: string;
  team_name: string;
  team_id: string;
  position: string | null;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  penalty_minutes: number;
  plus_minus: number;
  // Goalie stats
  wins?: number;
  losses?: number;
  saves?: number;
  goals_against?: number;
  save_percentage?: number;
  goals_against_average?: number;
}

export interface LeagueStats {
  totalTeams: number;
  totalPlayers: number;
  totalGames: number;
  gamesPlayed: number;
  upcomingGames: number;
}

export interface UpcomingGame extends Game {
  home_team: Team;
  away_team: Team;
}

export interface RecentGame extends Game {
  home_team: Team;
  away_team: Team;
}

/**
 * WeekPickerDay - Day data for schedule week navigation
 */
export interface WeekPickerDay {
  date: string; // ISO date string (YYYY-MM-DD)
  dayName: string; // "Mon", "Tue", etc.
  dayNumber: number; // 1-31
  gameCount: number;
}

/**
 * TickerGame - Game data for the score ticker component
 * Includes team info with division data for display
 */
export interface TickerGame {
  id: string;
  scheduled_at: string;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled';
  home_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    colors: string | null;
    division_id: string | null;
    divisions: { name: string } | null;
  } | null;
  away_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    colors: string | null;
    division_id: string | null;
    divisions: { name: string } | null;
  } | null;
}

/**
 * ScheduleGame - Game data for the schedule table
 * Includes team and division info for display
 */
export interface ScheduleGame {
  id: string;
  league_id: string;
  season_id: string;
  scheduled_at: string;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled';
  game_type?: string | null;
  division_id?: string | null;
  home_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    colors: string | null;
  } | null;
  away_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    colors: string | null;
  } | null;
  division?: {
    id: string;
    name: string;
  } | null;
}

/**
 * TeamWithStats - Team with division data for game preview
 */
export interface TeamWithStats {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  colors: string | null;
  division?: {
    id: string;
    name: string;
  } | null;
}

/**
 * GamePreview - Full game data for preview page
 */
export interface GamePreview {
  id: string;
  league_id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled';
  period: number | null;
  period_time: string | null;
  created_at: string;
  home_team: TeamWithStats;
  away_team: TeamWithStats;
}

/**
 * SeasonSeriesGame - Game result for season series history
 */
export interface SeasonSeriesGame {
  id: string;
  scheduled_at: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team_id: string;
  away_team_id: string;
}

/**
 * TeamSeasonStats - Calculated team stats for a season
 */
export interface TeamSeasonStats {
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  overtime_losses: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goals_per_game: number;
  goals_against_per_game: number;
  power_play_pct: number | null;
  penalty_kill_pct: number | null;
}

/**
 * PlayerStat - Player stat leader for comparison
 */
export interface PlayerStat {
  player_id: string;
  player_name: string;
  jersey_number: string | null;
  position: string | null;
  avatar_url?: string | null;
  team_id?: string;
  value: number;
  stat_type?: 'points' | 'goals' | 'assists';
}

// =============================================================================
// BMHL Template Types - Additional
// =============================================================================

/**
 * TickerTeam - Team data for score ticker
 */
export interface TickerTeam {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  colors: string | null;
  division_id: string | null;
  divisions: { name: string } | null;
}

/**
 * Schedule Filters
 */
export interface ScheduleFilterState {
  season?: string;
  division?: string;
  type?: 'regular' | 'playoffs' | 'exhibition';
}

/**
 * Season Series
 */
export interface SeasonSeries {
  games: SeasonSeriesGame[];
  teamAWins: number;
  teamBWins: number;
  ties: number;
}

/**
 * Goalie Stats
 */
export interface GoalieStats {
  player_id: string;
  player_name: string;
  jersey_number: string | null;
  team_id: string;
  games_played: number;
  wins: number;
  losses: number;
  save_percentage: number;
  goals_against_average: number;
  shutouts: number;
}
