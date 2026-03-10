import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GameCard from '../../components/GameCard';
import {
  type CheckinStatus,
  getGameCheckinSummary,
} from '../../lib/supabase/checkins';
import {
  clearPlayerCheckinAsCaptain,
  createGoalieRequest,
  getCaptainRole,
  getGameCheckinStatusMap,
  getLeagueSubPlayers,
  getOpenGoalieRequest,
  getRecentTeamMessages,
  getTeamSubInvitations,
  inviteSub,
  postTeamMessage,
  type CaptainRole,
  type GoalieRequestRow,
  type SubCandidate,
  type TeamMessageRow,
  type TeamSubInvitation,
  updatePlayerCheckinAsCaptain,
} from '../../lib/supabase/captain';
import { supabase } from '../../lib/supabase/client';
import { mapGameStatus } from '../../lib/supabase/data';
import { navigateToPlayerCard } from '../../navigation/playerCard';
import { TeamStackParamList } from '../../navigation/types';
import colors from '../../theme/colors';

type Props = NativeStackScreenProps<TeamStackParamList, 'TeamDetail'>;

type TeamInfo = {
  id: string;
  name: string;
  primary_color: string | null;
  secondary_color: string | null;
};

type StandingInfo = {
  wins: number | null;
  losses: number | null;
  ties: number | null;
  points: number | null;
  goals_for: number | null;
  goals_against: number | null;
  games_played: number | null;
};

type RosterPlayer = {
  id: string;
  player_id: string;
  jersey_number: number | null;
  position: string | null;
  is_goalie: boolean;
  leadership_role: string | null;
  player_name: string;
  player_email: string | null;
  goals: number;
  assists: number;
  points: number;
};

type UpcomingGame = {
  id: string;
  league_id: string;
  season_id: string | null;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  status: string | null;
  location: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string; primary_color: string | null } | null;
  away_team: { name: string; primary_color: string | null } | null;
};

type LeagueInfo = {
  id: string;
  name: string;
  slug: string | null;
};

type NextGameAvailability = {
  confirmed: number;
  tentative: number;
  out: number;
  pending: number;
};

const GOALIE_SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

function formatRelativeTime(iso: string | null) {
  if (!iso) return 'Just now';

  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours <= 0) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(iso);
}

function formatRosterPosition(position: string | null, isGoalie: boolean) {
  if (isGoalie) return 'G';
  if (!position) return '—';

  const normalized = position.trim().toLowerCase();

  if (
    normalized === 'd' ||
    normalized === 'defence' ||
    normalized === 'defense' ||
    normalized === 'defenceman' ||
    normalized === 'defenseman'
  ) {
    return 'D';
  }

  if (normalized === 'g' || normalized === 'goalie' || normalized === 'goaltender') {
    return 'G';
  }

  if (
    normalized === 'f' ||
    normalized === 'forward' ||
    normalized === 'centre' ||
    normalized === 'center' ||
    normalized === 'wing' ||
    normalized === 'winger' ||
    normalized === 'lw' ||
    normalized === 'rw' ||
    normalized === 'c'
  ) {
    return 'F';
  }

  return normalized.startsWith('d') ? 'D' : normalized.startsWith('g') ? 'G' : 'F';
}

function formatCaptainRole(role: CaptainRole | null) {
  if (role === 'captain') return 'Captain';
  if (role === 'alternate_captain') return 'Alternate';
  return null;
}

function buildAvailabilityCounts(
  rosterCount: number,
  statusMap: Record<string, CheckinStatus>,
): NextGameAvailability {
  const statuses = Object.values(statusMap);
  const confirmed = statuses.filter((status) => status === 'confirmed').length;
  const tentative = statuses.filter((status) => status === 'tentative').length;
  const out = statuses.filter((status) => status === 'out').length;

  return {
    confirmed,
    tentative,
    out,
    pending: Math.max(rosterCount - statuses.length, 0),
  };
}

function getLineupPillStyle(selected: boolean, tone: 'in' | 'maybe' | 'out' | 'wait') {
  if (!selected) {
    return {
      backgroundColor: colors.bgInteractive,
      borderColor: colors.borderCard,
      color: colors.textSecondary,
    };
  }

  if (tone === 'in') {
    return {
      backgroundColor: colors.accentGreen,
      borderColor: colors.accentGreen,
      color: '#04110B',
    };
  }

  if (tone === 'maybe') {
    return {
      backgroundColor: '#F59E0B',
      borderColor: '#F59E0B',
      color: '#0F0A00',
    };
  }

  if (tone === 'out') {
    return {
      backgroundColor: colors.accentRed,
      borderColor: colors.accentRed,
      color: '#FFFFFF',
    };
  }

  return {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '50',
    color: colors.primary,
  };
}

