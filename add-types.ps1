$types = @"

// Convenience type exports
export type Draft = Database['public']['Tables']['drafts']['Row'];
export type DraftPick = Database['public']['Tables']['draft_picks']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type Season = Database['public']['Tables']['seasons']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type PlayerStats = Database['public']['Tables']['player_stats']['Row'];
export type GoalieStats = Database['public']['Tables']['goalie_stats']['Row'];
export type Article = Database['public']['Tables']['articles']['Row'];

// Enum type exports
export type SeasonStatus = Database['public']['Enums']['season_status'];
export type GameStatus = Database['public']['Enums']['game_status'];
export type DraftStatus = Database['public']['Enums']['draft_status'];
export type ArticleType = Database['public']['Enums']['article_type'];
export type PlayerRating = Database['public']['Enums']['player_rating'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type OptInType = Database['public']['Enums']['opt_in_type'];
export type UserRole = Database['public']['Enums']['user_role'];
"@

Add-Content -Path "src\types\database.ts" -Value $types -Encoding Unicode
