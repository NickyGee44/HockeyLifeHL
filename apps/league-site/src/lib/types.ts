// League types for Platform 2

export interface LeagueBranding {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string | null;
  fontFamily: string | null;
  customCss: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  city: string | null;
  stateProvince: string | null;
  country: string | null;
  address: string | null;
  isPublic: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface TeamStanding {
  teamId: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  seasonId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface Game {
  id: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string;
  location: string | null;
  homeTeam?: Team;
  awayTeam?: Team;
}

export interface PlayerStats {
  playerId: string;
  seasonId: string;
  fullName: string;
  jerseyNumber: number | null;
  position: string | null;
  teamName: string;
  teamShortName: string;
  teamColor: string | null;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  pointsPerGame: number;
}

export interface Season {
  id: string;
  name: string;
  status: 'draft' | 'registration' | 'active' | 'completed';
  startDate: string | null;
  endDate: string | null;
  leagueId: string;
}
