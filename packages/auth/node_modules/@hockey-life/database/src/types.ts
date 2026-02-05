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
  public: {
    Tables: {
      account_deletion_log: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          completion_notification_sent: boolean | null
          created_at: string | null
          deletion_reason: string | null
          error_message: string | null
          id: string
          initial_notification_sent: boolean | null
          ip_address: string | null
          profile_email: string
          reminder_7day_sent: boolean | null
          requested_at: string
          scheduled_for: string
          status: string
          stripe_customer_id: string | null
          stripe_deleted: boolean | null
          stripe_deletion_attempted_at: string | null
          stripe_deletion_error: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          completion_notification_sent?: boolean | null
          created_at?: string | null
          deletion_reason?: string | null
          error_message?: string | null
          id?: string
          initial_notification_sent?: boolean | null
          ip_address?: string | null
          profile_email: string
          reminder_7day_sent?: boolean | null
          requested_at?: string
          scheduled_for: string
          status: string
          stripe_customer_id?: string | null
          stripe_deleted?: boolean | null
          stripe_deletion_attempted_at?: string | null
          stripe_deletion_error?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          completion_notification_sent?: boolean | null
          created_at?: string | null
          deletion_reason?: string | null
          error_message?: string | null
          id?: string
          initial_notification_sent?: boolean | null
          ip_address?: string | null
          profile_email?: string
          reminder_7day_sent?: boolean | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_deleted?: boolean | null
          stripe_deletion_attempted_at?: string | null
          stripe_deletion_error?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      account_recovery_requests: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string
          email: string
          expires_at: string | null
          id: string
          identity_verification_file: string | null
          ip_address: string | null
          recovery_type: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description: string
          email: string
          expires_at?: string | null
          id?: string
          identity_verification_file?: string | null
          ip_address?: string | null
          recovery_type: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          email?: string
          expires_at?: string | null
          id?: string
          identity_verification_file?: string | null
          ip_address?: string | null
          recovery_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
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
            referencedRelation: "league_branding"
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
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
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
      draft_auto_pick_log: {
        Row: {
          draft_id: string
          error_message: string | null
          expires_at: string | null
          id: string
          latency_ms: number | null
          pick_number: number
          player_id: string | null
          round: number
          success: boolean
          team_id: string | null
          triggered_at: string | null
        }
        Insert: {
          draft_id: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          latency_ms?: number | null
          pick_number: number
          player_id?: string | null
          round: number
          success: boolean
          team_id?: string | null
          triggered_at?: string | null
        }
        Update: {
          draft_id?: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          latency_ms?: number | null
          pick_number?: number
          player_id?: string | null
          round?: number
          success?: boolean
          team_id?: string | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_auto_pick_log_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_messages: {
        Row: {
          created_at: string | null
          draft_id: string
          id: string
          league_id: string
          message: string
          message_type: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          draft_id: string
          id?: string
          league_id: string
          message: string
          message_type?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          draft_id?: string
          id?: string
          league_id?: string
          message?: string
          message_type?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_messages_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          round: number | null
          team_id: string
        }
        Insert: {
          created_at?: string | null
          draft_id: string
          id?: string
          league_id: string
          pick_position: number
          round?: number | null
          team_id: string
        }
        Update: {
          created_at?: string | null
          draft_id?: string
          id?: string
          league_id?: string
          pick_position?: number
          round?: number | null
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
            referencedRelation: "league_branding"
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
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
      draft_pick_trades: {
        Row: {
          created_at: string | null
          draft_id: string
          from_team_id: string
          id: string
          league_id: string
          notes: string | null
          original_pick_position: number
          round: number
          status: string | null
          to_team_id: string
          traded_at: string | null
          traded_by: string | null
        }
        Insert: {
          created_at?: string | null
          draft_id: string
          from_team_id: string
          id?: string
          league_id: string
          notes?: string | null
          original_pick_position: number
          round: number
          status?: string | null
          to_team_id: string
          traded_at?: string | null
          traded_by?: string | null
        }
        Update: {
          created_at?: string | null
          draft_id?: string
          from_team_id?: string
          id?: string
          league_id?: string
          notes?: string | null
          original_pick_position?: number
          round?: number
          status?: string | null
          to_team_id?: string
          traded_at?: string | null
          traded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_pick_trades_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pick_trades_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_pick_trades_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_pick_trades_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pick_trades_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pick_trades_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pick_trades_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pick_trades_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_pick_trades_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_pick_trades_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pick_trades_traded_by_fkey"
            columns: ["traded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pick_trades_traded_by_fkey"
            columns: ["traded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_picks: {
        Row: {
          auto_picked: boolean | null
          created_at: string | null
          draft_id: string
          id: string
          idempotency_key: string | null
          league_id: string
          pick_number: number
          pick_time_ms: number | null
          picked_by: string | null
          player_id: string
          round: number
          team_id: string
          undone_at: string | null
          undone_by: string | null
        }
        Insert: {
          auto_picked?: boolean | null
          created_at?: string | null
          draft_id: string
          id?: string
          idempotency_key?: string | null
          league_id: string
          pick_number: number
          pick_time_ms?: number | null
          picked_by?: string | null
          player_id: string
          round: number
          team_id: string
          undone_at?: string | null
          undone_by?: string | null
        }
        Update: {
          auto_picked?: boolean | null
          created_at?: string | null
          draft_id?: string
          id?: string
          idempotency_key?: string | null
          league_id?: string
          pick_number?: number
          pick_time_ms?: number | null
          picked_by?: string | null
          player_id?: string
          round?: number
          team_id?: string
          undone_at?: string | null
          undone_by?: string | null
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
            referencedRelation: "league_branding"
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
            foreignKeyName: "draft_picks_picked_by_fkey"
            columns: ["picked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_picked_by_fkey"
            columns: ["picked_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "draft_picks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
          {
            foreignKeyName: "draft_picks_undone_by_fkey"
            columns: ["undone_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_picks_undone_by_fkey"
            columns: ["undone_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_pool: {
        Row: {
          auto_pick_rank: number | null
          created_at: string | null
          draft_id: string
          drafted_at: string | null
          drafted_by_team_id: string | null
          id: string
          is_drafted: boolean | null
          league_id: string
          player_id: string
          player_name: string
          position: string | null
          skill_level: string | null
        }
        Insert: {
          auto_pick_rank?: number | null
          created_at?: string | null
          draft_id: string
          drafted_at?: string | null
          drafted_by_team_id?: string | null
          id?: string
          is_drafted?: boolean | null
          league_id: string
          player_id: string
          player_name: string
          position?: string | null
          skill_level?: string | null
        }
        Update: {
          auto_pick_rank?: number | null
          created_at?: string | null
          draft_id?: string
          drafted_at?: string | null
          drafted_by_team_id?: string | null
          id?: string
          is_drafted?: boolean | null
          league_id?: string
          player_id?: string
          player_name?: string
          position?: string | null
          skill_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_pool_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pool_drafted_by_team_id_fkey"
            columns: ["drafted_by_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_pool_drafted_by_team_id_fkey"
            columns: ["drafted_by_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_pool_drafted_by_team_id_fkey"
            columns: ["drafted_by_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pool_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pool_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pool_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pool_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_pool_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_roster_confirmations: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string
          draft_id: string
          has_issues: boolean | null
          id: string
          league_id: string
          notes: string | null
          team_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by: string
          draft_id: string
          has_issues?: boolean | null
          id?: string
          league_id: string
          notes?: string | null
          team_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string
          draft_id?: string
          has_issues?: boolean | null
          id?: string
          league_id?: string
          notes?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_roster_confirmations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_roster_confirmations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_roster_confirmations_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_roster_confirmations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_roster_confirmations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_roster_confirmations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_roster_confirmations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_roster_confirmations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "draft_roster_confirmations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_undo_log: {
        Row: {
          draft_id: string
          id: string
          pick_id: string
          pick_number: number | null
          player_id: string | null
          round: number | null
          state_after: Json
          state_before: Json
          team_id: string | null
          undone_at: string | null
          undone_by: string
        }
        Insert: {
          draft_id: string
          id?: string
          pick_id: string
          pick_number?: number | null
          player_id?: string | null
          round?: number | null
          state_after: Json
          state_before: Json
          team_id?: string | null
          undone_at?: string | null
          undone_by: string
        }
        Update: {
          draft_id?: string
          id?: string
          pick_id?: string
          pick_number?: number | null
          player_id?: string | null
          round?: number | null
          state_after?: Json
          state_before?: Json
          team_id?: string | null
          undone_at?: string | null
          undone_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_undo_log_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_undo_log_undone_by_fkey"
            columns: ["undone_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_undo_log_undone_by_fkey"
            columns: ["undone_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          allow_trades: boolean | null
          auto_advance: boolean | null
          auto_pick_enabled: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          current_pick: number | null
          current_pick_expires_at: string | null
          current_pick_started_at: string | null
          current_round: number | null
          current_team_id: string | null
          cycle_number: number
          draft_link: string | null
          draft_order_assigned: boolean | null
          draft_type: string | null
          id: string
          last_pick_id: string | null
          league_id: string
          max_roster_size: number | null
          min_roster_size: number | null
          name: string | null
          paused_at: string | null
          pick_time_seconds: number | null
          require_roster_confirmation: boolean | null
          season_id: string
          snake_draft: boolean | null
          started_at: string | null
          state_version: number | null
          status: Database["public"]["Enums"]["draft_status"] | null
          total_rounds: number | null
          undo_available: boolean | null
          undo_in_progress: boolean | null
          version: number | null
        }
        Insert: {
          allow_trades?: boolean | null
          auto_advance?: boolean | null
          auto_pick_enabled?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_pick?: number | null
          current_pick_expires_at?: string | null
          current_pick_started_at?: string | null
          current_round?: number | null
          current_team_id?: string | null
          cycle_number: number
          draft_link?: string | null
          draft_order_assigned?: boolean | null
          draft_type?: string | null
          id?: string
          last_pick_id?: string | null
          league_id: string
          max_roster_size?: number | null
          min_roster_size?: number | null
          name?: string | null
          paused_at?: string | null
          pick_time_seconds?: number | null
          require_roster_confirmation?: boolean | null
          season_id: string
          snake_draft?: boolean | null
          started_at?: string | null
          state_version?: number | null
          status?: Database["public"]["Enums"]["draft_status"] | null
          total_rounds?: number | null
          undo_available?: boolean | null
          undo_in_progress?: boolean | null
          version?: number | null
        }
        Update: {
          allow_trades?: boolean | null
          auto_advance?: boolean | null
          auto_pick_enabled?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          current_pick?: number | null
          current_pick_expires_at?: string | null
          current_pick_started_at?: string | null
          current_round?: number | null
          current_team_id?: string | null
          cycle_number?: number
          draft_link?: string | null
          draft_order_assigned?: boolean | null
          draft_type?: string | null
          id?: string
          last_pick_id?: string | null
          league_id?: string
          max_roster_size?: number | null
          min_roster_size?: number | null
          name?: string | null
          paused_at?: string | null
          pick_time_seconds?: number | null
          require_roster_confirmation?: boolean | null
          season_id?: string
          snake_draft?: boolean | null
          started_at?: string | null
          state_version?: number | null
          status?: Database["public"]["Enums"]["draft_status"] | null
          total_rounds?: number | null
          undo_available?: boolean | null
          undo_in_progress?: boolean | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "drafts_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "drafts_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_last_pick_id_fkey"
            columns: ["last_pick_id"]
            isOneToOne: false
            referencedRelation: "draft_picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "email_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
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
      game_audit_log: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          game_id: string
          id: string
          league_id: string
          new_data: Json | null
          previous_data: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string
          game_id: string
          id?: string
          league_id: string
          new_data?: Json | null
          previous_data?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          game_id?: string
          id?: string
          league_id?: string
          new_data?: Json | null
          previous_data?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_audit_log_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_audit_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_audit_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_audit_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      game_events: {
        Row: {
          assist1_player_id: string | null
          assist2_player_id: string | null
          client_event_id: string
          conflict_resolved_at: string | null
          created_at: string | null
          created_offline: boolean
          deleted_at: string | null
          deleted_by: string | null
          device_id: string | null
          entered_at: string
          entered_by: string
          event_type: string
          event_version: number
          game_id: string
          game_time_seconds: number | null
          goalie_in_net_id: string | null
          id: string
          is_empty_net: boolean | null
          is_power_play: boolean | null
          is_short_handed: boolean | null
          league_id: string
          penalty_minutes: number | null
          penalty_type: string | null
          period: number
          player_id: string
          sync_status: string
          synced_at: string | null
          team_id: string
          team_type: string
          updated_at: string | null
        }
        Insert: {
          assist1_player_id?: string | null
          assist2_player_id?: string | null
          client_event_id: string
          conflict_resolved_at?: string | null
          created_at?: string | null
          created_offline?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          device_id?: string | null
          entered_at?: string
          entered_by: string
          event_type: string
          event_version?: number
          game_id: string
          game_time_seconds?: number | null
          goalie_in_net_id?: string | null
          id?: string
          is_empty_net?: boolean | null
          is_power_play?: boolean | null
          is_short_handed?: boolean | null
          league_id: string
          penalty_minutes?: number | null
          penalty_type?: string | null
          period: number
          player_id: string
          sync_status?: string
          synced_at?: string | null
          team_id: string
          team_type: string
          updated_at?: string | null
        }
        Update: {
          assist1_player_id?: string | null
          assist2_player_id?: string | null
          client_event_id?: string
          conflict_resolved_at?: string | null
          created_at?: string | null
          created_offline?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          device_id?: string | null
          entered_at?: string
          entered_by?: string
          event_type?: string
          event_version?: number
          game_id?: string
          game_time_seconds?: number | null
          goalie_in_net_id?: string | null
          id?: string
          is_empty_net?: boolean | null
          is_power_play?: boolean | null
          is_short_handed?: boolean | null
          league_id?: string
          penalty_minutes?: number | null
          penalty_type?: string | null
          period?: number
          player_id?: string
          sync_status?: string
          synced_at?: string | null
          team_id?: string
          team_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_events_assist1_player_id_fkey"
            columns: ["assist1_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_assist1_player_id_fkey"
            columns: ["assist1_player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_assist2_player_id_fkey"
            columns: ["assist2_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_assist2_player_id_fkey"
            columns: ["assist2_player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "game_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "game_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
            foreignKeyName: "game_scorekeeper_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "league_branding"
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
          {
            foreignKeyName: "game_scorekeeper_assignments_scorekeeper_id_fkey"
            columns: ["scorekeeper_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "game_stat_entry_log_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "league_branding"
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
          {
            foreignKeyName: "game_stat_entry_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          locked: boolean | null
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
          locked?: boolean | null
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
          locked?: boolean | null
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
            foreignKeyName: "game_stats_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "league_branding"
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
            foreignKeyName: "game_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
      game_submissions: {
        Row: {
          away_captain_device: string | null
          away_captain_id: string | null
          away_captain_ip: string | null
          away_captain_signature: string | null
          away_captain_signed_at: string | null
          created_at: string | null
          dispute_reason: string | null
          dispute_resolution: string | null
          dispute_resolved_at: string | null
          dispute_resolved_by: string | null
          disputed_at: string | null
          disputed_by: string | null
          final_away_score: number | null
          final_home_score: number | null
          game_id: string
          home_captain_device: string | null
          home_captain_id: string | null
          home_captain_ip: string | null
          home_captain_signature: string | null
          home_captain_signed_at: string | null
          id: string
          league_id: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_assists: number | null
          total_goals: number | null
          total_penalties: number | null
          total_saves: number | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          away_captain_device?: string | null
          away_captain_id?: string | null
          away_captain_ip?: string | null
          away_captain_signature?: string | null
          away_captain_signed_at?: string | null
          created_at?: string | null
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          disputed_at?: string | null
          disputed_by?: string | null
          final_away_score?: number | null
          final_home_score?: number | null
          game_id: string
          home_captain_device?: string | null
          home_captain_id?: string | null
          home_captain_ip?: string | null
          home_captain_signature?: string | null
          home_captain_signed_at?: string | null
          id?: string
          league_id: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_assists?: number | null
          total_goals?: number | null
          total_penalties?: number | null
          total_saves?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          away_captain_device?: string | null
          away_captain_id?: string | null
          away_captain_ip?: string | null
          away_captain_signature?: string | null
          away_captain_signed_at?: string | null
          created_at?: string | null
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          disputed_at?: string | null
          disputed_by?: string | null
          final_away_score?: number | null
          final_home_score?: number | null
          game_id?: string
          home_captain_device?: string | null
          home_captain_id?: string | null
          home_captain_ip?: string | null
          home_captain_signature?: string | null
          home_captain_signed_at?: string | null
          id?: string
          league_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_assists?: number | null
          total_goals?: number | null
          total_penalties?: number | null
          total_saves?: number | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_submissions_away_captain_id_fkey"
            columns: ["away_captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_away_captain_id_fkey"
            columns: ["away_captain_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_dispute_resolved_by_fkey"
            columns: ["dispute_resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_dispute_resolved_by_fkey"
            columns: ["dispute_resolved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_disputed_by_fkey"
            columns: ["disputed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_disputed_by_fkey"
            columns: ["disputed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_home_captain_id_fkey"
            columns: ["home_captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_home_captain_id_fkey"
            columns: ["home_captain_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_captain_verified: boolean | null
          away_contested_at: string | null
          away_contested_reason: string | null
          away_contested_stats: Json | null
          away_score: number | null
          away_subs_requested: boolean | null
          away_subs_requested_at: string | null
          away_team_id: string
          away_verification_token: string | null
          away_verified_at: string | null
          away_verified_by_owner: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period: number | null
          game_ended_at: string | null
          game_number: number | null
          game_started_at: string | null
          generation_log_id: string | null
          home_captain_verified: boolean | null
          home_contested_at: string | null
          home_contested_reason: string | null
          home_contested_stats: Json | null
          home_score: number | null
          home_subs_requested: boolean | null
          home_subs_requested_at: string | null
          home_team_id: string
          home_verification_token: string | null
          home_verified_at: string | null
          home_verified_by_owner: boolean | null
          id: string
          is_rescheduled: boolean | null
          league_id: string
          location: string | null
          original_scheduled_at: string | null
          period_count: number | null
          period_length_minutes: number | null
          period_started_at: string | null
          rescheduled_at: string | null
          round_number: number | null
          scheduled_at: string
          scorekeeper_notes: string | null
          scorekeeper_verified: boolean | null
          scorekeeper_verified_at: string | null
          scorekeeper_verified_by: string | null
          season_id: string
          stats_locked_at: string | null
          stats_submitted_at: string | null
          stats_submitted_by: string | null
          stats_unlocked_at: string | null
          status: Database["public"]["Enums"]["game_status"] | null
          unlock_reason: string | null
          unlocked_by: string | null
          updated_at: string | null
        }
        Insert: {
          away_captain_verified?: boolean | null
          away_contested_at?: string | null
          away_contested_reason?: string | null
          away_contested_stats?: Json | null
          away_score?: number | null
          away_subs_requested?: boolean | null
          away_subs_requested_at?: string | null
          away_team_id: string
          away_verification_token?: string | null
          away_verified_at?: string | null
          away_verified_by_owner?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period?: number | null
          game_ended_at?: string | null
          game_number?: number | null
          game_started_at?: string | null
          generation_log_id?: string | null
          home_captain_verified?: boolean | null
          home_contested_at?: string | null
          home_contested_reason?: string | null
          home_contested_stats?: Json | null
          home_score?: number | null
          home_subs_requested?: boolean | null
          home_subs_requested_at?: string | null
          home_team_id: string
          home_verification_token?: string | null
          home_verified_at?: string | null
          home_verified_by_owner?: boolean | null
          id?: string
          is_rescheduled?: boolean | null
          league_id: string
          location?: string | null
          original_scheduled_at?: string | null
          period_count?: number | null
          period_length_minutes?: number | null
          period_started_at?: string | null
          rescheduled_at?: string | null
          round_number?: number | null
          scheduled_at: string
          scorekeeper_notes?: string | null
          scorekeeper_verified?: boolean | null
          scorekeeper_verified_at?: string | null
          scorekeeper_verified_by?: string | null
          season_id: string
          stats_locked_at?: string | null
          stats_submitted_at?: string | null
          stats_submitted_by?: string | null
          stats_unlocked_at?: string | null
          status?: Database["public"]["Enums"]["game_status"] | null
          unlock_reason?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
        }
        Update: {
          away_captain_verified?: boolean | null
          away_contested_at?: string | null
          away_contested_reason?: string | null
          away_contested_stats?: Json | null
          away_score?: number | null
          away_subs_requested?: boolean | null
          away_subs_requested_at?: string | null
          away_team_id?: string
          away_verification_token?: string | null
          away_verified_at?: string | null
          away_verified_by_owner?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period?: number | null
          game_ended_at?: string | null
          game_number?: number | null
          game_started_at?: string | null
          generation_log_id?: string | null
          home_captain_verified?: boolean | null
          home_contested_at?: string | null
          home_contested_reason?: string | null
          home_contested_stats?: Json | null
          home_score?: number | null
          home_subs_requested?: boolean | null
          home_subs_requested_at?: string | null
          home_team_id?: string
          home_verification_token?: string | null
          home_verified_at?: string | null
          home_verified_by_owner?: boolean | null
          id?: string
          is_rescheduled?: boolean | null
          league_id?: string
          location?: string | null
          original_scheduled_at?: string | null
          period_count?: number | null
          period_length_minutes?: number | null
          period_started_at?: string | null
          rescheduled_at?: string | null
          round_number?: number | null
          scheduled_at?: string
          scorekeeper_notes?: string | null
          scorekeeper_verified?: boolean | null
          scorekeeper_verified_at?: string | null
          scorekeeper_verified_by?: string | null
          season_id?: string
          stats_locked_at?: string | null
          stats_submitted_at?: string | null
          stats_submitted_by?: string | null
          stats_unlocked_at?: string | null
          status?: Database["public"]["Enums"]["game_status"] | null
          unlock_reason?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
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
            foreignKeyName: "games_generation_log_id_fkey"
            columns: ["generation_log_id"]
            isOneToOne: false
            referencedRelation: "schedule_generation_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
            referencedRelation: "league_branding"
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
            foreignKeyName: "games_scorekeeper_verified_by_fkey"
            columns: ["scorekeeper_verified_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "games_stats_submitted_by_fkey"
            columns: ["stats_submitted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "league_branding"
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
            foreignKeyName: "goalie_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
      league_billing_settings: {
        Row: {
          charges_enabled: boolean
          created_at: string
          created_by: string | null
          details_submitted: boolean
          id: string
          league_id: string
          payouts_enabled: boolean
          platform_fee_bps: number
          platform_fee_mode: string
          setup_fee_amount_cents: number
          setup_fee_currency: string
          setup_fee_paid_at: string | null
          setup_fee_status: string
          setup_fee_stripe_invoice_id: string | null
          setup_fee_waived_at: string | null
          setup_fee_waived_by: string | null
          setup_fee_waived_reason: string | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          stripe_onboarding_completed_at: string | null
          updated_at: string
        }
        Insert: {
          charges_enabled?: boolean
          created_at?: string
          created_by?: string | null
          details_submitted?: boolean
          id?: string
          league_id: string
          payouts_enabled?: boolean
          platform_fee_bps?: number
          platform_fee_mode?: string
          setup_fee_amount_cents?: number
          setup_fee_currency?: string
          setup_fee_paid_at?: string | null
          setup_fee_status?: string
          setup_fee_stripe_invoice_id?: string | null
          setup_fee_waived_at?: string | null
          setup_fee_waived_by?: string | null
          setup_fee_waived_reason?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_onboarding_completed_at?: string | null
          updated_at?: string
        }
        Update: {
          charges_enabled?: boolean
          created_at?: string
          created_by?: string | null
          details_submitted?: boolean
          id?: string
          league_id?: string
          payouts_enabled?: boolean
          platform_fee_bps?: number
          platform_fee_mode?: string
          setup_fee_amount_cents?: number
          setup_fee_currency?: string
          setup_fee_paid_at?: string | null
          setup_fee_status?: string
          setup_fee_stripe_invoice_id?: string | null
          setup_fee_waived_at?: string | null
          setup_fee_waived_by?: string | null
          setup_fee_waived_reason?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          stripe_onboarding_completed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_billing_settings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_billing_settings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_billing_settings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: true
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_join_requests: {
        Row: {
          created_at: string | null
          id: string
          league_id: string
          message: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          league_id: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          league_id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_join_requests_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_join_requests_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_join_requests_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "league_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_memberships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
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
          {
            foreignKeyName: "league_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_ownerships: {
        Row: {
          created_at: string | null
          id: string
          league_id: string
          organization_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          league_id: string
          organization_id: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          league_id?: string
          organization_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_ownerships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_ownerships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_ownerships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_ownerships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_daily_revenue"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "league_ownerships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_game_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "league_ownerships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_registration_funnel"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "league_ownerships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_user_role_counts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "league_ownerships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "league_scorekeepers_scorekeeper_id_fkey"
            columns: ["scorekeeper_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
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
      league_waiver_templates: {
        Row: {
          content: string
          content_hash: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          league_id: string
          title: string
          updated_at: string | null
          version: string
        }
        Insert: {
          content: string
          content_hash: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          league_id: string
          title?: string
          updated_at?: string | null
          version?: string
        }
        Update: {
          content?: string
          content_hash?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          league_id?: string
          title?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_waiver_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_waiver_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_waiver_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_waiver_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_waiver_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          accent_color: string | null
          address: string | null
          banner_url: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          custom_css: string | null
          custom_domain: string | null
          custom_domain_verified: boolean | null
          description: string | null
          domain_verification_token: string | null
          favicon_url: string | null
          font_family: string | null
          id: string
          is_public: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          organization_id: string | null
          owner_id: string | null
          payment_mode: string | null
          postal_code: string | null
          primary_color: string | null
          registration_url: string | null
          search_keywords: string[] | null
          secondary_color: string | null
          settings: Json | null
          slug: string
          sport: string | null
          state_province: string | null
          status: string | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          subdomain: string | null
          subscription_status: string | null
          subscription_tier: string | null
          tagline: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          banner_url?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          description?: string | null
          domain_verification_token?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          organization_id?: string | null
          owner_id?: string | null
          payment_mode?: string | null
          postal_code?: string | null
          primary_color?: string | null
          registration_url?: string | null
          search_keywords?: string[] | null
          secondary_color?: string | null
          settings?: Json | null
          slug: string
          sport?: string | null
          state_province?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          subdomain?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tagline?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          banner_url?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          description?: string | null
          domain_verification_token?: string | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          organization_id?: string | null
          owner_id?: string | null
          payment_mode?: string | null
          postal_code?: string | null
          primary_color?: string | null
          registration_url?: string | null
          search_keywords?: string[] | null
          secondary_color?: string | null
          settings?: Json | null
          slug?: string
          sport?: string | null
          state_province?: string | null
          status?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          subdomain?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tagline?: string | null
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
          {
            foreignKeyName: "leagues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leagues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_daily_revenue"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leagues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_game_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leagues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_registration_funnel"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leagues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_user_role_counts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leagues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leagues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leagues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "legacy_players_matched_to_profile_id_fkey"
            columns: ["matched_to_profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts_log: {
        Row: {
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_delivery_log: {
        Row: {
          attempt_number: number
          attempted_at: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          id: string
          notification_id: string
          provider: string
          provider_message_id: string | null
          provider_response: Json | null
          status: string
        }
        Insert: {
          attempt_number: number
          attempted_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          notification_id: string
          provider?: string
          provider_message_id?: string | null
          provider_response?: Json | null
          status: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string
          provider?: string
          provider_message_id?: string | null
          provider_response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          active: boolean | null
          body: string
          channel: string
          created_at: string | null
          created_by: string | null
          description: string | null
          html_body: string | null
          id: string
          league_id: string | null
          name: string
          required_variables: string[] | null
          subject: string | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          body: string
          channel: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_body?: string | null
          id?: string
          league_id?: string | null
          name: string
          required_variables?: string[] | null
          subject?: string | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          body?: string
          channel?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          html_body?: string | null
          id?: string
          league_id?: string | null
          name?: string
          required_variables?: string[] | null
          subject?: string | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          created_by: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          league_id: string
          max_retries: number | null
          next_retry_at: string | null
          priority: number | null
          processing_started_at: string | null
          provider_message_id: string | null
          provider_response: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          retention_expires_at: string | null
          retry_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_data: Json | null
          template_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string | null
          created_by?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          league_id: string
          max_retries?: number | null
          next_retry_at?: string | null
          priority?: number | null
          processing_started_at?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          retention_expires_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_data?: Json | null
          template_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          created_by?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          league_id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          priority?: number | null
          processing_started_at?: string | null
          provider_message_id?: string | null
          provider_response?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          retention_expires_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_data?: Json | null
          template_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_daily_revenue"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_game_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_registration_funnel"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_user_role_counts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscription_events: {
        Row: {
          amount_cents: number | null
          created_at: string | null
          created_by: string | null
          event_type: string
          from_status: string | null
          from_tier: string | null
          id: string
          metadata: Json | null
          organization_id: string
          stripe_event_id: string | null
          to_status: string | null
          to_tier: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          event_type: string
          from_status?: string | null
          from_tier?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          stripe_event_id?: string | null
          to_status?: string | null
          to_tier?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          from_status?: string | null
          from_tier?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          stripe_event_id?: string | null
          to_status?: string | null
          to_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscription_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscription_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_daily_revenue"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_game_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_registration_funnel"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "mv_org_user_role_counts"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_cycle_anchor: number | null
          cancel_at_period_end: boolean | null
          cancellation_reason: string | null
          cancelled_at: string | null
          coupon_id: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          custom_domain: string | null
          custom_domain_verified: boolean
          default_payment_method_id: string | null
          discount_end_at: string | null
          id: string
          last_stripe_event_timestamp: number | null
          name: string
          owner_user_id: string
          payment_method_brand: string | null
          payment_method_last4: string | null
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_created_at: string | null
          subscription_metadata: Json | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          subscription_version: number
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle_anchor?: number | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          coupon_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean
          default_payment_method_id?: string | null
          discount_end_at?: string | null
          id?: string
          last_stripe_event_timestamp?: number | null
          name: string
          owner_user_id: string
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_created_at?: string | null
          subscription_metadata?: Json | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          subscription_version?: number
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle_anchor?: number | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          coupon_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean
          default_payment_method_id?: string | null
          discount_end_at?: string | null
          id?: string
          last_stripe_event_timestamp?: number | null
          name?: string
          owner_user_id?: string
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_created_at?: string | null
          subscription_metadata?: Json | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          subscription_version?: number
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      password_reset_log: {
        Row: {
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          initiated_by: string | null
          ip_address: string | null
          reset_type: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          initiated_by?: string | null
          ip_address?: string | null
          reset_type: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          initiated_by?: string | null
          ip_address?: string | null
          reset_type?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          identifier: string
          identifier_type: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          identifier: string
          identifier_type: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          identifier?: string
          identifier_type?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          application_fee_cents: number | null
          completed_at: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          idempotency_key: string | null
          installment_number: number | null
          metadata: Json | null
          player_payment_id: string
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          transaction_type: Database["public"]["Enums"]["payment_transaction_type"]
        }
        Insert: {
          amount_cents: number
          application_fee_cents?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          installment_number?: number | null
          metadata?: Json | null
          player_payment_id: string
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          transaction_type: Database["public"]["Enums"]["payment_transaction_type"]
        }
        Update: {
          amount_cents?: number
          application_fee_cents?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          installment_number?: number | null
          metadata?: Json | null
          player_payment_id?: string
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          transaction_type?: Database["public"]["Enums"]["payment_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_player_payment_id_fkey"
            columns: ["player_payment_id"]
            isOneToOne: false
            referencedRelation: "player_payments"
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
          team_id: string | null
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
          team_id?: string | null
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
          team_id?: string | null
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
            foreignKeyName: "payments_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
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
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fee_config: {
        Row: {
          created_at: string
          description: string | null
          effective_from: string
          id: string
          is_active: boolean
          migration_fee_cents: number
          migration_fee_label: string
          processing_fee_percent: number
          setup_fee_cents: number
          setup_fee_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          effective_from?: string
          id?: string
          is_active?: boolean
          migration_fee_cents?: number
          migration_fee_label?: string
          processing_fee_percent?: number
          setup_fee_cents?: number
          setup_fee_label?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          effective_from?: string
          id?: string
          is_active?: boolean
          migration_fee_cents?: number
          migration_fee_label?: string
          processing_fee_percent?: number
          setup_fee_cents?: number
          setup_fee_label?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "player_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_approvals_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
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
          {
            foreignKeyName: "player_approvals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "player_availability_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
            foreignKeyName: "player_goalie_matchups_goalie_id_fkey"
            columns: ["goalie_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_goalie_matchups_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
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
            foreignKeyName: "player_goalie_matchups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
      player_payment_audit_log: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          league_id: string
          payload: Json
          player_payment_id: string | null
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          league_id: string
          payload?: Json
          player_payment_id?: string | null
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          league_id?: string
          payload?: Json
          player_payment_id?: string | null
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_payment_audit_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payment_audit_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payment_audit_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payment_audit_log_player_payment_id_fkey"
            columns: ["player_payment_id"]
            isOneToOne: false
            referencedRelation: "player_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      player_payments: {
        Row: {
          amount_paid_cents: number
          base_amount_cents: number
          created_at: string
          currency: string
          current_installment: number | null
          discount_cents: number
          id: string
          installment_fee_cents: number
          last_reminder_sent_at: string | null
          late_fee_cents: number
          league_id: string
          metadata: Json | null
          next_payment_date: string | null
          notes: string | null
          paid_at: string | null
          payment_plan: Database["public"]["Enums"]["payment_plan_type"]
          player_id: string
          reminder_sent_count: number
          season_fee_id: string
          season_id: string
          status: Database["public"]["Enums"]["player_payment_status"]
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          team_id: string | null
          total_amount_cents: number | null
          total_installments: number | null
          updated_at: string
        }
        Insert: {
          amount_paid_cents?: number
          base_amount_cents: number
          created_at?: string
          currency?: string
          current_installment?: number | null
          discount_cents?: number
          id?: string
          installment_fee_cents?: number
          last_reminder_sent_at?: string | null
          late_fee_cents?: number
          league_id: string
          metadata?: Json | null
          next_payment_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_plan?: Database["public"]["Enums"]["payment_plan_type"]
          player_id: string
          reminder_sent_count?: number
          season_fee_id: string
          season_id: string
          status?: Database["public"]["Enums"]["player_payment_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string | null
          total_amount_cents?: number | null
          total_installments?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid_cents?: number
          base_amount_cents?: number
          created_at?: string
          currency?: string
          current_installment?: number | null
          discount_cents?: number
          id?: string
          installment_fee_cents?: number
          last_reminder_sent_at?: string | null
          late_fee_cents?: number
          league_id?: string
          metadata?: Json | null
          next_payment_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_plan?: Database["public"]["Enums"]["payment_plan_type"]
          player_id?: string
          reminder_sent_count?: number
          season_fee_id?: string
          season_id?: string
          status?: Database["public"]["Enums"]["player_payment_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string | null
          total_amount_cents?: number | null
          total_installments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_season_fee_id_fkey"
            columns: ["season_fee_id"]
            isOneToOne: false
            referencedRelation: "season_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "player_ratings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "league_branding"
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
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
      player_waivers: {
        Row: {
          agreed_at: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          league_id: string
          player_id: string
          season_id: string | null
          signature_data: string
          signature_type: Database["public"]["Enums"]["signature_type_enum"]
          signed_name: string
          user_agent: string | null
          waiver_content_hash: string
          waiver_version: string
        }
        Insert: {
          agreed_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          league_id: string
          player_id: string
          season_id?: string | null
          signature_data: string
          signature_type?: Database["public"]["Enums"]["signature_type_enum"]
          signed_name: string
          user_agent?: string | null
          waiver_content_hash: string
          waiver_version?: string
        }
        Update: {
          agreed_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          league_id?: string
          player_id?: string
          season_id?: string | null
          signature_data?: string
          signature_type?: Database["public"]["Enums"]["signature_type_enum"]
          signed_name?: string
          user_agent?: string | null
          waiver_content_hash?: string
          waiver_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_waivers_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_waivers_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_waivers_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_waivers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_waivers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_waivers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability: string | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          deleted_at: string | null
          deletion_ip_address: string | null
          deletion_reason: string | null
          deletion_requested_at: string | null
          deletion_scheduled_for: string | null
          deletion_user_agent: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship:
            | Database["public"]["Enums"]["emergency_contact_relationship_enum"]
            | null
          failed_login_attempts: number | null
          full_name: string | null
          id: string
          is_platform_admin: boolean
          jersey_number: number | null
          last_failed_login_at: string | null
          locked_until: string | null
          medical_notes: string | null
          password_changed_at: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          province: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          security_answer_hash: string | null
          security_question: string | null
          shot_hand: string | null
          skill_level: string | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deletion_ip_address?: string | null
          deletion_reason?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          deletion_user_agent?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?:
            | Database["public"]["Enums"]["emergency_contact_relationship_enum"]
            | null
          failed_login_attempts?: number | null
          full_name?: string | null
          id: string
          is_platform_admin?: boolean
          jersey_number?: number | null
          last_failed_login_at?: string | null
          locked_until?: string | null
          medical_notes?: string | null
          password_changed_at?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          security_answer_hash?: string | null
          security_question?: string | null
          shot_hand?: string | null
          skill_level?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deletion_ip_address?: string | null
          deletion_reason?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          deletion_user_agent?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?:
            | Database["public"]["Enums"]["emergency_contact_relationship_enum"]
            | null
          failed_login_attempts?: number | null
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          jersey_number?: number | null
          last_failed_login_at?: string | null
          locked_until?: string | null
          medical_notes?: string | null
          password_changed_at?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          province?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          security_answer_hash?: string | null
          security_question?: string | null
          shot_hand?: string | null
          skill_level?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      registration_submissions: {
        Row: {
          amount_paid_cents: number | null
          assigned_jersey_number: number | null
          assigned_team_id: string | null
          created_at: string | null
          draft_data: Json | null
          draft_step: number | null
          id: string
          league_id: string
          payment_status: string | null
          photo_url: string | null
          player_id: string
          preferred_jersey_number: number | null
          preferred_position:
            | Database["public"]["Enums"]["player_position_enum"]
            | null
          previous_leagues: string | null
          registration_type: Database["public"]["Enums"]["registration_type_enum"]
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          season_id: string
          secondary_position:
            | Database["public"]["Enums"]["player_position_enum"]
            | null
          self_assessed_skill:
            | Database["public"]["Enums"]["skill_level_enum"]
            | null
          status: Database["public"]["Enums"]["registration_status_enum"]
          stripe_payment_intent_id: string | null
          submitted_at: string | null
          team_id: string | null
          updated_at: string | null
          waiver_id: string | null
          years_experience: number | null
        }
        Insert: {
          amount_paid_cents?: number | null
          assigned_jersey_number?: number | null
          assigned_team_id?: string | null
          created_at?: string | null
          draft_data?: Json | null
          draft_step?: number | null
          id?: string
          league_id: string
          payment_status?: string | null
          photo_url?: string | null
          player_id: string
          preferred_jersey_number?: number | null
          preferred_position?:
            | Database["public"]["Enums"]["player_position_enum"]
            | null
          previous_leagues?: string | null
          registration_type: Database["public"]["Enums"]["registration_type_enum"]
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          season_id: string
          secondary_position?:
            | Database["public"]["Enums"]["player_position_enum"]
            | null
          self_assessed_skill?:
            | Database["public"]["Enums"]["skill_level_enum"]
            | null
          status?: Database["public"]["Enums"]["registration_status_enum"]
          stripe_payment_intent_id?: string | null
          submitted_at?: string | null
          team_id?: string | null
          updated_at?: string | null
          waiver_id?: string | null
          years_experience?: number | null
        }
        Update: {
          amount_paid_cents?: number | null
          assigned_jersey_number?: number | null
          assigned_team_id?: string | null
          created_at?: string | null
          draft_data?: Json | null
          draft_step?: number | null
          id?: string
          league_id?: string
          payment_status?: string | null
          photo_url?: string | null
          player_id?: string
          preferred_jersey_number?: number | null
          preferred_position?:
            | Database["public"]["Enums"]["player_position_enum"]
            | null
          previous_leagues?: string | null
          registration_type?: Database["public"]["Enums"]["registration_type_enum"]
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          season_id?: string
          secondary_position?:
            | Database["public"]["Enums"]["player_position_enum"]
            | null
          self_assessed_skill?:
            | Database["public"]["Enums"]["skill_level_enum"]
            | null
          status?: Database["public"]["Enums"]["registration_status_enum"]
          stripe_payment_intent_id?: string | null
          submitted_at?: string | null
          team_id?: string | null
          updated_at?: string | null
          waiver_id?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_submissions_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "registration_submissions_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "registration_submissions_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "registration_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "registration_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_submissions_waiver_id_fkey"
            columns: ["waiver_id"]
            isOneToOne: false
            referencedRelation: "player_waivers"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_constraints: {
        Row: {
          constraint_type: string
          created_at: string | null
          created_by: string | null
          day_of_week: number | null
          end_date: string | null
          end_time: string | null
          id: string
          is_hard_constraint: boolean | null
          league_id: string
          notes: string | null
          opponent_team_id: string | null
          priority: number | null
          season_id: string
          start_date: string | null
          start_time: string | null
          team_id: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          constraint_type: string
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_hard_constraint?: boolean | null
          league_id: string
          notes?: string | null
          opponent_team_id?: string | null
          priority?: number | null
          season_id: string
          start_date?: string | null
          start_time?: string | null
          team_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          constraint_type?: string
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_hard_constraint?: boolean | null
          league_id?: string
          notes?: string | null
          opponent_team_id?: string | null
          priority?: number | null
          season_id?: string
          start_date?: string | null
          start_time?: string | null
          team_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_constraints_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_constraints_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_constraints_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_constraints_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "schedule_constraints_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "schedule_constraints_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_constraints_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_constraints_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "schedule_constraints_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "schedule_constraints_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_constraints_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_generation_log: {
        Row: {
          algorithm_type: string | null
          completed_at: string | null
          constraint_violations: Json | null
          created_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          games_generated: number | null
          generated_by: string | null
          hard_constraint_failures: Json | null
          id: string
          league_id: string
          season_id: string
          started_at: string | null
          status: string
          team_count: number
          template_id: string | null
        }
        Insert: {
          algorithm_type?: string | null
          completed_at?: string | null
          constraint_violations?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          games_generated?: number | null
          generated_by?: string | null
          hard_constraint_failures?: Json | null
          id?: string
          league_id: string
          season_id: string
          started_at?: string | null
          status?: string
          team_count: number
          template_id?: string | null
        }
        Update: {
          algorithm_type?: string | null
          completed_at?: string | null
          constraint_violations?: Json | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          games_generated?: number | null
          generated_by?: string | null
          hard_constraint_failures?: Json | null
          id?: string
          league_id?: string
          season_id?: string
          started_at?: string | null
          status?: string
          team_count?: number
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_generation_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_generation_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_generation_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_generation_log_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_generation_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          allow_back_to_back: boolean
          created_at: string | null
          created_by: string | null
          default_game_days: Json | null
          default_game_duration_minutes: number | null
          default_game_times: Json | null
          default_venue_id: string | null
          description: string | null
          division_games_ratio: number | null
          games_per_team: number
          home_away_balance: boolean
          id: string
          is_default: boolean | null
          league_id: string
          name: string
          rotate_home_venue: boolean | null
          schedule_type: string
          updated_at: string | null
        }
        Insert: {
          allow_back_to_back?: boolean
          created_at?: string | null
          created_by?: string | null
          default_game_days?: Json | null
          default_game_duration_minutes?: number | null
          default_game_times?: Json | null
          default_venue_id?: string | null
          description?: string | null
          division_games_ratio?: number | null
          games_per_team?: number
          home_away_balance?: boolean
          id?: string
          is_default?: boolean | null
          league_id: string
          name: string
          rotate_home_venue?: boolean | null
          schedule_type?: string
          updated_at?: string | null
        }
        Update: {
          allow_back_to_back?: boolean
          created_at?: string | null
          created_by?: string | null
          default_game_days?: Json | null
          default_game_duration_minutes?: number | null
          default_game_times?: Json | null
          default_venue_id?: string | null
          description?: string | null
          division_games_ratio?: number | null
          games_per_team?: number
          home_away_balance?: boolean
          id?: string
          is_default?: boolean | null
          league_id?: string
          name?: string
          rotate_home_venue?: boolean | null
          schedule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_default_venue_id_fkey"
            columns: ["default_venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_templates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      scorekeeper_sessions: {
        Row: {
          access_count: number | null
          created_at: string | null
          created_by: string
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          device_info: Json | null
          expires_at: string
          game_id: string
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          league_id: string
          scorekeeper_id: string | null
          token: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          created_by: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          device_info?: Json | null
          expires_at: string
          game_id: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          league_id: string
          scorekeeper_id?: string | null
          token: string
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          device_info?: Json | null
          expires_at?: string
          game_id?: string
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          league_id?: string
          scorekeeper_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorekeeper_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorekeeper_sessions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorekeeper_sessions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorekeeper_sessions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      season_fees: {
        Row: {
          allow_full_payment: boolean
          allow_three_pay: boolean
          allow_two_pay: boolean
          amount_cents: number
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          early_bird_deadline: string | null
          early_bird_discount_cents: number | null
          id: string
          installment_fee_cents: number | null
          is_active: boolean
          late_fee_cents: number | null
          league_id: string
          name: string
          payment_deadline: string | null
          season_id: string
          updated_at: string
        }
        Insert: {
          allow_full_payment?: boolean
          allow_three_pay?: boolean
          allow_two_pay?: boolean
          amount_cents: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          early_bird_deadline?: string | null
          early_bird_discount_cents?: number | null
          id?: string
          installment_fee_cents?: number | null
          is_active?: boolean
          late_fee_cents?: number | null
          league_id: string
          name: string
          payment_deadline?: string | null
          season_id: string
          updated_at?: string
        }
        Update: {
          allow_full_payment?: boolean
          allow_three_pay?: boolean
          allow_two_pay?: boolean
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          early_bird_deadline?: string | null
          early_bird_discount_cents?: number | null
          id?: string
          installment_fee_cents?: number | null
          is_active?: boolean
          late_fee_cents?: number | null
          league_id?: string
          name?: string
          payment_deadline?: string | null
          season_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_fees_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_fees_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_fees_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_fees_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "season_opt_ins_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          game_duration_minutes: number | null
          game_times: Json | null
          games_per_cycle: number | null
          id: string
          league_id: string
          max_players_per_team: number | null
          name: string
          period_count: number | null
          period_length_minutes: number | null
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
          game_duration_minutes?: number | null
          game_times?: Json | null
          games_per_cycle?: number | null
          id?: string
          league_id: string
          max_players_per_team?: number | null
          name: string
          period_count?: number | null
          period_length_minutes?: number | null
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
          game_duration_minutes?: number | null
          game_times?: Json | null
          games_per_cycle?: number | null
          id?: string
          league_id?: string
          max_players_per_team?: number | null
          name?: string
          period_count?: number | null
          period_length_minutes?: number | null
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
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
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
            referencedRelation: "league_branding"
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
      standings_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          league_id: string
          playoff_teams_per_division: number | null
          playoff_teams_total: number | null
          points_loss: number
          points_tie: number
          points_win: number
          season_id: string
          show_goal_diff: boolean | null
          show_home_away_split: boolean | null
          show_last_10: boolean | null
          show_streak: boolean | null
          tiebreakers: Json
          updated_at: string | null
          use_division_playoffs: boolean | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          league_id: string
          playoff_teams_per_division?: number | null
          playoff_teams_total?: number | null
          points_loss?: number
          points_tie?: number
          points_win?: number
          season_id: string
          show_goal_diff?: boolean | null
          show_home_away_split?: boolean | null
          show_last_10?: boolean | null
          show_streak?: boolean | null
          tiebreakers?: Json
          updated_at?: string | null
          use_division_playoffs?: boolean | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          league_id?: string
          playoff_teams_per_division?: number | null
          playoff_teams_total?: number | null
          points_loss?: number
          points_tie?: number
          points_win?: number
          season_id?: string
          show_goal_diff?: boolean | null
          show_home_away_split?: boolean | null
          show_last_10?: boolean | null
          show_streak?: boolean | null
          tiebreakers?: Json
          updated_at?: string | null
          use_division_playoffs?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "standings_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_config_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_config_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_config_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_config_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: true
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      stat_changes: {
        Row: {
          change_reason: string | null
          changed_by: string
          created_at: string | null
          game_id: string
          id: string
          new_value: Json | null
          old_value: Json | null
          stat_id: string | null
          stat_type: string
        }
        Insert: {
          change_reason?: string | null
          changed_by: string
          created_at?: string | null
          game_id: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          stat_id?: string | null
          stat_type: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string
          created_at?: string | null
          game_id?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          stat_id?: string | null
          stat_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stat_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stat_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stat_changes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      stat_disputes: {
        Row: {
          created_at: string | null
          description: string
          disputed_by_team_id: string
          disputed_stat_id: string | null
          disputed_stat_type: string
          game_id: string
          id: string
          resolution_notes: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          disputed_by_team_id: string
          disputed_stat_id?: string | null
          disputed_stat_type: string
          game_id: string
          id?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          disputed_by_team_id?: string
          disputed_stat_id?: string | null
          disputed_stat_type?: string
          game_id?: string
          id?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stat_disputes_disputed_by_team_id_fkey"
            columns: ["disputed_by_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "stat_disputes_disputed_by_team_id_fkey"
            columns: ["disputed_by_team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "stat_disputes_disputed_by_team_id_fkey"
            columns: ["disputed_by_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stat_disputes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stat_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stat_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_audit_log: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          league_id: string
          payload: Json
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          league_id: string
          payload?: Json
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          league_id?: string
          payload?: Json
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connect_audit_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_connect_audit_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_connect_audit_log_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_payments: {
        Row: {
          amount_cents: number
          application_fee_cents: number
          created_at: string
          currency: string
          customer_email: string | null
          description: string | null
          id: string
          league_id: string
          metadata: Json | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          application_fee_cents: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          description?: string | null
          id?: string
          league_id: string
          metadata?: Json | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          application_fee_cents?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          description?: string | null
          id?: string
          league_id?: string
          metadata?: Json | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connect_payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_connect_payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_connect_payments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string
          status: string
        }
        Insert: {
          event_type: string
          id: string
          processed_at?: string
          status?: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string
          status?: string
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
            foreignKeyName: "suspensions_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
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
          {
            foreignKeyName: "suspensions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "team_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "team_join_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "team_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
      team_messages: {
        Row: {
          created_at: string | null
          id: string
          is_urgent: boolean | null
          message: string
          message_type: string | null
          season_id: string | null
          sent_by: string
          subject: string | null
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          message: string
          message_type?: string | null
          season_id?: string | null
          sent_by: string
          subject?: string | null
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_urgent?: boolean | null
          message?: string
          message_type?: string | null
          season_id?: string | null
          sent_by?: string
          subject?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_rosters: {
        Row: {
          division_id: string | null
          end_date: string | null
          id: string
          is_goalie: boolean | null
          jersey_number: number | null
          joined_at: string | null
          leadership_role: Database["public"]["Enums"]["leadership_role"] | null
          league_id: string
          notes: string | null
          player_id: string
          position: Database["public"]["Enums"]["player_position"] | null
          season_id: string
          start_date: string
          status: Database["public"]["Enums"]["roster_status"]
          team_id: string
          updated_at: string | null
        }
        Insert: {
          division_id?: string | null
          end_date?: string | null
          id?: string
          is_goalie?: boolean | null
          jersey_number?: number | null
          joined_at?: string | null
          leadership_role?:
            | Database["public"]["Enums"]["leadership_role"]
            | null
          league_id: string
          notes?: string | null
          player_id: string
          position?: Database["public"]["Enums"]["player_position"] | null
          season_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["roster_status"]
          team_id: string
          updated_at?: string | null
        }
        Update: {
          division_id?: string | null
          end_date?: string | null
          id?: string
          is_goalie?: boolean | null
          jersey_number?: number | null
          joined_at?: string | null
          leadership_role?:
            | Database["public"]["Enums"]["leadership_role"]
            | null
          league_id?: string
          notes?: string | null
          player_id?: string
          position?: Database["public"]["Enums"]["player_position"] | null
          season_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["roster_status"]
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_rosters_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_rosters_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "team_rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
      team_staff: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean
          league_id: string
          notes: string | null
          role: Database["public"]["Enums"]["team_staff_role"]
          season_id: string
          start_date: string
          team_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          league_id: string
          notes?: string | null
          role: Database["public"]["Enums"]["team_staff_role"]
          season_id: string
          start_date?: string
          team_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          league_id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["team_staff_role"]
          season_id?: string
          start_date?: string
          team_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_staff_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_staff_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_staff_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_staff_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_staff_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_staff_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_staff_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          division_id: string | null
          home_venue_id: string | null
          id: string
          league_id: string
          logo_url: string | null
          max_roster_size: number | null
          name: string
          notes: string | null
          primary_color: string | null
          secondary_color: string | null
          short_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          captain_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          division_id?: string | null
          home_venue_id?: string | null
          id?: string
          league_id: string
          logo_url?: string | null
          max_roster_size?: number | null
          name: string
          notes?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          short_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          captain_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          division_id?: string | null
          home_venue_id?: string | null
          id?: string
          league_id?: string
          logo_url?: string | null
          max_roster_size?: number | null
          name?: string
          notes?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          short_name?: string
          status?: string | null
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
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
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
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
          },
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
            referencedRelation: "league_branding"
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
            foreignKeyName: "trade_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_players_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "standings_calculated"
            referencedColumns: ["team_id"]
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
            foreignKeyName: "trades_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
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
            foreignKeyName: "trades_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
      user_consents: {
        Row: {
          consent_type: string
          created_at: string | null
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          consent_type: string
          created_at?: string | null
          granted: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          created_at?: string | null
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          email_billing: boolean | null
          email_draft: boolean | null
          email_enabled: boolean | null
          email_game_updates: boolean | null
          email_marketing: boolean | null
          email_registration: boolean | null
          id: string
          phone_number: string | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          sms_game_updates: boolean | null
          sms_urgent_only: boolean | null
          timezone: string | null
          unsubscribe_token: string | null
          unsubscribe_token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_billing?: boolean | null
          email_draft?: boolean | null
          email_enabled?: boolean | null
          email_game_updates?: boolean | null
          email_marketing?: boolean | null
          email_registration?: boolean | null
          id?: string
          phone_number?: string | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          sms_game_updates?: boolean | null
          sms_urgent_only?: boolean | null
          timezone?: string | null
          unsubscribe_token?: string | null
          unsubscribe_token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_billing?: boolean | null
          email_draft?: boolean | null
          email_enabled?: boolean | null
          email_game_updates?: boolean | null
          email_marketing?: boolean | null
          email_registration?: boolean | null
          id?: string
          phone_number?: string | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          sms_game_updates?: boolean | null
          sms_urgent_only?: boolean | null
          timezone?: string | null
          unsubscribe_token?: string | null
          unsubscribe_token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          last_active: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          last_active?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_active?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "goalie_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
      league_branding: {
        Row: {
          accent_color: string | null
          banner_url: string | null
          custom_css: string | null
          custom_domain: string | null
          custom_domain_verified: boolean | null
          favicon_url: string | null
          font_family: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string | null
          status: string | null
          subdomain: string | null
          tagline: string | null
        }
        Insert: {
          accent_color?: string | null
          banner_url?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          status?: string | null
          subdomain?: string | null
          tagline?: string | null
        }
        Update: {
          accent_color?: string | null
          banner_url?: string | null
          custom_css?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          favicon_url?: string | null
          font_family?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string | null
          status?: string | null
          subdomain?: string | null
          tagline?: string | null
        }
        Relationships: []
      }
      mv_org_daily_revenue: {
        Row: {
          failed_payment_count: number | null
          failed_revenue_cents: number | null
          organization_id: string | null
          payment_count: number | null
          platform_fee_cents: number | null
          revenue_date: string | null
          total_revenue_cents: number | null
        }
        Relationships: []
      }
      mv_org_game_stats: {
        Row: {
          cancelled_count: number | null
          completed_count: number | null
          game_date: string | null
          in_progress_count: number | null
          organization_id: string | null
          overdue_count: number | null
          total_scheduled: number | null
        }
        Relationships: []
      }
      mv_org_registration_funnel: {
        Row: {
          organization_id: string | null
          paid_registrations: number | null
          roster_assigned: number | null
          signup_date: string | null
          total_signups: number | null
        }
        Relationships: []
      }
      mv_org_user_role_counts: {
        Row: {
          active_players: number | null
          admins: number | null
          captains: number | null
          organization_id: string | null
          scorekeepers: number | null
          staff_members: number | null
        }
        Relationships: []
      }
      notification_analytics: {
        Row: {
          channel: string | null
          count: number | null
          league_id: string | null
          sent_date: string | null
          status: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "public_leagues"
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
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          position: string | null
          skill_level: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          position?: string | null
          skill_level?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          position?: string | null
          skill_level?: string | null
        }
        Relationships: []
      }
      standings_calculated: {
        Row: {
          away_games: number | null
          away_losses: number | null
          away_record: string | null
          away_wins: number | null
          calculated_at: string | null
          division_id: string | null
          games_played: number | null
          goal_diff: number | null
          goals_against: number | null
          goals_for: number | null
          home_games: number | null
          home_losses: number | null
          home_record: string | null
          home_wins: number | null
          league_id: string | null
          logo_url: string | null
          losses: number | null
          points: number | null
          season_id: string | null
          short_name: string | null
          team_id: string | null
          team_name: string | null
          ties: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "games_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "league_branding"
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
            foreignKeyName: "games_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
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
      acquire_schedule_lock: { Args: { p_season_id: string }; Returns: boolean }
      add_user_to_league_on_signup: {
        Args: { p_league_id: string; p_role?: string; p_user_id: string }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      admin_initiate_password_reset: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      admin_unlock_account: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      advance_draft_pick: { Args: { p_draft_id: string }; Returns: boolean }
      anonymize_audit_logs: { Args: { p_user_id: string }; Returns: number }
      anonymize_notification_for_retention: {
        Args: { notification_id: string }
        Returns: undefined
      }
      anonymize_payment_history: {
        Args: { p_stripe_customer_id: string; p_user_id: string }
        Returns: number
      }
      auto_pick_player: { Args: { p_draft_id: string }; Returns: Json }
      calculate_installment_amount: {
        Args: {
          p_installment_number: number
          p_total_amount_cents: number
          p_total_installments: number
        }
        Returns: number
      }
      calculate_season_stats: {
        Args: { season_uuid: string }
        Returns: undefined
      }
      calculate_standings: {
        Args: { p_season_id: string }
        Returns: {
          away_record: string
          division_id: string
          games_played: number
          goal_diff: number
          goals_against: number
          goals_for: number
          home_record: string
          is_playoff_spot: boolean
          logo_url: string
          losses: number
          points: number
          rank: number
          short_name: string
          team_id: string
          team_name: string
          ties: number
          wins: number
        }[]
      }
      can_manage_team_roster: { Args: { p_team_id: string }; Returns: boolean }
      check_password_reset_rate_limit: {
        Args: {
          p_identifier: string
          p_max_requests?: number
          p_type: string
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          reset_at: string
        }[]
      }
      claim_pending_notifications: {
        Args: { p_batch_size?: number; p_worker_id?: string }
        Returns: string[]
      }
      claim_retry_notifications: {
        Args: { p_batch_size?: number }
        Returns: string[]
      }
      cleanup_expired_notifications: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: number }
      cleanup_old_draft_leagues: { Args: never; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      cleanup_old_webhook_events: { Args: never; Returns: number }
      confirm_draft_roster: {
        Args: { p_draft_id: string; p_notes?: string; p_team_id: string }
        Returns: Json
      }
      confirm_user_email: { Args: { user_id: string }; Returns: undefined }
      create_default_waiver_for_league: {
        Args: { creator_id: string; target_league_id: string }
        Returns: string
      }
      create_scorekeeper_session: {
        Args: {
          p_expires_hours?: number
          p_game_id: string
          p_scorekeeper_id?: string
        }
        Returns: {
          expires_at: string
          session_id: string
          token: string
        }[]
      }
      delete_user_sessions: { Args: { p_user_id: string }; Returns: number }
      execute_account_deletion: { Args: { p_user_id: string }; Returns: Json }
      generate_round_robin_matchups: {
        Args: { p_double_round_robin?: boolean; p_team_ids: string[] }
        Returns: {
          away_team_id: string
          home_team_id: string
          round_number: number
        }[]
      }
      generate_scorekeeper_token: { Args: never; Returns: string }
      generate_verification_token: { Args: never; Returns: string }
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
      get_available_players: {
        Args: {
          p_draft_id: string
          p_limit?: number
          p_position?: string
          p_search?: string
        }
        Returns: {
          auto_pick_rank: number
          player_id: string
          player_name: string
          player_position: string
          skill_level: string
        }[]
      }
      get_captain_user_ids_for_game: {
        Args: { p_game_id: string }
        Returns: string[]
      }
      get_draft_results: { Args: { p_draft_id: string }; Returns: Json }
      get_draft_state: { Args: { p_draft_id: string }; Returns: Json }
      get_expired_draft_picks: {
        Args: never
        Returns: {
          draft_id: string
          expires_at: string
          pick: number
          round: number
          team_id: string
        }[]
      }
      get_game_events_for_scorekeeper: {
        Args: { p_game_id: string }
        Returns: {
          assist1_name: string
          assist1_player_id: string
          assist2_name: string
          assist2_player_id: string
          client_event_id: string
          deleted_at: string
          entered_at: string
          event_type: string
          event_version: number
          game_time_seconds: number
          id: string
          is_empty_net: boolean
          is_power_play: boolean
          is_short_handed: boolean
          penalty_minutes: number
          penalty_type: string
          period: number
          player_id: string
          player_jersey_number: number
          player_name: string
          sync_status: string
          team_id: string
          team_type: string
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
      get_league_billing_settings: {
        Args: { p_league_id: string }
        Returns: {
          charges_enabled: boolean
          league_id: string
          payouts_enabled: boolean
          platform_fee_bps: number
          platform_fee_mode: string
          setup_fee_amount_cents: number
          setup_fee_currency: string
          setup_fee_paid_at: string
          setup_fee_status: string
          stripe_account_id: string
          stripe_account_status: string
        }[]
      }
      get_league_by_hostname: {
        Args: { hostname: string }
        Returns: {
          accent_color: string
          custom_css: string
          custom_domain: string
          custom_domain_verified: boolean
          favicon_url: string
          font_family: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          status: string
          subdomain: string
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
      get_league_members: {
        Args: { check_league_id: string }
        Returns: {
          id: string
          joined_at: string
          league_id: string
          role: string
          status: string
          user_id: string
        }[]
      }
      get_league_pending_join_requests: {
        Args: { p_league_id: string }
        Returns: {
          availability: string
          city: string
          created_at: string
          id: string
          jersey_number: number
          message: string
          phone: string
          position: string
          province: string
          shot_hand: string
          skill_level: string
          user_email: string
          user_id: string
          user_name: string
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
      get_notification_analytics: {
        Args: {
          p_end_date?: string
          p_league_id?: string
          p_start_date?: string
        }
        Returns: {
          channel: string
          count: number
          league_id: string
          sent_date: string
          status: string
          type: string
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
      get_org_dashboard_summary: {
        Args: {
          p_end_date?: string
          p_organization_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_org_game_stats: {
        Args: {
          p_end_date?: string
          p_organization_id: string
          p_start_date?: string
        }
        Returns: {
          cancelled_count: number
          completed_count: number
          completion_rate: number
          game_date: string
          in_progress_count: number
          overdue_count: number
          total_scheduled: number
        }[]
      }
      get_org_health_score: {
        Args: { p_organization_id: string }
        Returns: {
          game_completion_score: number
          health_status: string
          insights: Json
          overall_score: number
          registration_conversion_score: number
          revenue_score: number
          user_engagement_score: number
        }[]
      }
      get_org_registration_funnel: {
        Args: {
          p_end_date?: string
          p_organization_id: string
          p_start_date?: string
        }
        Returns: {
          paid_registrations: number
          roster_assigned: number
          roster_to_paid_rate: number
          signup_date: string
          signup_to_roster_rate: number
          total_signups: number
        }[]
      }
      get_org_revenue_stats: {
        Args: {
          p_end_date?: string
          p_granularity?: string
          p_organization_id: string
          p_start_date?: string
        }
        Returns: {
          failed_payment_count: number
          failed_revenue_cents: number
          payment_count: number
          period_label: string
          period_start: string
          platform_fee_cents: number
          total_revenue_cents: number
        }[]
      }
      get_org_user_role_counts: {
        Args: { p_organization_id: string }
        Returns: {
          active_players: number
          admins: number
          captains: number
          scorekeepers: number
          staff_members: number
          total_users: number
        }[]
      }
      get_payment_summary: {
        Args: { p_league_id: string; p_season_id: string }
        Returns: {
          players_overdue: number
          players_paid_full: number
          players_partial: number
          players_pending: number
          total_collected_cents: number
          total_expected_cents: number
          total_outstanding_cents: number
        }[]
      }
      get_pending_registration_count: {
        Args: { check_league_id: string }
        Returns: number
      }
      get_platform_fee_config: {
        Args: never
        Returns: {
          migration_fee_cents: number
          migration_fee_label: string
          processing_fee_percent: number
          setup_fee_cents: number
          setup_fee_label: string
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
      get_public_leagues_for_join: {
        Args: never
        Returns: {
          city: string
          current_season_id: string
          current_season_name: string
          description: string
          id: string
          logo_url: string
          name: string
          primary_color: string
          province: string
          slug: string
          sport: string
          subdomain: string
          user_is_member: boolean
          user_request_status: string
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
      get_registration_summary: {
        Args: { check_league_id: string }
        Returns: {
          approved_count: number
          free_agents: number
          individual_registrations: number
          pending_count: number
          rejected_count: number
          team_registrations: number
          total_submissions: number
          waitlisted_count: number
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
      get_team_captain: {
        Args: { p_season_id: string; p_team_id: string }
        Returns: {
          full_name: string
          jersey_number: number
          player_id: string
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
      get_team_roster: {
        Args: { p_season_id?: string; p_team_id: string }
        Returns: {
          full_name: string
          jersey_number: number
          player_id: string
          player_leadership_role: Database["public"]["Enums"]["leadership_role"]
          player_position: Database["public"]["Enums"]["player_position"]
          start_date: string
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
      get_user_dashboard_data: { Args: { p_user_id: string }; Returns: Json }
      get_user_draft_league: {
        Args: { user_uuid: string }
        Returns: {
          city: string
          country: string
          created_at: string
          description: string
          id: string
          logo_url: string
          name: string
          organization_id: string
          primary_color: string
          secondary_color: string
          settings: Json
          slug: string
          state_province: string
          timezone: string
          updated_at: string
        }[]
      }
      get_user_league_ids: {
        Args: { user_uuid: string }
        Returns: {
          league_id: string
        }[]
      }
      get_user_league_join_status: {
        Args: { p_league_id: string; p_user_id: string }
        Returns: {
          created_at: string
          rejection_reason: string
          reviewed_at: string
          status: string
        }[]
      }
      get_user_league_role: {
        Args: { check_league_id: string; user_uuid: string }
        Returns: string
      }
      has_user_consent: {
        Args: { p_consent_type: string; p_user_id: string }
        Returns: boolean
      }
      hash_waiver_content: { Args: { content: string }; Returns: string }
      increment_failed_login_attempts: {
        Args: { user_email: string }
        Returns: {
          attempt_count: number
          is_locked: boolean
          locked_until_time: string
        }[]
      }
      increment_game_score: {
        Args: { p_game_id: string; p_team_type: string }
        Returns: undefined
      }
      is_account_locked: {
        Args: { user_email: string }
        Returns: {
          is_locked: boolean
          locked_until_time: string
          remaining_attempts: number
        }[]
      }
      is_jersey_available: {
        Args: {
          p_exclude_roster_id?: string
          p_jersey_number: number
          p_season_id: string
          p_team_id: string
        }
        Returns: boolean
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
      is_org_admin_or_owner: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      is_player_approved: {
        Args: { check_league_id: string; check_player_id: string }
        Returns: boolean
      }
      is_player_registered: {
        Args: {
          check_league_id: string
          check_player_id: string
          check_season_id: string
        }
        Returns: boolean
      }
      is_season_registration_open: {
        Args: { check_season_id: string }
        Returns: boolean
      }
      is_team_captain: { Args: { p_team_id: string }; Returns: boolean }
      is_team_roster_full: {
        Args: { check_season_id: string; check_team_id: string }
        Returns: boolean
      }
      is_webhook_event_processed: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      log_organization_subscription_event: {
        Args: {
          p_amount_cents?: number
          p_created_by?: string
          p_event_type: string
          p_from_status?: string
          p_from_tier?: string
          p_metadata?: Json
          p_organization_id: string
          p_stripe_event_id?: string
          p_to_status?: string
          p_to_tier?: string
        }
        Returns: string
      }
      make_draft_pick:
        | {
            Args: {
              p_draft_id: string
              p_player_id: string
              p_user_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_draft_id: string
              p_idempotency_key?: string
              p_player_id: string
              p_user_id?: string
            }
            Returns: Json
          }
      mark_notification_failed: {
        Args: {
          p_error_message: string
          p_notification_id: string
          p_provider_response?: Json
        }
        Returns: boolean
      }
      mark_notification_sent: {
        Args: {
          p_notification_id: string
          p_provider_message_id?: string
          p_provider_response?: Json
        }
        Returns: boolean
      }
      match_legacy_player_to_profile: {
        Args: { legacy_player_id: string; profile_id: string }
        Returns: undefined
      }
      pause_draft: { Args: { p_draft_id: string }; Returns: Json }
      refresh_dashboard_materialized_views: { Args: never; Returns: undefined }
      refresh_season_stats: { Args: never; Returns: undefined }
      refresh_standings: { Args: never; Returns: undefined }
      release_schedule_lock: { Args: { p_season_id: string }; Returns: boolean }
      reset_failed_login_attempts: {
        Args: { user_email: string }
        Returns: undefined
      }
      resume_draft: { Args: { p_draft_id: string }; Returns: Json }
      rollup_game_stats: { Args: { p_game_id: string }; Returns: undefined }
      save_schedule_games: {
        Args: {
          p_games: Json
          p_league_id: string
          p_log_id?: string
          p_season_id: string
        }
        Returns: {
          error_message: string
          games_created: number
          success: boolean
        }[]
      }
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
      setup_draft: {
        Args: {
          p_allow_trades?: boolean
          p_auto_pick_enabled?: boolean
          p_draft_type?: string
          p_league_id: string
          p_name: string
          p_pick_time_seconds?: number
          p_require_roster_confirmation?: boolean
          p_season_id: string
          p_total_rounds?: number
        }
        Returns: Json
      }
      signup_league_with_owner: {
        Args: {
          p_accent_color?: string
          p_description?: string
          p_league_name: string
          p_league_slug: string
          p_primary_color?: string
          p_secondary_color?: string
          p_sport: string
          p_subdomain: string
          p_user_email: string
          p_user_full_name: string
          p_user_id: string
        }
        Returns: {
          error_message: string
          league_id: string
          success: boolean
        }[]
      }
      start_draft: { Args: { p_draft_id: string }; Returns: Json }
      sync_game_event: {
        Args: {
          p_assist1_player_id?: string
          p_assist2_player_id?: string
          p_client_event_id: string
          p_created_offline?: boolean
          p_device_id?: string
          p_entered_by?: string
          p_event_type: string
          p_game_id: string
          p_game_time_seconds?: number
          p_is_empty_net?: boolean
          p_is_power_play?: boolean
          p_is_short_handed?: boolean
          p_league_id: string
          p_penalty_minutes?: number
          p_penalty_type?: string
          p_period: number
          p_player_id: string
          p_team_id: string
          p_team_type?: string
        }
        Returns: Json
      }
      trade_draft_pick: {
        Args: {
          p_draft_id: string
          p_from_team_id: string
          p_notes?: string
          p_round: number
          p_to_team_id: string
        }
        Returns: Json
      }
      undo_game_event: {
        Args: { p_deleted_by?: string; p_event_id: string }
        Returns: Json
      }
      undo_last_pick: { Args: { p_draft_id: string }; Returns: Json }
      unlock_game_stats: {
        Args: { p_game_id: string; p_reason: string; p_unlocked_by: string }
        Returns: boolean
      }
      update_payment_amount_atomic: {
        Args: {
          p_amount_to_add: number
          p_installment_increment?: number
          p_payment_id: string
        }
        Returns: {
          amount_paid_cents: number
          base_amount_cents: number
          created_at: string
          currency: string
          current_installment: number | null
          discount_cents: number
          id: string
          installment_fee_cents: number
          last_reminder_sent_at: string | null
          late_fee_cents: number
          league_id: string
          metadata: Json | null
          next_payment_date: string | null
          notes: string | null
          paid_at: string | null
          payment_plan: Database["public"]["Enums"]["payment_plan_type"]
          player_id: string
          reminder_sent_count: number
          season_fee_id: string
          season_id: string
          status: Database["public"]["Enums"]["player_payment_status"]
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          team_id: string | null
          total_amount_cents: number | null
          total_installments: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "player_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_has_league_access: {
        Args: { check_league_id: string; user_uuid: string }
        Returns: boolean
      }
      validate_captain_token: {
        Args: { p_token: string }
        Returns: {
          game_id: string
          is_valid: boolean
          team_type: string
        }[]
      }
      validate_scorekeeper_token: {
        Args: { p_token: string }
        Returns: {
          away_team_name: string
          expires_at: string
          game_id: string
          game_status: string
          home_team_name: string
          is_valid: boolean
          league_id: string
          scheduled_at: string
          session_id: string
        }[]
      }
      withdraw_consent: {
        Args: { p_consent_type: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      article_type:
        | "game_recap"
        | "weekly_wrap"
        | "draft_grades"
        | "announcement"
      draft_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "active"
        | "paused"
      emergency_contact_relationship_enum:
        | "parent"
        | "spouse"
        | "sibling"
        | "friend"
        | "other"
      game_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "pending_verification"
        | "cancelled"
        | "postponed"
      leadership_role: "captain" | "alternate_captain"
      opt_in_type: "full_time" | "call_up"
      payment_method: "cash" | "e_transfer" | "stripe" | "check" | "other"
      payment_plan_type: "full" | "two_pay" | "three_pay"
      payment_status: "pending" | "completed" | "refunded" | "failed"
      payment_transaction_type:
        | "payment"
        | "refund"
        | "installment"
        | "late_fee"
        | "adjustment"
      player_payment_status:
        | "pending"
        | "processing"
        | "paid"
        | "partially_paid"
        | "overdue"
        | "refunded"
        | "partially_refunded"
        | "cancelled"
        | "failed"
      player_position: "Forward" | "Defense" | "Goalie"
      player_position_enum: "Forward" | "Defense" | "Goalie"
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
      registration_status_enum:
        | "pending"
        | "approved"
        | "rejected"
        | "waitlisted"
        | "cancelled"
      registration_type: "draft" | "open_registration" | "captain_invite_only"
      registration_type_enum: "team_registration" | "free_agent" | "individual"
      roster_status: "active" | "inactive" | "suspended" | "injured" | "traded"
      season_status: "active" | "playoffs" | "completed" | "draft" | "archived"
      signature_type_enum: "drawn" | "typed"
      skill_level_enum: "beginner" | "intermediate" | "advanced" | "expert"
      team_staff_role:
        | "Head Coach"
        | "Assistant Coach"
        | "Manager"
        | "Trainer"
        | "Equipment Manager"
        | "Other"
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
  public: {
    Enums: {
      article_type: [
        "game_recap",
        "weekly_wrap",
        "draft_grades",
        "announcement",
      ],
      draft_status: ["pending", "in_progress", "completed", "active", "paused"],
      emergency_contact_relationship_enum: [
        "parent",
        "spouse",
        "sibling",
        "friend",
        "other",
      ],
      game_status: [
        "scheduled",
        "in_progress",
        "completed",
        "pending_verification",
        "cancelled",
        "postponed",
      ],
      leadership_role: ["captain", "alternate_captain"],
      opt_in_type: ["full_time", "call_up"],
      payment_method: ["cash", "e_transfer", "stripe", "check", "other"],
      payment_plan_type: ["full", "two_pay", "three_pay"],
      payment_status: ["pending", "completed", "refunded", "failed"],
      payment_transaction_type: [
        "payment",
        "refund",
        "installment",
        "late_fee",
        "adjustment",
      ],
      player_payment_status: [
        "pending",
        "processing",
        "paid",
        "partially_paid",
        "overdue",
        "refunded",
        "partially_refunded",
        "cancelled",
        "failed",
      ],
      player_position: ["Forward", "Defense", "Goalie"],
      player_position_enum: ["Forward", "Defense", "Goalie"],
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
      registration_status_enum: [
        "pending",
        "approved",
        "rejected",
        "waitlisted",
        "cancelled",
      ],
      registration_type: ["draft", "open_registration", "captain_invite_only"],
      registration_type_enum: ["team_registration", "free_agent", "individual"],
      roster_status: ["active", "inactive", "suspended", "injured", "traded"],
      season_status: ["active", "playoffs", "completed", "draft", "archived"],
      signature_type_enum: ["drawn", "typed"],
      skill_level_enum: ["beginner", "intermediate", "advanced", "expert"],
      team_staff_role: [
        "Head Coach",
        "Assistant Coach",
        "Manager",
        "Trainer",
        "Equipment Manager",
        "Other",
      ],
      user_role: ["owner", "captain", "player"],
    },
  },
} as const