function StatBox({ label, value, compact = false }: { label: string; value: string | number; compact?: boolean }) {
  return (
    <View style={[styles.statBox, compact && styles.statBoxCompact]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function TeamDetailScreen({ route, navigation }: Props) {
  const { teamId, leagueId } = route.params;
  const { width } = useWindowDimensions();
  const isCompact = width < 390;

  const [team, setTeam] = React.useState<TeamInfo | null>(null);
  const [league, setLeague] = React.useState<LeagueInfo | null>(null);
  const [standing, setStanding] = React.useState<StandingInfo | null>(null);
  const [roster, setRoster] = React.useState<RosterPlayer[]>([]);
  const [upcomingGames, setUpcomingGames] = React.useState<UpcomingGame[]>([]);
  const [nextGameAvailability, setNextGameAvailability] = React.useState<NextGameAvailability | null>(null);
  const [captainRole, setCaptainRole] = React.useState<CaptainRole | null>(null);
  const [teamMessages, setTeamMessages] = React.useState<TeamMessageRow[]>([]);
  const [lineupStatuses, setLineupStatuses] = React.useState<Record<string, CheckinStatus>>({});
  const [subInvitations, setSubInvitations] = React.useState<TeamSubInvitation[]>([]);
  const [goalieRequest, setGoalieRequest] = React.useState<GoalieRequestRow | null>(null);
  const [subCandidates, setSubCandidates] = React.useState<SubCandidate[]>([]);
  const [loadingSubCandidates, setLoadingSubCandidates] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [lineupSavingPlayerId, setLineupSavingPlayerId] = React.useState<string | null>(null);
  const [captainError, setCaptainError] = React.useState<string | null>(null);

  const [reminderModalVisible, setReminderModalVisible] = React.useState(false);
  const [reminderMessage, setReminderMessage] = React.useState('');
  const [reminderSaving, setReminderSaving] = React.useState(false);

  const [subModalVisible, setSubModalVisible] = React.useState(false);
  const [subSearch, setSubSearch] = React.useState('');
  const [subInviteMessage, setSubInviteMessage] = React.useState('');
  const [subSavingPlayerId, setSubSavingPlayerId] = React.useState<string | null>(null);

  const [goalieModalVisible, setGoalieModalVisible] = React.useState(false);
  const [goalieSkillLevel, setGoalieSkillLevel] = React.useState('intermediate');
  const [goalieCompensation, setGoalieCompensation] = React.useState('Free');
  const [goalieNotes, setGoalieNotes] = React.useState('');
  const [goalieSaving, setGoalieSaving] = React.useState(false);

  const nextGame = upcomingGames[0] ?? null;
  const teamName = team?.name ?? 'Team';
  const primaryColor = team?.primary_color ?? colors.primary;
  const nextOpponent = nextGame
    ? nextGame.home_team_id === teamId
      ? nextGame.away_team?.name ?? 'Opponent'
      : nextGame.home_team?.name ?? 'Opponent'
    : null;

  const refreshCaptainData = React.useCallback(
    async (currentRoster: RosterPlayer[], currentNextGame: UpcomingGame | null) => {
      const [role, messages] = await Promise.all([
        getCaptainRole(teamId),
        getRecentTeamMessages(teamId, 5),
      ]);

      setCaptainRole(role);
      setTeamMessages(messages);

      if (!role || !currentNextGame) {
        setLineupStatuses({});
        setSubInvitations([]);
        setGoalieRequest(null);
        return;
      }

      const [statusMap, invitationsResult, openGoalieRequest] = await Promise.all([
        getGameCheckinStatusMap(currentNextGame.id, teamId),
        getTeamSubInvitations(teamId, [currentNextGame.id]),
        getOpenGoalieRequest(currentNextGame.id, teamId),
      ]);

      setLineupStatuses(statusMap);
      setNextGameAvailability(buildAvailabilityCounts(currentRoster.length, statusMap));
      setSubInvitations(invitationsResult.data ?? []);
      setGoalieRequest(openGoalieRequest);
    },
    [teamId],
  );

  function navigateToGame(gameId: string) {
    (navigation as any).navigate('Schedule', {
      screen: 'GamePreview',
      params: { gameId },
    });
  }

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);

      const [teamRes, leagueRes, standingRes, rosterRes, gamesRes] = await Promise.all([
        supabase.from('teams').select('id, name, primary_color, secondary_color').eq('id', teamId).single(),
        supabase.from('leagues').select('id, name, slug').eq('id', leagueId).maybeSingle(),
        supabase
          .from('team_standings')
          .select('wins, losses, ties, points, goals_for, goals_against, games_played')
          .eq('team_id', teamId)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('team_rosters')
          .select('id, player_id, jersey_number, position, is_goalie, leadership_role')
          .eq('team_id', teamId)
          .eq('league_id', leagueId)
          .eq('status', 'active'),
        supabase
          .from('games')
          .select(
            `id, league_id, season_id, home_team_id, away_team_id, scheduled_at, status, location, home_score, away_score,
             home_team:teams!games_home_team_id_fkey(name, primary_color),
             away_team:teams!games_away_team_id_fkey(name, primary_color)`,
          )
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true })
          .limit(4),
      ]);

      if (!isMounted) return;

      setTeam((teamRes.data as TeamInfo | null) ?? null);
      setLeague((leagueRes.data as LeagueInfo | null) ?? null);
      setStanding((standingRes.data as StandingInfo | null) ?? null);
      setUpcomingGames(((gamesRes.data as any[]) ?? []) as UpcomingGame[]);

      const rosterRows = (rosterRes.data ?? []) as any[];
      const nextScheduledGame = (((gamesRes.data as any[]) ?? []) as UpcomingGame[])[0] ?? null;

      if (rosterRows.length > 0) {
        const playerIds = rosterRows.map((row) => row.player_id);

        const [profileRes, statsRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email').in('id', playerIds),
          supabase
            .from('player_stats')
            .select('player_id, goals, assists')
            .in('player_id', playerIds)
            .eq('league_id', leagueId),
        ]);

        if (!isMounted) return;

        const nameMap = new Map<string, { fullName: string; email: string | null }>();
        for (const profile of (profileRes.data ?? []) as any[]) {
          nameMap.set(profile.id, {
            fullName: profile.full_name ?? 'Unknown',
            email: profile.email ?? null,
          });
        }

        const statsMap = new Map<string, { goals: number; assists: number }>();
        for (const statsRow of (statsRes.data ?? []) as any[]) {
          const existing = statsMap.get(statsRow.player_id);
          statsMap.set(statsRow.player_id, {
            goals: (existing?.goals ?? 0) + (statsRow.goals ?? 0),
            assists: (existing?.assists ?? 0) + (statsRow.assists ?? 0),
          });
        }

        const players: RosterPlayer[] = rosterRows
          .map((row) => {
            const statLine = statsMap.get(row.player_id) ?? { goals: 0, assists: 0 };
            const profile = nameMap.get(row.player_id);

            return {
              id: row.id,
              player_id: row.player_id,
              jersey_number: row.jersey_number ?? null,
              position: row.position ?? null,
              is_goalie: row.is_goalie ?? false,
              leadership_role: row.leadership_role ?? null,
              player_name: profile?.fullName ?? 'Unknown',
              player_email: profile?.email ?? null,
              goals: statLine.goals,
              assists: statLine.assists,
              points: statLine.goals + statLine.assists,
            };
          })
          .sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999));

        setRoster(players);

        if (nextScheduledGame) {
          const summary = await getGameCheckinSummary(nextScheduledGame.id, teamId);
          if (!isMounted) return;

          setNextGameAvailability({
            confirmed: summary.confirmed.length,
            tentative: summary.tentative.length,
            out: summary.out.length,
            pending: Math.max(players.length - summary.total, 0),
          });
        } else {
          setNextGameAvailability(null);
        }

        await refreshCaptainData(players, nextScheduledGame);
      } else {
        setRoster([]);
        setNextGameAvailability(null);
        await refreshCaptainData([], nextScheduledGame);
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [leagueId, refreshCaptainData, teamId]);

  const pendingPlayers = React.useMemo(
    () => roster.filter((player) => !lineupStatuses[player.player_id]),
    [lineupStatuses, roster],
  );

  const reminderTemplate = React.useMemo(() => {
    if (!nextGame) {
      return 'Please update your availability as soon as you can.';
    }

    const pendingNames = pendingPlayers.slice(0, 4).map((player) => player.player_name.split(' ')[0]);
    const nameSuffix =
      pendingNames.length > 0 ? ` Still waiting on ${pendingNames.join(', ')}${pendingPlayers.length > 4 ? ` and ${pendingPlayers.length - 4} more` : ''}.` : '';

    return `Please update your availability for ${teamName} vs ${nextOpponent ?? 'our next opponent'} on ${formatDateTime(
      nextGame.scheduled_at,
    )}.${nameSuffix}`;
  }, [nextGame, nextOpponent, pendingPlayers, teamName]);

  const invitedPlayerIds = React.useMemo(() => new Set(subInvitations.map((invite) => invite.invitedPlayerId)), [subInvitations]);

  const filteredSubCandidates = React.useMemo(() => {
    const query = subSearch.trim().toLowerCase();
    return subCandidates.filter((candidate) => {
      if (invitedPlayerIds.has(candidate.id)) return true;
      if (!query) return true;

      return (
        (candidate.full_name ?? '').toLowerCase().includes(query) ||
        (candidate.email ?? '').toLowerCase().includes(query)
      );
    });
  }, [invitedPlayerIds, subCandidates, subSearch]);

  const openLeagueSite = () => {
    if (!league?.slug) return;
    Linking.openURL(`https://${league.slug}.beerleaguehockey.ca`).catch(() => {});
  };

  const openReminderModal = () => {
    setReminderMessage(reminderTemplate);
    setReminderModalVisible(true);
    setCaptainError(null);
  };

  const openSubModal = async () => {
    if (!captainRole || !nextGame) return;

    setSubModalVisible(true);
    setSubSearch('');
    setCaptainError(null);

    if (subCandidates.length > 0 || loadingSubCandidates) {
      return;
    }

    setLoadingSubCandidates(true);
    const result = await getLeagueSubPlayers(leagueId, teamId);
    setLoadingSubCandidates(false);

    if (!result.success) {
      setCaptainError(result.error ?? 'Unable to load sub players.');
      return;
    }

    setSubCandidates(result.data ?? []);
  };

  const handleCaptainStatusChange = async (
    playerId: string,
    nextStatus: CheckinStatus | 'waiting',
  ) => {
    if (!captainRole || !nextGame) return;

    const previousStatuses = lineupStatuses;
    const updatedStatuses = { ...lineupStatuses };
    if (nextStatus === 'waiting') {
      delete updatedStatuses[playerId];
    } else {
      updatedStatuses[playerId] = nextStatus;
    }

    setCaptainError(null);
    setLineupSavingPlayerId(playerId);
    setLineupStatuses(updatedStatuses);
    setNextGameAvailability(buildAvailabilityCounts(roster.length, updatedStatuses));

    const result =
      nextStatus === 'waiting'
        ? await clearPlayerCheckinAsCaptain(nextGame.id, teamId, playerId)
        : await updatePlayerCheckinAsCaptain(nextGame.id, teamId, playerId, nextStatus);

    setLineupSavingPlayerId(null);

    if (!result.success) {
      setLineupStatuses(previousStatuses);
      setNextGameAvailability(buildAvailabilityCounts(roster.length, previousStatuses));
      setCaptainError(result.error ?? 'Unable to update lineup.');
    }
  };

  const handleSendReminder = async () => {
    if (!captainRole || !nextGame || !reminderMessage.trim()) {
      return;
    }

    setCaptainError(null);
    setReminderSaving(true);
    const result = await postTeamMessage({
      teamId,
      seasonId: nextGame.season_id ?? null,
      subject: `Check-in reminder vs ${nextOpponent ?? 'opponent'}`,
      message: reminderMessage.trim(),
      messageType: 'checkin_reminder',
      isUrgent: true,
    });
    setReminderSaving(false);

    if (!result.success) {
      setCaptainError(result.error ?? 'Unable to send reminder.');
      return;
    }

    setReminderModalVisible(false);
    setReminderMessage(reminderTemplate);
    setTeamMessages(await getRecentTeamMessages(teamId, 5));
    Alert.alert('Reminder sent', 'Your team bulletin has been updated with a check-in reminder.');
  };

  const handleInviteSub = async (playerId: string) => {
    if (!captainRole || !nextGame) return;

    setCaptainError(null);
    setSubSavingPlayerId(playerId);
    const result = await inviteSub(nextGame.id, teamId, playerId, subInviteMessage);
    setSubSavingPlayerId(null);

    if (!result.success) {
      setCaptainError(result.error ?? 'Unable to invite this sub.');
      return;
    }

    const refreshed = await getTeamSubInvitations(teamId, [nextGame.id]);
    setSubInvitations(refreshed.data ?? []);
  };

  const handleRequestGoalie = async () => {
    if (!captainRole || !nextGame) return;

    setCaptainError(null);
    setGoalieSaving(true);
    const result = await createGoalieRequest(nextGame.id, teamId, leagueId, {
      skillLevelNeeded: goalieSkillLevel,
      compensation: goalieCompensation,
      notes: goalieNotes,
    });
    setGoalieSaving(false);

    if (!result.success) {
      setCaptainError(result.error ?? 'Unable to create goalie request.');
      return;
    }

    setGoalieRequest(await getOpenGoalieRequest(nextGame.id, teamId));
    setGoalieModalVisible(false);
    Alert.alert(
      'Goalie request posted',
      `${result.notifiedGoalies ?? 0} active goalie${result.notifiedGoalies === 1 ? '' : 's'} are currently in the pool for this league.`,
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {teamName}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.colorStrip, { backgroundColor: primaryColor }]} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {standing ? (
          <View style={styles.recordCard}>
            <Text style={styles.sectionTitle}>Season Record</Text>
            <View style={[styles.statsRow, isCompact && styles.statsRowCompact]}>
              <StatBox label="W" value={standing.wins ?? 0} compact={isCompact} />
              <StatBox label="L" value={standing.losses ?? 0} compact={isCompact} />
              <StatBox label="OTL" value={standing.ties ?? 0} compact={isCompact} />
              <StatBox label="PTS" value={standing.points ?? 0} compact={isCompact} />
              <StatBox label="GF" value={standing.goals_for ?? 0} compact={isCompact} />
              <StatBox label="GA" value={standing.goals_against ?? 0} compact={isCompact} />
            </View>
          </View>
        ) : null}

        {(nextGame || league?.slug) && (
          <View style={styles.opsCard}>
            <Text style={styles.sectionTitle}>Team Operations</Text>

            {nextGame ? (
              <>
                <View style={[styles.opsHeaderRow, isCompact && styles.opsHeaderRowCompact]}>
                  <View style={styles.opsTextWrap}>
                    <Text style={styles.opsTitle}>Next up: {nextOpponent}</Text>
                    <Text style={styles.opsMeta}>
                      {formatDate(nextGame.scheduled_at)} · {formatTime(nextGame.scheduled_at)}
                      {nextGame.location ? ` · ${nextGame.location}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.opsPrimaryButton, isCompact && styles.opsPrimaryButtonCompact]}
                    onPress={() => navigateToGame(nextGame.id)}
                  >
                    <Text style={styles.opsPrimaryButtonText}>Open Game</Text>
                  </Pressable>
                </View>

                {nextGameAvailability ? (
                  <>
                    <View style={[styles.opsCountsRow, isCompact && styles.opsCountsRowCompact]}>
                      <StatBox label="IN" value={nextGameAvailability.confirmed} compact={isCompact} />
                      <StatBox label="MAYBE" value={nextGameAvailability.tentative} compact={isCompact} />
                      <StatBox label="OUT" value={nextGameAvailability.out} compact={isCompact} />
                      <StatBox label="WAITING" value={nextGameAvailability.pending} compact={isCompact} />
                    </View>
                    <Text style={styles.opsHint}>
                      Use this to spot lineup risk early before players have all responded.
                    </Text>
                  </>
                ) : null}
              </>
            ) : (
              <Text style={styles.opsMeta}>No scheduled games are posted for this team yet.</Text>
            )}

            {league?.slug ? (
              <Pressable style={styles.opsSecondaryButton} onPress={openLeagueSite}>
                <Ionicons name="globe-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.opsSecondaryButtonText}>Open League Site</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {captainRole && nextGame ? (
          <View style={styles.captainCard}>
            <View style={[styles.captainHeaderRow, isCompact && styles.captainHeaderRowCompact]}>
              <View style={styles.captainHeaderCopy}>
                <Text style={styles.sectionTitle}>Captain Center</Text>
                <Text style={styles.cardMeta}>
                  {formatCaptainRole(captainRole)} tools for {formatDateTime(nextGame.scheduled_at)}
                </Text>
              </View>
              <View style={styles.captainRoleBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                <Text style={styles.captainRoleText}>{formatCaptainRole(captainRole)}</Text>
              </View>
            </View>

            <View style={[styles.captainActionRow, isCompact && styles.captainActionRowCompact]}>
              <Pressable style={styles.captainActionButton} onPress={openReminderModal}>
                <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                <Text style={styles.captainActionTitle}>Remind Team</Text>
                <Text style={styles.captainActionMeta}>{pendingPlayers.length} awaiting response</Text>
              </Pressable>

              <Pressable style={styles.captainActionButton} onPress={() => void openSubModal()}>
                <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                <Text style={styles.captainActionTitle}>Request Sub</Text>
                <Text style={styles.captainActionMeta}>{subInvitations.length} invites for this game</Text>
              </Pressable>

              <Pressable style={styles.captainActionButton} onPress={() => setGoalieModalVisible(true)}>
                <Ionicons name="shield-half-outline" size={16} color={colors.primary} />
                <Text style={styles.captainActionTitle}>Request Goalie</Text>
                <Text style={styles.captainActionMeta}>{goalieRequest ? goalieRequest.status : 'No open request'}</Text>
              </Pressable>
            </View>

            {captainError ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.accentRed} />
                <Text style={styles.errorText}>{captainError}</Text>
              </View>
            ) : null}

            <View style={styles.inlineSection}>
              <Text style={styles.inlineSectionTitle}>Lineup Watch</Text>
              {pendingPlayers.length > 0 ? (
                <View style={styles.pendingPlayersWrap}>
                  {pendingPlayers.map((player) => (
                    <View key={player.id} style={styles.pendingPlayerChip}>
                      <Text style={styles.pendingPlayerText} numberOfLines={1}>
                        {player.player_name}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.inlineSectionBody}>Everyone on the roster has responded for this game.</Text>
              )}
            </View>

            {subInvitations.length > 0 ? (
              <View style={styles.inlineSection}>
                <Text style={styles.inlineSectionTitle}>Sub Requests</Text>
                <View style={styles.statusList}>
                  {subInvitations.slice(0, 4).map((invite) => (
                    <View key={invite.id} style={styles.statusListRow}>
                      <Text style={styles.statusListTitle}>
                        {invite.invitedPlayer?.fullName ?? 'Invited player'}
                      </Text>
                      <View style={[styles.statusBadge, invite.status === 'accepted' ? styles.statusBadgeSuccess : styles.statusBadgeNeutral]}>
                        <Text style={styles.statusBadgeText}>{invite.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {goalieRequest ? (
              <View style={styles.inlineSection}>
                <Text style={styles.inlineSectionTitle}>Goalie Request</Text>
                <View style={styles.goalieStatusCard}>
                  <View style={styles.statusListRow}>
                    <Text style={styles.statusListTitle}>Status</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        goalieRequest.status === 'filled' ? styles.statusBadgeSuccess : styles.statusBadgeNeutral,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{goalieRequest.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>
                    Skill: {goalieRequest.skillLevelNeeded ?? 'intermediate'}
                    {goalieRequest.compensation ? ` · ${goalieRequest.compensation}` : ''}
                  </Text>
                  {goalieRequest.notes ? <Text style={styles.inlineSectionBody}>{goalieRequest.notes}</Text> : null}
                </View>
              </View>
            ) : null}

            <View style={styles.inlineSection}>
              <Text style={styles.inlineSectionTitle}>Lineup Board</Text>
              <View style={styles.lineupBoard}>
                {roster.map((player) => {
                  const status = lineupStatuses[player.player_id] ?? null;
                  const isSaving = lineupSavingPlayerId === player.player_id;

                  return (
                    <View key={player.id} style={[styles.lineupRow, isCompact && styles.lineupRowCompact]}>
                      <View style={styles.lineupPlayerCopy}>
                        <Text style={styles.lineupPlayerName} numberOfLines={1}>
                          {player.player_name}
                        </Text>
                        <Text style={styles.lineupPlayerMeta} numberOfLines={1}>
                          {player.jersey_number != null ? `#${player.jersey_number}` : 'No #'} ·{' '}
                          {formatRosterPosition(player.position, player.is_goalie)}
                          {player.leadership_role ? ` · ${player.leadership_role === 'captain' ? 'C' : 'A'}` : ''}
                        </Text>
                      </View>

                      <View style={styles.lineupActions}>
                        {[
                          { key: 'confirmed', label: 'IN', tone: 'in' as const },
                          { key: 'tentative', label: 'MAYBE', tone: 'maybe' as const },
                          { key: 'out', label: 'OUT', tone: 'out' as const },
                          { key: 'waiting', label: 'WAIT', tone: 'wait' as const },
                        ].map((option) => {
                          const selected =
                            option.key === 'waiting' ? status == null : status === (option.key as CheckinStatus);
                          const tone = getLineupPillStyle(selected, option.tone);

                          return (
                            <Pressable
                              key={option.key}
                              disabled={isSaving}
                              style={[
                                styles.lineupActionPill,
                                {
                                  backgroundColor: tone.backgroundColor,
                                  borderColor: tone.borderColor,
                                  opacity: isSaving ? 0.5 : 1,
                                },
                              ]}
                              onPress={() =>
                                void handleCaptainStatusChange(
                                  player.player_id,
                                  option.key === 'waiting' ? 'waiting' : (option.key as CheckinStatus),
                                )
                              }
                            >
                              <Text style={[styles.lineupActionText, { color: tone.color }]}>{option.label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}

        {teamMessages.length > 0 ? (
          <View style={styles.messagesCard}>
            <Text style={styles.sectionTitle}>Team Bulletin</Text>
            <View style={styles.messagesList}>
              {teamMessages.map((message) => (
                <View key={message.id} style={styles.messageRow}>
                  <View style={styles.messageHeader}>
                    <View style={styles.messageTitleWrap}>
                      <Text style={styles.messageTitle} numberOfLines={1}>
                        {message.subject ?? 'Team update'}
                      </Text>
                      <Text style={styles.messageMeta}>
                        {message.sentBy?.fullName ?? 'Team'} · {formatRelativeTime(message.createdAt)}
                      </Text>
                    </View>
                    {message.isUrgent ? (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentBadgeText}>Urgent</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.messageBody}>{message.message}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {roster.length > 0 ? (
          <View style={styles.rosterCard}>
            <Text style={styles.sectionTitle}>Roster</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rosterTable}>
              <View>
                <View style={styles.rosterHeaderRow}>
                  <Text style={[styles.rosterHeaderCell, styles.jerseyHeader]}>#</Text>
                  <Text style={[styles.rosterHeaderCell, styles.nameHeader]}>Player</Text>
                  <Text style={styles.rosterHeaderCell}>POS</Text>
                  <Text style={styles.rosterHeaderCell}>G</Text>
                  <Text style={styles.rosterHeaderCell}>A</Text>
                  <Text style={styles.rosterHeaderCell}>PTS</Text>
                </View>
                {roster.map((player) => (
                  <Pressable
                    key={player.id}
                    style={({ pressed }) => [styles.rosterRow, pressed && styles.rosterRowPressed]}
                    onPress={() => navigateToPlayerCard(navigation, { playerId: player.player_id, leagueId })}
                  >
                    <Text style={[styles.rosterCell, styles.jerseyCell, { color: primaryColor }]}>
                      {player.jersey_number != null ? `#${player.jersey_number}` : '—'}
                    </Text>
                    <View style={styles.nameCellWrap}>
                      <Text style={[styles.rosterCell, styles.nameCell]} numberOfLines={1}>
                        {player.player_name}
                      </Text>
                    </View>
                    <Text style={[styles.rosterCell, styles.posCell]}>
                      {formatRosterPosition(player.position, player.is_goalie)}
                    </Text>
                    <Text style={[styles.rosterCell, styles.statCell]}>{player.goals}</Text>
                    <Text style={[styles.rosterCell, styles.statCell]}>{player.assists}</Text>
                    <Text style={[styles.rosterCell, styles.ptsCell]}>{player.points}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {upcomingGames.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Upcoming Games</Text>
            {upcomingGames.map((game) => (
              <GameCard
                key={game.id}
                gameId={game.id}
                homeTeam={game.home_team?.name ?? game.home_team_id}
                awayTeam={game.away_team?.name ?? game.away_team_id}
                dateLabel={formatDate(game.scheduled_at)}
                timeLabel={formatTime(game.scheduled_at)}
                rinkName={game.location ?? ''}
                status={mapGameStatus(game.status)}
                homeScore={game.home_score ?? undefined}
                awayScore={game.away_score ?? undefined}
                scheduledAt={game.scheduled_at}
                location={game.location}
                compact
                onPress={() => navigateToGame(game.id)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={reminderModalVisible} transparent animationType="fade" onRequestClose={() => setReminderModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setReminderModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Send Check-in Reminder</Text>
              <Pressable onPress={() => setReminderModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalMeta}>Post an urgent team bulletin for players who still have not responded.</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={reminderMessage}
              onChangeText={setReminderMessage}
              placeholder="Write the reminder to your team..."
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalButtonRow}>
              <Pressable style={styles.modalSecondaryButton} onPress={() => setReminderModalVisible(false)}>
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalPrimaryButton, reminderSaving && styles.buttonDisabled]}
                onPress={() => void handleSendReminder()}
                disabled={reminderSaving}
              >
                <Text style={styles.modalPrimaryButtonText}>{reminderSaving ? 'Sending...' : 'Send Reminder'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={subModalVisible} transparent animationType="fade" onRequestClose={() => setSubModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSubModalVisible(false)}>
          <Pressable style={styles.modalCardLarge} onPress={() => {}}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Invite a Sub</Text>
              <Pressable onPress={() => setSubModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalMeta}>
              Invite registered sub or part-time players from this league for {nextOpponent ?? 'your next game'}.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={subInviteMessage}
              onChangeText={setSubInviteMessage}
              placeholder="Optional message to the player..."
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              style={styles.modalInput}
              value={subSearch}
              onChangeText={setSubSearch}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.textSecondary}
            />

            {loadingSubCandidates ? (
              <View style={styles.modalLoadingState}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.modalList}>
                {filteredSubCandidates.length > 0 ? (
                  filteredSubCandidates.map((candidate) => {
                    const alreadyInvited = invitedPlayerIds.has(candidate.id);
                    return (
                      <View key={candidate.id} style={styles.modalListRow}>
                        <View style={styles.modalListCopy}>
                          <Text style={styles.modalListTitle}>{candidate.full_name ?? 'Unknown player'}</Text>
                          {candidate.email ? <Text style={styles.modalListMeta}>{candidate.email}</Text> : null}
                        </View>
                        {alreadyInvited ? (
                          <View style={[styles.statusBadge, styles.statusBadgeNeutral]}>
                            <Text style={styles.statusBadgeText}>Invited</Text>
                          </View>
                        ) : (
                          <Pressable
                            style={[styles.inlineActionButton, subSavingPlayerId === candidate.id && styles.buttonDisabled]}
                            onPress={() => void handleInviteSub(candidate.id)}
                            disabled={subSavingPlayerId === candidate.id}
                          >
                            <Text style={styles.inlineActionButtonText}>
                              {subSavingPlayerId === candidate.id ? 'Sending...' : 'Invite'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyInlineState}>
                    <Text style={styles.inlineSectionBody}>No sub players matched this search.</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={goalieModalVisible} transparent animationType="fade" onRequestClose={() => setGoalieModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setGoalieModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Request a Goalie</Text>
              <Pressable onPress={() => setGoalieModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.modalMeta}>
              Create an open goalie request for {nextOpponent ?? 'this game'} and record the compensation or notes.
            </Text>

            <Text style={styles.fieldLabel}>Skill level needed</Text>
            <View style={styles.skillRow}>
              {GOALIE_SKILL_LEVELS.map((level) => {
                const selected = goalieSkillLevel === level.value;
                return (
                  <Pressable
                    key={level.value}
                    style={[styles.skillPill, selected && styles.skillPillSelected]}
                    onPress={() => setGoalieSkillLevel(level.value)}
                  >
                    <Text style={[styles.skillPillText, selected && styles.skillPillTextSelected]}>{level.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Compensation</Text>
            <TextInput
              style={styles.modalInput}
              value={goalieCompensation}
              onChangeText={setGoalieCompensation}
              placeholder='Example: "Free", "$20", "Beer"'
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={goalieNotes}
              onChangeText={setGoalieNotes}
              placeholder="Anything the goalie should know..."
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalButtonRow}>
              <Pressable style={styles.modalSecondaryButton} onPress={() => setGoalieModalVisible(false)}>
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalPrimaryButton, goalieSaving && styles.buttonDisabled]}
                onPress={() => void handleRequestGoalie()}
                disabled={goalieSaving}
              >
                <Text style={styles.modalPrimaryButtonText}>{goalieSaving ? 'Posting...' : 'Post Request'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  backBtn: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  colorStrip: {
    height: 6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  recordCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsRowCompact: {
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statBoxCompact: {
    flexBasis: '31%',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  opsCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: 16,
    gap: 14,
  },
  opsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  opsHeaderRowCompact: {
    flexDirection: 'column',
  },
  opsTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  opsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  opsMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  opsCountsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  opsCountsRowCompact: {
    flexWrap: 'wrap',
  },
  opsHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  opsPrimaryButton: {
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  opsPrimaryButtonCompact: {
    alignSelf: 'flex-start',
  },
  opsPrimaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textOnPrimary,
  },
  opsSecondaryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.bgInteractive,
  },
  opsSecondaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  captainCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: 16,
    gap: 14,
  },
  captainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  captainHeaderRowCompact: {
    flexDirection: 'column',
  },
  captainHeaderCopy: {
    flex: 1,
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  captainRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    backgroundColor: colors.primary + '16',
  },
  captainRoleText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  captainActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  captainActionRowCompact: {
    flexDirection: 'column',
  },
  captainActionButton: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.bgInteractive,
  },
  captainActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  captainActionMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.accentRed + '14',
    borderWidth: 1,
    borderColor: colors.accentRed + '30',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.accentRed,
  },
  inlineSection: {
    gap: 8,
  },
  inlineSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  inlineSectionBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  pendingPlayersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pendingPlayerChip: {
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.bgInteractive,
  },
  pendingPlayerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusList: {
    gap: 8,
  },
  statusListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusListTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeNeutral: {
    backgroundColor: colors.bgInteractive,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  statusBadgeSuccess: {
    backgroundColor: colors.accentGreen + '20',
    borderWidth: 1,
    borderColor: colors.accentGreen + '40',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  goalieStatusCard: {
    gap: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.bgInteractive,
  },
  lineupBoard: {
    gap: 10,
  },
  lineupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  lineupRowCompact: {
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  lineupPlayerCopy: {
    flex: 1,
    minWidth: 0,
  },
  lineupPlayerName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  lineupPlayerMeta: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSecondary,
  },
  lineupActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  lineupActionPill: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  lineupActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  messagesCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: 16,
  },
  messagesList: {
    gap: 10,
  },
  messageRow: {
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  messageTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  messageMeta: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSecondary,
  },
  messageBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  urgentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.accentRed + '18',
    borderWidth: 1,
    borderColor: colors.accentRed + '30',
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentRed,
  },
  rosterCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: 16,
  },
  rosterTable: {
    minWidth: 520,
  },
  rosterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
    marginBottom: 4,
    columnGap: 8,
  },
  rosterHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  jerseyHeader: {
    width: 52,
    textAlign: 'left',
  },
  nameHeader: {
    flex: 1,
    minWidth: 180,
    textAlign: 'left',
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
    columnGap: 8,
  },
  rosterRowPressed: {
    backgroundColor: colors.bgInteractive,
  },
  rosterCell: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  jerseyCell: {
    width: 52,
    textAlign: 'left',
    fontWeight: '800',
  },
  nameCellWrap: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameCell: {
    flex: 1,
    textAlign: 'left',
  },
  posCell: {
    width: 44,
  },
  statCell: {
    width: 44,
  },
  ptsCell: {
    width: 50,
    fontWeight: '800',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.74)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassStrokeStrong,
    backgroundColor: colors.bgSurface,
    padding: 18,
  },
  modalCardLarge: {
    maxHeight: '78%',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassStrokeStrong,
    backgroundColor: colors.bgSurface,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.bgInteractive,
  },
  modalMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.bgInteractive,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  modalTextarea: {
    minHeight: 104,
    paddingTop: 12,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalPrimaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  modalPrimaryButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textOnPrimary,
  },
  modalSecondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: colors.bgInteractive,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  modalSecondaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  modalLoadingState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    maxHeight: 300,
  },
  modalListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  modalListCopy: {
    flex: 1,
    minWidth: 0,
  },
  modalListTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalListMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  inlineActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primary + '18',
    borderWidth: 1,
    borderColor: colors.primary + '36',
  },
  inlineActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  emptyInlineState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.bgInteractive,
  },
  skillPillSelected: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '1A',
  },
  skillPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  skillPillTextSelected: {
    color: colors.primary,
  },
});
