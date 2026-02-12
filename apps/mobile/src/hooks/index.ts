/**
 * Re-export hooks from packages/data for convenience.
 * These hooks accept a supabase client, so they work on any platform.
 */
export {
  usePlayerLeagues,
  useLeague,
  useSeasons,
  useCurrentSeason,
  useDivisions,
  useLeagueStats,
  useTeams,
  useTeam,
  useTeamRoster,
  useStandings,
  usePlayerTeams,
  useUpcomingGames,
  useRecentGames,
  useGamePreview,
  useSchedule,
  usePlayerUpcomingGames,
  usePlayerRecentGames,
  useStatsLeaders,
  useGoalieLeaders,
  usePlayerCareerStats,
  usePlayerGameLog,
  usePlayerBadges,
  usePlayerProfile,
  useCurrentPlayer,
  useUpdateProfile,
  usePaymentHistory,
  usePaymentsDue,
  // Phase 2: Check-ins / RSVP
  useMyCheckins,
  useGameCheckins,
  useCheckinSummaries,
  useUpdateCheckin,
  // Phase 2: Join Requests
  useMyJoinRequests,
  useTeamsForJoin,
  useSubmitJoinRequest,
  useCancelJoinRequest,
  // Phase 2: Content (news + gallery)
  useNewsArticle,
  useNewsArticleById,
  useAlbumWithPhotos,
} from '@hockey-life/data';

export { useAuth } from '../lib/auth/provider';
