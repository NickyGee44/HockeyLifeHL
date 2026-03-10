export type PlayerCardParams = {
  playerId: string;
  leagueId?: string | null;
};

export type ScheduleStackParamList = {
  ScheduleList: undefined;
  GamePreview: { gameId: string };
};

export type TeamStackParamList = {
  TeamList: undefined;
  TeamDetail: { teamId: string; leagueId: string };
  PlayerCard: PlayerCardParams;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  NotificationsFeed: undefined;
  NotificationSettings: undefined;
  LeagueMarketplace: undefined;
  PlayerCard: PlayerCardParams;
};
