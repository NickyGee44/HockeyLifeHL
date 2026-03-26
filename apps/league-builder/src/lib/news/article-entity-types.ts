export interface ArticleEditorSeasonOption {
  id: string;
  name: string;
  status: string | null;
}

export interface ArticleEntityPlayerOption {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  teamName: string | null;
  divisionName: string | null;
  jerseyNumber: string | null;
}

export interface ArticleEntityTeamOption {
  id: string;
  name: string;
  slug: string | null;
  divisionName: string | null;
}

export interface ArticleEntityGameOption {
  id: string;
  scheduledAt: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  divisionName: string | null;
}

export interface ArticleEntitySelection {
  seasonId: string | null;
  linkedPlayerIds: string[];
  linkedTeamIds: string[];
  linkedGameIds: string[];
  primaryGameId: string | null;
}

export interface ArticleEntityEditorContext extends ArticleEntitySelection {
  seasons: ArticleEditorSeasonOption[];
  activeSeasonId: string | null;
  resolvedSeasonId: string | null;
  players: ArticleEntityPlayerOption[];
  teams: ArticleEntityTeamOption[];
  games: ArticleEntityGameOption[];
}

export interface SuggestArticleEntitiesInput {
  leagueId: string;
  seasonId?: string | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  preferredGameId?: string | null;
}
