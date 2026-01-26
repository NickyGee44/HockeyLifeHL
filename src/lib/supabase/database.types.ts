export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      articles: {
        Row: {
          content: string
          created_at: string | null
          game_id: string | null
          id: string
          league_id: string
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
          league_id: string
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
          league_id?: string
          published?: boolean | null
          published_at?: string | null
          season_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["article_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      colors: {
        Row: {
          created_at: string | null
          hex: string
          id: string
          in_stock: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hex: string
          id: string
          in_stock?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hex?: string
          id?: string
          in_stock?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      divisions: {
        Row: {
          created_at: string | null
          description: string | null
          game_duration_minutes: number | null
          id: string
          league_id: string
          max_teams: number | null
          name: string
          period_count: number | null
          skill_level: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          game_duration_minutes?: number | null
          id?: string
          league_id: string
          max_teams?: number | null
          name: string
          period_count?: number | null
          skill_level?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          game_duration_minutes?: number | null
          id?: string
          league_id?: string
          max_teams?: number | null
          name?: string
          period_count?: number | null
          skill_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divisions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divisions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_order: {
        Row: {
          created_at: string | null
          draft_id: string
          id: string
          league_id: string
          pick_position: number
          team_id: string
        }
        Insert: {
          created_at?: string | null
          draft_id: string
          id?: string
          league_id: string
          pick_position: number
          team_id: string
        }
        Update: {
          created_at?: string | null
          draft_id?: string
          id?: string
          league_id?: string
          pick_position?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_order_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_order_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_order_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_order_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_order_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_picks: {
        Row: {
          created_at: string | null
          draft_id: string
          id: string
          league_id: string
          pick_number: number
          player_id: string
          round: number
          team_id: string
        }
        Insert: {
          created_at?: string | null
          draft_id: string
          id?: string
          league_id: string
          pick_number: number
          player_id: string
          round: number
          team_id: string
        }
        Update: {
          created_at?: string | null
          draft_id?: string
          id?: string
          league_id?: string
          pick_number?: number
          player_id?: string
          round?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_picks_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_picks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          league_id: string
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
          league_id: string
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
          league_id?: string
          season_id?: string
          status?: Database["public"]["Enums"]["draft_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "drafts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      email_drafts: {
        Row: {
          context: Json | null
          created_at: string | null
          created_by: string | null
          html: string
          id: string
          is_automated: boolean | null
          league_id: string
          recipients: Json | null
          sent_at: string | null
          sent_count: number | null
          subject: string
          type: string
          updated_at: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          created_by?: string | null
          html: string
          id?: string
          is_automated?: boolean | null
          league_id: string
          recipients?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          subject: string
          type: string
          updated_at?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          created_by?: string | null
          html?: string
          id?: string
          is_automated?: boolean | null
          league_id?: string
          recipients?: Json | null
          sent_at?: string | null
          sent_count?: number | null
          subject?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      game_scorekeeper_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          checked_in_at: string | null
          completed_at: string | null
          created_at: string | null
          duration_minutes: number | null
          game_id: string
          id: string
          league_id: string
          notes: string | null
          paid_at: string | null
          payment_amount: number | null
          payment_status: string | null
          scorekeeper_id: string
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          game_id: string
          id?: string
          league_id: string
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          scorekeeper_id: string
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          game_id?: string
          id?: string
          league_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          scorekeeper_id?: string
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_scorekeeper_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scorekeeper_assignments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scorekeeper_assignments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scorekeeper_assignments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_scorekeeper_assignments_scorekeeper_id_fkey"
            columns: ["scorekeeper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_stat_entry_log: {
        Row: {
          action: string
          created_at: string | null
          entered_by: string
          entered_by_role: string
          game_id: string
          id: string
          league_id: string
          new_value: Json | null
          player_id: string
          previous_value: Json | null
          stat_type: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entered_by: string
          entered_by_role: string
          game_id: string
          id?: string
          league_id: string
          new_value?: Json | null
          player_id: string
          previous_value?: Json | null
          stat_type: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entered_by?: string
          entered_by_role?: string
          game_id?: string
          id?: string
          league_id?: string
          new_value?: Json | null
          player_id?: string
          previous_value?: Json | null
          stat_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_stat_entry_log_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stat_entry_log_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stat_entry_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stat_entry_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stat_entry_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_stats: {
        Row: {
          created_at: string | null
          entered_by: string
          game_id: string
          id: string
          league_id: string
          period: string
          player_id: string
          stat_type: string
          team_id: string
          team_type: string
          timestamp: string
          value: number
        }
        Insert: {
          created_at?: string | null
          entered_by: string
          game_id: string
          id?: string
          league_id: string
          period: string
          player_id: string
          stat_type: string
          team_id: string
          team_type: string
          timestamp?: string
          value?: number
        }
        Update: {
          created_at?: string | null
          entered_by?: string
          game_id?: string
          id?: string
          league_id?: string
          period?: string
          player_id?: string
          stat_type?: string
          team_id?: string
          team_type?: string
          timestamp?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_stats_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_captain_verified: boolean | null
          away_score: number | null
          away_subs_requested: boolean | null
          away_subs_requested_at: string | null
          away_team_id: string
          created_at: string | null
          home_captain_verified: boolean | null
          home_score: number | null
          home_subs_requested: boolean | null
          home_subs_requested_at: string | null
          home_team_id: string
          id: string
          league_id: string
          location: string | null
          scheduled_at: string
          scorekeeper_notes: string | null
          scorekeeper_verified: boolean | null
          scorekeeper_verified_at: string | null
          scorekeeper_verified_by: string | null
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
          created_at?: string | null
          home_captain_verified?: boolean | null
          home_score?: number | null
          home_subs_requested?: boolean | null
          home_subs_requested_at?: string | null
          home_team_id: string
          id?: string
          league_id: string
          location?: string | null
          scheduled_at: string
          scorekeeper_notes?: string | null
          scorekeeper_verified?: boolean | null
          scorekeeper_verified_at?: string | null
          scorekeeper_verified_by?: string | null
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
          created_at?: string | null
          home_captain_verified?: boolean | null
          home_score?: number | null
          home_subs_requested?: boolean | null
          home_subs_requested_at?: string | null
          home_team_id?: string
          id?: string
          league_id?: string
          location?: string | null
          scheduled_at?: string
          scorekeeper_notes?: string | null
          scorekeeper_verified?: boolean | null
          scorekeeper_verified_at?: string | null
          scorekeeper_verified_by?: string | null
          season_id?: string
          stats_submitted_at?: string | null
          stats_submitted_by?: string | null
          status?: Database["public"]["Enums"]["game_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_scorekeeper_verified_by_fkey"
            columns: ["scorekeeper_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_stats_submitted_by_fkey"
            columns: ["stats_submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goalie_stats: {
        Row: {
          created_at: string | null
          game_id: string
          goals_against: number | null
          id: string
          league_id: string
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
          league_id: string
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
          league_id?: string
          player_id?: string
          saves?: number | null
          season_id?: string
          shutout?: boolean | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goalie_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goalie_stats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goalie_stats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goalie_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goalie_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goalie_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "goalie_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      league_memberships: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          league_id: string
          left_at: string | null
          role: string
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          league_id: string
          left_at?: string | null
          role?: string
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          league_id?: string
          left_at?: string | null
          role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_memberships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_memberships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_scorekeepers: {
        Row: {
          can_edit_games: boolean | null
          can_verify_games: boolean | null
          created_at: string | null
          hired_date: string | null
          hourly_rate: number | null
          id: string
          league_id: string
          notes: string | null
          scorekeeper_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          can_edit_games?: boolean | null
          can_verify_games?: boolean | null
          created_at?: string | null
          hired_date?: string | null
          hourly_rate?: number | null
          id?: string
          league_id: string
          notes?: string | null
          scorekeeper_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          can_edit_games?: boolean | null
          can_verify_games?: boolean | null
          created_at?: string | null
          hired_date?: string | null
          hourly_rate?: number | null
          id?: string
          league_id?: string
          notes?: string | null
          scorekeeper_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_scorekeepers_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_scorekeepers_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_scorekeepers_scorekeeper_id_fkey"
            columns: ["scorekeeper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_sponsors: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          league_id: string
          logo_url: string | null
          name: string
          placement_preference: string[] | null
          start_date: string | null
          tier: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          league_id: string
          logo_url?: string | null
          name: string
          placement_preference?: string[] | null
          start_date?: string | null
          tier?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          league_id?: string
          logo_url?: string | null
          name?: string
          placement_preference?: string[] | null
          start_date?: string | null
          tier?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_sponsors_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_sponsors_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          custom_domain: string | null
          description: string | null
          id: string
          is_public: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          payment_mode: string | null
          postal_code: string | null
          primary_color: string | null
          registration_url: string | null
          search_keywords: string[] | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          state_province: string | null
          status: string | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          subscription_status: string | null
          subscription_tier: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          payment_mode?: string | null
          postal_code?: string | null
          primary_color?: string | null
          registration_url?: string | null
          search_keywords?: string[] | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          state_province?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          payment_mode?: string | null
          postal_code?: string | null
          primary_color?: string | null
          registration_url?: string | null
          search_keywords?: string[] | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          state_province?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "legacy_players_matched_to_profile_id_fkey"
            columns: ["matched_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          entered_by: string
          id: string
          league_id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          player_id: string
          season_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          entered_by: string
          id?: string
          league_id: string
          notes?: string | null
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          player_id: string
          season_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          entered_by?: string
          id?: string
          league_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          player_id?: string
          season_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_sponsors: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          placement_preference: string[] | null
          start_date: string | null
          tier: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          placement_preference?: string[] | null
          start_date?: string | null
          tier?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          placement_preference?: string[] | null
          start_date?: string | null
          tier?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      player_approvals: {
        Row: {
          approval_method: string
          approved_by: string | null
          created_at: string | null
          id: string
          league_id: string
          notes: string | null
          player_id: string
        }
        Insert: {
          approval_method: string
          approved_by?: string | null
          created_at?: string | null
          id?: string
          league_id: string
          notes?: string | null
          player_id: string
        }
        Update: {
          approval_method?: string
          approved_by?: string | null
          created_at?: string | null
          id?: string
          league_id?: string
          notes?: string | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_approvals_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_approvals_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_approvals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "player_availability_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_availability_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_availability_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_availability_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_availability_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_goalie_matchups: {
        Row: {
          assists: number
          created_at: string
          games_played: number
          goalie_id: string
          goals: number
          id: string
          last_game_at: string | null
          league_id: string
          player_id: string
          points: number
          season_id: string | null
          shooting_percentage: number | null
          shots: number
          updated_at: string
        }
        Insert: {
          assists?: number
          created_at?: string
          games_played?: number
          goalie_id: string
          goals?: number
          id?: string
          last_game_at?: string | null
          league_id: string
          player_id: string
          points?: number
          season_id?: string | null
          shooting_percentage?: number | null
          shots?: number
          updated_at?: string
        }
        Update: {
          assists?: number
          created_at?: string
          games_played?: number
          goalie_id?: string
          goals?: number
          id?: string
          last_game_at?: string | null
          league_id?: string
          player_id?: string
          points?: number
          season_id?: string | null
          shooting_percentage?: number | null
          shots?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_goalie_matchups_goalie_id_fkey"
            columns: ["goalie_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_goalie_matchups_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_goalie_matchups_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_goalie_matchups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_goalie_matchups_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_ratings: {
        Row: {
          attendance_rate: number | null
          calculated_at: string | null
          games_played: number | null
          id: string
          league_id: string
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
          league_id: string
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
          league_id?: string
          player_id?: string
          points_per_game?: number | null
          rating?: Database["public"]["Enums"]["player_rating"]
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ratings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          assists: number | null
          created_at: string | null
          game_id: string
          goals: number | null
          id: string
          league_id: string
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
          league_id: string
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
          league_id?: string
          player_id?: string
          season_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
          shot_hand: string | null
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
          shot_hand?: string | null
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
          shot_hand?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      season_highlights: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          highlight_type: string
          id: string
          league_id: string
          photo_url: string | null
          season_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          highlight_type: string
          id?: string
          league_id: string
          photo_url?: string | null
          season_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          highlight_type?: string
          id?: string
          league_id?: string
          photo_url?: string | null
          season_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_highlights_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_highlights_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_highlights_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "season_opt_ins_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_opt_ins_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          allow_team_selection: boolean | null
          average_goals_per_game: number | null
          champion_team_id: string | null
          created_at: string | null
          current_game_count: number | null
          default_location: string | null
          draft_scheduled_at: string | null
          end_date: string | null
          game_days: Json | null
          game_times: Json | null
          games_per_cycle: number | null
          id: string
          league_id: string
          max_players_per_team: number | null
          name: string
          photo_gallery_url: string[] | null
          playoff_format: string | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          registration_type:
            | Database["public"]["Enums"]["registration_type"]
            | null
          schedule_generated: boolean | null
          season_summary: string | null
          start_date: string
          status: Database["public"]["Enums"]["season_status"] | null
          total_games: number | null
          total_goals_scored: number | null
          updated_at: string | null
        }
        Insert: {
          allow_team_selection?: boolean | null
          average_goals_per_game?: number | null
          champion_team_id?: string | null
          created_at?: string | null
          current_game_count?: number | null
          default_location?: string | null
          draft_scheduled_at?: string | null
          end_date?: string | null
          game_days?: Json | null
          game_times?: Json | null
          games_per_cycle?: number | null
          id?: string
          league_id: string
          max_players_per_team?: number | null
          name: string
          photo_gallery_url?: string[] | null
          playoff_format?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          registration_type?:
            | Database["public"]["Enums"]["registration_type"]
            | null
          schedule_generated?: boolean | null
          season_summary?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["season_status"] | null
          total_games?: number | null
          total_goals_scored?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_team_selection?: boolean | null
          average_goals_per_game?: number | null
          champion_team_id?: string | null
          created_at?: string | null
          current_game_count?: number | null
          default_location?: string | null
          draft_scheduled_at?: string | null
          end_date?: string | null
          game_days?: Json | null
          game_times?: Json | null
          games_per_cycle?: number | null
          id?: string
          league_id?: string
          max_players_per_team?: number | null
          name?: string
          photo_gallery_url?: string[] | null
          playoff_format?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          registration_type?:
            | Database["public"]["Enums"]["registration_type"]
            | null
          schedule_generated?: boolean | null
          season_summary?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["season_status"] | null
          total_games?: number | null
          total_goals_scored?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seasons_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      suspensions: {
        Row: {
          created_at: string | null
          end_date: string | null
          games_remaining: number
          id: string
          issued_by: string
          league_id: string
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
          league_id: string
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
          league_id?: string
          player_id?: string
          reason?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspensions_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string
          invite_type: string
          invited_by: string
          message: string | null
          season_id: string
          status: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invite_token?: string
          invite_type?: string
          invited_by: string
          message?: string | null
          season_id: string
          status?: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invite_type?: string
          invited_by?: string
          message?: string | null
          season_id?: string
          status?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_join_requests: {
        Row: {
          id: string
          league_id: string
          message: string | null
          player_id: string
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          season_id: string
          status: string | null
          team_id: string
        }
        Insert: {
          id?: string
          league_id: string
          message?: string | null
          player_id: string
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          season_id: string
          status?: string | null
          team_id: string
        }
        Update: {
          id?: string
          league_id?: string
          message?: string | null
          player_id?: string
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          season_id?: string
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_join_requests_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_rosters: {
        Row: {
          id: string
          is_goalie: boolean | null
          joined_at: string | null
          league_id: string
          player_id: string
          season_id: string
          team_id: string
        }
        Insert: {
          id?: string
          is_goalie?: boolean | null
          joined_at?: string | null
          league_id: string
          player_id: string
          season_id: string
          team_id: string
        }
        Update: {
          id?: string
          is_goalie?: boolean | null
          joined_at?: string | null
          league_id?: string
          player_id?: string
          season_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_rosters_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string | null
          created_at: string | null
          id: string
          league_id: string
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
          league_id: string
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
          league_id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      toys: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          image_url: string | null
          license_status: string | null
          name: string
          print_time_hours: number | null
          source_url: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id: string
          image_url?: string | null
          license_status?: string | null
          name: string
          print_time_hours?: number | null
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          license_status?: string | null
          name?: string
          print_time_hours?: number | null
          source_url?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trade_players: {
        Row: {
          created_at: string
          from_team_id: string
          id: string
          league_id: string
          player_id: string
          to_team_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string
          from_team_id: string
          id?: string
          league_id: string
          player_id: string
          to_team_id: string
          trade_id: string
        }
        Update: {
          created_at?: string
          from_team_id?: string
          id?: string
          league_id?: string
          player_id?: string
          to_team_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_players_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "trade_players_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_players_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_players_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_players_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "trade_players_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_players_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string
          executed_at: string
          executed_by: string
          id: string
          league_id: string
          notes: string | null
          reverted_at: string | null
          reverted_by: string | null
          season_id: string
          trade_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          executed_at?: string
          executed_by: string
          id?: string
          league_id: string
          notes?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          season_id: string
          trade_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          executed_at?: string
          executed_by?: string
          id?: string
          league_id?: string
          notes?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          season_id?: string
          trade_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          amenities: string[] | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          league_id: string
          name: string
          number_of_rinks: number | null
          parking_info: string | null
          phone: string | null
          postal_code: string | null
          state_province: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          league_id: string
          name: string
          number_of_rinks?: number | null
          parking_info?: string | null
          phone?: string | null
          postal_code?: string | null
          state_province?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          league_id?: string
          name?: string
          number_of_rinks?: number | null
          parking_info?: string | null
          phone?: string | null
          postal_code?: string | null
          state_province?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      goalie_season_stats: {
        Row: {
          full_name: string | null
          games_played: number | null
          goals_against: number | null
          goals_against_average: number | null
          jersey_number: number | null
          player_id: string | null
          save_percentage: number | null
          saves: number | null
          season_id: string | null
          shutouts: number | null
          team_color: string | null
          team_name: string | null
          team_short_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goalie_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goalie_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      goalie_season_stats_mv: {
        Row: {
          gaa: number | null
          games_played: number | null
          goals_against: number | null
          player_id: string | null
          save_percentage: number | null
          saves: number | null
          season_id: string | null
          shutouts: number | null
          team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goalie_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goalie_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_career_stats: {
        Row: {
          assists: number | null
          full_name: string | null
          games_played: number | null
          goals: number | null
          jersey_number: number | null
          player_id: string | null
          points: number | null
          points_per_game: number | null
          position: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_stats: {
        Row: {
          assists: number | null
          full_name: string | null
          games_played: number | null
          goals: number | null
          jersey_number: number | null
          player_id: string | null
          points: number | null
          points_per_game: number | null
          position: string | null
          season_id: string | null
          team_color: string | null
          team_name: string | null
          team_short_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_stats_mv: {
        Row: {
          assists: number | null
          assists_per_game: number | null
          games_played: number | null
          goals: number | null
          goals_per_game: number | null
          player_id: string | null
          points: number | null
          points_per_game: number | null
          season_id: string | null
          team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      public_leagues: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string | null
          postal_code: string | null
          primary_color: string | null
          registration_url: string | null
          search_keywords: string[] | null
          secondary_color: string | null
          slug: string | null
          state_province: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          postal_code?: string | null
          primary_color?: string | null
          registration_url?: string | null
          search_keywords?: string[] | null
          secondary_color?: string | null
          slug?: string | null
          state_province?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string | null
          postal_code?: string | null
          primary_color?: string | null
          registration_url?: string | null
          search_keywords?: string[] | null
          secondary_color?: string | null
          slug?: string | null
          state_province?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      team_standings: {
        Row: {
          games_played: number | null
          goals_against: number | null
          goals_for: number | null
          logo_url: string | null
          losses: number | null
          name: string | null
          points: number | null
          primary_color: string | null
          season_id: string | null
          secondary_color: string | null
          short_name: string | null
          team_id: string | null
          ties: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_season_stats: {
        Args: { season_uuid: string }
        Returns: undefined
      }
      get_active_league_sponsors: {
        Args: { check_league_id: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          placement_preference: string[]
          tier: string
          website_url: string
        }[]
      }
      get_active_platform_sponsors: {
        Args: never
        Returns: {
          id: string
          logo_url: string
          name: string
          placement_preference: string[]
          tier: string
          website_url: string
        }[]
      }
      get_goalie_season_stats: {
        Args: { check_league_id: string; check_season_id: string }
        Returns: {
          games_played: number
          player_id: string
          save_percentage: number
          shutouts: number
          total_goals_against: number
          total_saves: number
        }[]
      }
      get_league_by_slug: {
        Args: { check_slug: string }
        Returns: {
          description: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          status: string
          subscription_tier: string
        }[]
      }
      get_league_seasons: {
        Args: { check_league_id: string }
        Returns: {
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
        }[]
      }
      get_league_teams: {
        Args: { check_league_id: string }
        Returns: {
          captain_id: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          secondary_color: string
          short_name: string
        }[]
      }
      get_leagues_by_location: {
        Args: {
          search_city?: string
          search_country?: string
          search_state?: string
        }
        Returns: {
          city: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          slug: string
          state_province: string
        }[]
      }
      get_open_registration_seasons: {
        Args: { check_league_id: string }
        Returns: {
          allow_team_selection: boolean
          id: string
          max_players_per_team: number
          name: string
          registration_closes_at: string
          registration_opens_at: string
          registration_type: Database["public"]["Enums"]["registration_type"]
        }[]
      }
      get_player_approval_status: {
        Args: { check_league_id: string; check_player_id: string }
        Returns: {
          approval_method: string
          approved_at: string
          approved_by_name: string
          is_approved: boolean
          notes: string
        }[]
      }
      get_player_request_status: {
        Args: {
          check_player_id: string
          check_season_id: string
          check_team_id: string
        }
        Returns: {
          has_request: boolean
          requested_at: string
          reviewed_at: string
          status: string
        }[]
      }
      get_player_season_stats: {
        Args: { check_league_id: string; check_season_id: string }
        Returns: {
          games_played: number
          player_id: string
          total_assists: number
          total_goals: number
          total_points: number
        }[]
      }
      get_recent_games: {
        Args: { check_league_id: string; days_back?: number }
        Returns: {
          away_score: number
          away_team_id: string
          home_score: number
          home_team_id: string
          id: string
          scheduled_at: string
          season_id: string
          status: string
        }[]
      }
      get_scorekeeper_assigned_games: {
        Args: { scorekeeper_uuid: string }
        Returns: {
          assigned_at: string
          game_id: string
          league_id: string
          payment_status: string
        }[]
      }
      get_scorekeeper_payments: {
        Args: { check_league_id: string; check_scorekeeper_id?: string }
        Returns: {
          approved_payment: number
          games_worked: number
          paid_payment: number
          pending_payment: number
          scorekeeper_id: string
          total_hours: number
          total_payment: number
        }[]
      }
      get_team_pending_requests: {
        Args: { check_team_id: string }
        Returns: {
          id: string
          message: string
          player_email: string
          player_id: string
          player_name: string
          requested_at: string
        }[]
      }
      get_team_standings: {
        Args: { check_league_id: string; check_season_id: string }
        Returns: {
          games_played: number
          goal_differential: number
          goals_against: number
          goals_for: number
          losses: number
          points: number
          team_id: string
          ties: number
          wins: number
        }[]
      }
      get_unpaid_fees: {
        Args: { check_league_id: string; check_season_id: string }
        Returns: {
          amount: number
          payment_date: string
          player_id: string
        }[]
      }
      get_upcoming_games: {
        Args: { check_league_id: string; days_ahead?: number }
        Returns: {
          away_team_id: string
          home_team_id: string
          id: string
          location: string
          scheduled_at: string
          season_id: string
          status: string
        }[]
      }
      get_user_league_ids: {
        Args: { user_uuid: string }
        Returns: {
          league_id: string
        }[]
      }
      get_user_league_role: {
        Args: { check_league_id: string; user_uuid: string }
        Returns: string
      }
      is_league_admin: {
        Args: { check_league_id: string; user_uuid: string }
        Returns: boolean
      }
      is_league_owner: {
        Args: { check_league_id: string; user_uuid: string }
        Returns: boolean
      }
      is_league_scorekeeper: {
        Args: { check_league_id: string; user_uuid: string }
        Returns: boolean
      }
      is_league_slug_available: {
        Args: { check_slug: string }
        Returns: boolean
      }
      is_player_approved: {
        Args: { check_league_id: string; check_player_id: string }
        Returns: boolean
      }
      is_season_registration_open: {
        Args: { check_season_id: string }
        Returns: boolean
      }
      is_team_roster_full: {
        Args: { check_season_id: string; check_team_id: string }
        Returns: boolean
      }
      match_legacy_player_to_profile: {
        Args: { legacy_player_id: string; profile_id: string }
        Returns: undefined
      }
      refresh_season_stats: { Args: never; Returns: undefined }
      search_leagues_by_keyword: {
        Args: { limit_results?: number; search_query: string }
        Returns: {
          city: string
          country: string
          description: string
          id: string
          logo_url: string
          name: string
          relevance: number
          slug: string
          state_province: string
        }[]
      }
      search_nearby_leagues: {
        Args: { radius_km?: number; user_lat: number; user_lon: number }
        Returns: {
          city: string
          distance_km: number
          id: string
          logo_url: string
          name: string
          primary_color: string
          slug: string
          state_province: string
        }[]
      }
      user_has_league_access: {
        Args: { check_league_id: string; user_uuid: string }
        Returns: boolean
      }
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
      payment_method: "cash" | "e_transfer" | "stripe" | "check" | "other"
      payment_status: "pending" | "completed" | "refunded" | "failed"
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
      registration_type: "draft" | "open_registration" | "captain_invite_only"
      season_status: "active" | "playoffs" | "completed" | "draft" | "archived"
      user_role: "owner" | "captain" | "player"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      article_type: [
        "game_recap",
        "weekly_wrap",
        "draft_grades",
        "announcement",
      ],
      draft_status: ["pending", "in_progress", "completed"],
      game_status: ["scheduled", "in_progress", "completed", "cancelled"],
      opt_in_type: ["full_time", "call_up"],
      payment_method: ["cash", "e_transfer", "stripe", "check", "other"],
      payment_status: ["pending", "completed", "refunded", "failed"],
      player_rating: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "D-",
      ],
      registration_type: ["draft", "open_registration", "captain_invite_only"],
      season_status: ["active", "playoffs", "completed", "draft", "archived"],
      user_role: ["owner", "captain", "player"],
    },
  },
} as const
