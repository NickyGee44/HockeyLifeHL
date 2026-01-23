export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      articles: {
        Row: {
          content: string
          created_at: string | null
          game_id: string | null
          id: string
          published: boolean | null
          published_at: string | null
          season_id: string | null
          title: string
          type: Database["public"]["Enums"]["article_type"]
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          season_id?: string | null
          title: string
          type: Database["public"]["Enums"]["article_type"]
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          game_id?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          season_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["article_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      draft_order: {
        Row: {
          created_at: string | null
          draft_id: string
          id: string
          pick_position: number
          team_id: string
        }
        Insert: {
          created_at?: string | null
          draft_id: string
          id?: string
          pick_position: number
          team_id: string
        }
        Update: {
          created_at?: string | null
          draft_id?: string
          id?: string
          pick_position?: number
          team_id?: string
        }
        Relationships: []
      }
      draft_picks: {
        Row: {
          created_at: string | null
          draft_id: string
          id: string
          pick_number: number
          player_id: string
          round: number
          team_id: string
        }
        Insert: {
          created_at?: string | null
          draft_id: string
          id?: string
          pick_number: number
          player_id: string
          round: number
          team_id: string
        }
        Update: {
          created_at?: string | null
          draft_id?: string
          id?: string
          pick_number?: number
          player_id?: string
          round?: number
          team_id?: string
        }
        Relationships: []
      }
      drafts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_pick: number | null
          cycle_number: number
          draft_link: string | null
          draft_order_assigned: boolean | null
          id: string
          season_id: string
          status: Database["public"]["Enums"]["draft_status"] | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_pick?: number | null
          cycle_number: number
          draft_link?: string | null
          draft_order_assigned?: boolean | null
          id?: string
          season_id: string
          status?: Database["public"]["Enums"]["draft_status"] | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_pick?: number | null
          cycle_number?: number
          draft_link?: string | null
          draft_order_assigned?: boolean | null
          id?: string
          season_id?: string
          status?: Database["public"]["Enums"]["draft_status"] | null
        }
        Relationships: []
      }
      games: {
        Row: {
          away_captain_verified: boolean | null
          away_score: number | null
          away_subs_requested: boolean | null
          away_subs_requested_at: string | null
          away_team_id: string
          away_verified_by_owner: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          home_captain_verified: boolean | null
          home_score: number | null
          home_subs_requested: boolean | null
          home_subs_requested_at: string | null
          home_team_id: string
          home_verified_by_owner: boolean | null
          id: string
          location: string | null
          original_scheduled_at: string | null
          scheduled_at: string
          season_id: string
          stats_submitted_at: string | null
          stats_submitted_by: string | null
          status: Database["public"]["Enums"]["game_status"] | null
          updated_at: string | null
        }
        Insert: {
          away_captain_verified?: boolean | null
          away_score?: number | null
          away_subs_requested?: boolean | null
          away_subs_requested_at?: string | null
          away_team_id: string
          away_verified_by_owner?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          home_captain_verified?: boolean | null
          home_score?: number | null
          home_subs_requested?: boolean | null
          home_subs_requested_at?: string | null
          home_team_id: string
          home_verified_by_owner?: boolean | null
          id?: string
          location?: string | null
          original_scheduled_at?: string | null
          scheduled_at: string
          season_id: string
          stats_submitted_at?: string | null
          stats_submitted_by?: string | null
          status?: Database["public"]["Enums"]["game_status"] | null
          updated_at?: string | null
        }
        Update: {
          away_captain_verified?: boolean | null
          away_score?: number | null
          away_subs_requested?: boolean | null
          away_subs_requested_at?: string | null
          away_team_id?: string
          away_verified_by_owner?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          home_captain_verified?: boolean | null
          home_score?: number | null
          home_subs_requested?: boolean | null
          home_subs_requested_at?: string | null
          home_team_id?: string
          home_verified_by_owner?: boolean | null
          id?: string
          location?: string | null
          original_scheduled_at?: string | null
          scheduled_at?: string
          season_id?: string
          stats_submitted_at?: string | null
          stats_submitted_by?: string | null
          status?: Database["public"]["Enums"]["game_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      goalie_stats: {
        Row: {
          created_at: string | null
          game_id: string
          goals_against: number | null
          id: string
          player_id: string
          saves: number | null
          season_id: string
          shutout: boolean | null
          team_id: string
        }
        Insert: {
          created_at?: string | null
          game_id: string
          goals_against?: number | null
          id?: string
          player_id: string
          saves?: number | null
          season_id: string
          shutout?: boolean | null
          team_id: string
        }
        Update: {
          created_at?: string | null
          game_id?: string
          goals_against?: number | null
          id?: string
          player_id?: string
          saves?: number | null
          season_id?: string
          shutout?: boolean | null
          team_id?: string
        }
        Relationships: []
      }
      legacy_players: {
        Row: {
          assists: number | null
          created_at: string | null
          first_name: string
          full_name: string | null
          games_played: number | null
          goals: number | null
          goals_against: number | null
          goals_against_average: number | null
          id: string
          imported_from: string | null
          is_goalie: boolean | null
          last_name: string
          matched_at: string | null
          matched_to_profile_id: string | null
          moosehead_cup_wins: number | null
          points: number | null
          points_per_game: number | null
          save_percentage: number | null
          saves: number | null
          shutouts: number | null
          ties: number | null
          updated_at: string | null
          win_percentage: number | null
          wins: number | null
        }
        Insert: {
          assists?: number | null
          created_at?: string | null
          first_name: string
          full_name?: string | null
          games_played?: number | null
          goals?: number | null
          goals_against?: number | null
          goals_against_average?: number | null
          id?: string
          imported_from?: string | null
          is_goalie?: boolean | null
          last_name: string
          matched_at?: string | null
          matched_to_profile_id?: string | null
          moosehead_cup_wins?: number | null
          points?: number | null
          points_per_game?: number | null
          save_percentage?: number | null
          saves?: number | null
          shutouts?: number | null
          ties?: number | null
          updated_at?: string | null
          win_percentage?: number | null
          wins?: number | null
        }
        Update: {
          assists?: number | null
          created_at?: string | null
          first_name?: string
          full_name?: string | null
          games_played?: number | null
          goals?: number | null
          goals_against?: number | null
          goals_against_average?: number | null
          id?: string
          imported_from?: string | null
          is_goalie?: boolean | null
          last_name?: string
          matched_at?: string | null
          matched_to_profile_id?: string | null
          moosehead_cup_wins?: number | null
          points?: number | null
          points_per_game?: number | null
          save_percentage?: number | null
          saves?: number | null
          shutouts?: number | null
          ties?: number | null
          updated_at?: string | null
          win_percentage?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      player_approvals: {
        Row: {
          approval_method: string | null
          approved_at: string | null
          approved_by: string | null
          id: string
          notes: string | null
          player_id: string
        }
        Insert: {
          approval_method?: string | null
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          notes?: string | null
          player_id: string
        }
        Update: {
          approval_method?: string | null
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          notes?: string | null
          player_id?: string
        }
        Relationships: []
      }
      player_availability: {
        Row: {
          checked_in_at: string | null
          created_at: string | null
          game_id: string
          id: string
          player_id: string
          reason: string | null
          season_id: string
          status: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string | null
          game_id: string
          id?: string
          player_id: string
          reason?: string | null
          season_id: string
          status?: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string | null
          game_id?: string
          id?: string
          player_id?: string
          reason?: string | null
          season_id?: string
          status?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      player_ratings: {
        Row: {
          attendance_rate: number | null
          calculated_at: string | null
          games_played: number | null
          id: string
          player_id: string
          points_per_game: number | null
          rating: Database["public"]["Enums"]["player_rating"]
          season_id: string
        }
        Insert: {
          attendance_rate?: number | null
          calculated_at?: string | null
          games_played?: number | null
          id?: string
          player_id: string
          points_per_game?: number | null
          rating: Database["public"]["Enums"]["player_rating"]
          season_id: string
        }
        Update: {
          attendance_rate?: number | null
          calculated_at?: string | null
          games_played?: number | null
          id?: string
          player_id?: string
          points_per_game?: number | null
          rating?: Database["public"]["Enums"]["player_rating"]
          season_id?: string
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          assists: number | null
          created_at: string | null
          game_id: string
          goals: number | null
          id: string
          player_id: string
          season_id: string
          team_id: string
        }
        Insert: {
          assists?: number | null
          created_at?: string | null
          game_id: string
          goals?: number | null
          id?: string
          player_id: string
          season_id: string
          team_id: string
        }
        Update: {
          assists?: number | null
          created_at?: string | null
          game_id?: string
          goals?: number | null
          id?: string
          player_id?: string
          season_id?: string
          team_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          jersey_number: number | null
          position: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          shot_hand: "left" | "right" | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          jersey_number?: number | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          shot_hand?: "left" | "right" | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          jersey_number?: number | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          shot_hand?: "left" | "right" | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          entered_by: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          player_id: string
          season_id: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          entered_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          player_id: string
          season_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          entered_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          player_id?: string
          season_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      season_opt_ins: {
        Row: {
          id: string
          opt_in_type: Database["public"]["Enums"]["opt_in_type"]
          opted_in_at: string | null
          player_id: string
          season_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          opt_in_type?: Database["public"]["Enums"]["opt_in_type"]
          opted_in_at?: string | null
          player_id: string
          season_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          opt_in_type?: Database["public"]["Enums"]["opt_in_type"]
          opted_in_at?: string | null
          player_id?: string
          season_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string | null
          current_game_count: number | null
          default_location: string | null
          draft_scheduled_at: string | null
          end_date: string | null
          game_days: Json | null
          game_times: Json | null
          games_per_cycle: number | null
          id: string
          name: string
          playoff_format: string | null
          schedule_generated: boolean | null
          start_date: string
          status: Database["public"]["Enums"]["season_status"] | null
          total_games: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_game_count?: number | null
          default_location?: string | null
          draft_scheduled_at?: string | null
          end_date?: string | null
          game_days?: Json | null
          game_times?: Json | null
          games_per_cycle?: number | null
          id?: string
          name: string
          playoff_format?: string | null
          schedule_generated?: boolean | null
          start_date: string
          status?: Database["public"]["Enums"]["season_status"] | null
          total_games?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_game_count?: number | null
          default_location?: string | null
          draft_scheduled_at?: string | null
          end_date?: string | null
          game_days?: Json | null
          game_times?: Json | null
          games_per_cycle?: number | null
          id?: string
          name?: string
          playoff_format?: string | null
          schedule_generated?: boolean | null
          start_date?: string
          status?: Database["public"]["Enums"]["season_status"] | null
          total_games?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      suspensions: {
        Row: {
          created_at: string | null
          end_date: string | null
          games_remaining: number
          id: string
          issued_by: string
          player_id: string
          reason: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          games_remaining: number
          id?: string
          issued_by: string
          player_id: string
          reason: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          games_remaining?: number
          id?: string
          issued_by?: string
          player_id?: string
          reason?: string
          start_date?: string
        }
        Relationships: []
      }
      team_messages: {
        Row: {
          created_at: string | null
          id: string
          is_urgent: boolean | null
          message: string
          message_type: string
          season_id: string
          sent_by: string
          subject: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          message: string
          message_type?: string
          season_id: string
          sent_by: string
          subject: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          message?: string
          message_type?: string
          season_id?: string
          sent_by?: string
          subject?: string
          team_id?: string
        }
        Relationships: []
      }
      team_rosters: {
        Row: {
          id: string
          is_goalie: boolean | null
          joined_at: string | null
          player_id: string
          season_id: string
          team_id: string
        }
        Insert: {
          id?: string
          is_goalie?: boolean | null
          joined_at?: string | null
          player_id: string
          season_id: string
          team_id: string
        }
        Update: {
          id?: string
          is_goalie?: boolean | null
          joined_at?: string | null
          player_id?: string
          season_id?: string
          team_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          captain_id: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          short_name: string
          updated_at: string | null
        }
        Insert: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name: string
          updated_at?: string | null
        }
        Update: {
          captain_id?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_legacy_player_to_profile: {
        Args: { legacy_player_id: string; profile_id: string }
        Returns: undefined
      }
      refresh_season_stats: { Args: Record<string, never>; Returns: undefined }
    }
    Enums: {
      article_type:
        | "game_recap"
        | "weekly_wrap"
        | "draft_grades"
        | "announcement"
      draft_status: "pending" | "in_progress" | "completed"
      game_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      opt_in_type: "full_time" | "call_up"
      player_rating:
        | "A+"
        | "A"
        | "A-"
        | "B+"
        | "B"
        | "B-"
        | "C+"
        | "C"
        | "C-"
        | "D+"
        | "D"
        | "D-"
      season_status: "active" | "playoffs" | "completed" | "draft" | "archived"
      user_role: "owner" | "captain" | "player"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type exports for convenience
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

// Convenience type aliases
export type Profile = Tables<"profiles">
export type Team = Tables<"teams">
export type Season = Tables<"seasons">
export type Game = Tables<"games">
export type Draft = Tables<"drafts">
export type DraftPick = Tables<"draft_picks">
export type DraftOrder = Tables<"draft_order">
export type PlayerStats = Tables<"player_stats">
export type GoalieStats = Tables<"goalie_stats">
export type TeamRoster = Tables<"team_rosters">
export type PlayerRating = Tables<"player_ratings">
export type Article = Tables<"articles">
export type Suspension = Tables<"suspensions">
export type SeasonOptIn = Tables<"season_opt_ins">
export type LegacyPlayer = Tables<"legacy_players">
export type PlayerApproval = Tables<"player_approvals">
export type PlayerAvailability = Tables<"player_availability">
export type Payment = Tables<"payments">
export type TeamMessage = Tables<"team_messages">

// Enum type aliases
export type UserRole = Enums<"user_role">
export type SeasonStatus = Enums<"season_status">
export type GameStatus = Enums<"game_status">
export type DraftStatus = Enums<"draft_status">
export type ArticleType = Enums<"article_type">
export type OptInType = Enums<"opt_in_type">
export type PlayerRatingValue = Enums<"player_rating">
