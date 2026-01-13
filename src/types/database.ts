// Database types for Supabase
// This file will be auto-generated from Supabase schema later
// For now, we define the expected structure

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'owner' | 'captain' | 'player'
export type PlayerRating = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-'
export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type SeasonStatus = 'active' | 'playoffs' | 'completed' | 'draft'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          jersey_number: number | null
          position: string | null
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          jersey_number?: number | null
          position?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          jersey_number?: number | null
          position?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          short_name: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          captain_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          short_name: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          captain_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          short_name?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          captain_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      seasons: {
        Row: {
          id: string
          name: string
          status: SeasonStatus
          start_date: string
          end_date: string | null
          games_per_cycle: number
          current_game_count: number
          total_games: number | null
          playoff_format: string | null
          draft_scheduled_at: string | null
          schedule_generated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: SeasonStatus
          start_date: string
          end_date?: string | null
          games_per_cycle?: number
          current_game_count?: number
          total_games?: number | null
          playoff_format?: string | null
          draft_scheduled_at?: string | null
          schedule_generated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: SeasonStatus
          start_date?: string
          end_date?: string | null
          games_per_cycle?: number
          current_game_count?: number
          total_games?: number | null
          playoff_format?: string | null
          draft_scheduled_at?: string | null
          schedule_generated?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          season_id: string
          home_team_id: string
          away_team_id: string
          home_score: number
          away_score: number
          status: GameStatus
          scheduled_at: string
          location: string | null
          home_captain_verified: boolean
          away_captain_verified: boolean
          cancelled_at: string | null
          cancellation_reason: string | null
          rescheduled_at: string | null
          original_scheduled_at: string | null
          is_rescheduled: boolean
          home_verified_by_owner: boolean
          away_verified_by_owner: boolean
          home_verified_at: string | null
          away_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id: string
          home_team_id: string
          away_team_id: string
          home_score?: number
          away_score?: number
          status?: GameStatus
          scheduled_at: string
          location?: string | null
          home_captain_verified?: boolean
          away_captain_verified?: boolean
          cancelled_at?: string | null
          cancellation_reason?: string | null
          rescheduled_at?: string | null
          original_scheduled_at?: string | null
          is_rescheduled?: boolean
          home_verified_by_owner?: boolean
          away_verified_by_owner?: boolean
          home_verified_at?: string | null
          away_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          home_team_id?: string
          away_team_id?: string
          home_score?: number
          away_score?: number
          status?: GameStatus
          scheduled_at?: string
          location?: string | null
          home_captain_verified?: boolean
          away_captain_verified?: boolean
          cancelled_at?: string | null
          cancellation_reason?: string | null
          rescheduled_at?: string | null
          original_scheduled_at?: string | null
          is_rescheduled?: boolean
          home_verified_by_owner?: boolean
          away_verified_by_owner?: boolean
          home_verified_at?: string | null
          away_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      player_stats: {
        Row: {
          id: string
          game_id: string
          player_id: string
          team_id: string
          goals: number
          assists: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          team_id: string
          goals?: number
          assists?: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          team_id?: string
          goals?: number
          assists?: number
          created_at?: string
        }
      }
      goalie_stats: {
        Row: {
          id: string
          game_id: string
          player_id: string
          team_id: string
          goals_against: number
          saves: number
          shutout: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          team_id: string
          goals_against?: number
          saves?: number
          shutout?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string
          team_id?: string
          goals_against?: number
          saves?: number
          shutout?: boolean
          created_at?: string
        }
      }
      team_rosters: {
        Row: {
          id: string
          team_id: string
          player_id: string
          season_id: string
          is_goalie: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          player_id: string
          season_id: string
          is_goalie?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          player_id?: string
          season_id?: string
          is_goalie?: boolean
          joined_at?: string
        }
      }
      suspensions: {
        Row: {
          id: string
          player_id: string
          reason: string
          games_remaining: number
          start_date: string
          end_date: string | null
          issued_by: string
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          reason: string
          games_remaining: number
          start_date: string
          end_date?: string | null
          issued_by: string
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          reason?: string
          games_remaining?: number
          start_date?: string
          end_date?: string | null
          issued_by?: string
          created_at?: string
        }
      }
      articles: {
        Row: {
          id: string
          title: string
          content: string
          type: 'game_recap' | 'weekly_wrap' | 'draft_grades' | 'announcement'
          game_id: string | null
          season_id: string | null
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          type: 'game_recap' | 'weekly_wrap' | 'draft_grades' | 'announcement'
          game_id?: string | null
          season_id?: string | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          type?: 'game_recap' | 'weekly_wrap' | 'draft_grades' | 'announcement'
          game_id?: string | null
          season_id?: string | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      drafts: {
        Row: {
          id: string
          season_id: string
          cycle_number: number
          status: 'pending' | 'in_progress' | 'completed'
          current_pick: number
          draft_link: string | null
          draft_order_assigned: boolean
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          season_id: string
          cycle_number: number
          status?: 'pending' | 'in_progress' | 'completed'
          current_pick?: number
          draft_link?: string | null
          draft_order_assigned?: boolean
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          season_id?: string
          cycle_number?: number
          status?: 'pending' | 'in_progress' | 'completed'
          current_pick?: number
          draft_link?: string | null
          draft_order_assigned?: boolean
          created_at?: string
          completed_at?: string | null
        }
      }
      draft_order: {
        Row: {
          id: string
          draft_id: string
          team_id: string
          pick_position: number
          created_at: string
        }
        Insert: {
          id?: string
          draft_id: string
          team_id: string
          pick_position: number
          created_at?: string
        }
        Update: {
          id?: string
          draft_id?: string
          team_id?: string
          pick_position?: number
          created_at?: string
        }
      }
      draft_picks: {
        Row: {
          id: string
          draft_id: string
          team_id: string
          player_id: string
          pick_number: number
          round: number
          created_at: string
        }
        Insert: {
          id?: string
          draft_id: string
          team_id: string
          player_id: string
          pick_number: number
          round: number
          created_at?: string
        }
        Update: {
          id?: string
          draft_id?: string
          team_id?: string
          player_id?: string
          pick_number?: number
          round?: number
          created_at?: string
        }
      }
      player_ratings: {
        Row: {
          id: string
          player_id: string
          season_id: string
          rating: PlayerRating
          games_played: number
          attendance_rate: number
          points_per_game: number
          calculated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          season_id: string
          rating: PlayerRating
          games_played?: number
          attendance_rate?: number
          points_per_game?: number
          calculated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          season_id?: string
          rating?: PlayerRating
          games_played?: number
          attendance_rate?: number
          points_per_game?: number
          calculated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      player_rating: PlayerRating
      game_status: GameStatus
      season_status: SeasonStatus
    }
  }
}

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Season = Database['public']['Tables']['seasons']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type PlayerStats = Database['public']['Tables']['player_stats']['Row']
export type GoalieStats = Database['public']['Tables']['goalie_stats']['Row']
export type TeamRoster = Database['public']['Tables']['team_rosters']['Row']
export type Suspension = Database['public']['Tables']['suspensions']['Row']
export type Article = Database['public']['Tables']['articles']['Row']
export type Draft = Database['public']['Tables']['drafts']['Row']
export type DraftPick = Database['public']['Tables']['draft_picks']['Row']
export type PlayerRatingRecord = Database['public']['Tables']['player_ratings']['Row']
