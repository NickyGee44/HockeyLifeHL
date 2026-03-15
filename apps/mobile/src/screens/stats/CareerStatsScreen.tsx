import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Avatar from '../../components/Avatar';
import BrandAtmosphere from '../../components/BrandAtmosphere';
import SectionHeader from '../../components/SectionHeader';
import { useAuth } from '../../context/AuthContext';
import { useLeague } from '../../context/LeagueContext';
import { supabase } from '../../lib/supabase/client';
import colors from '../../theme/colors';

type CareerTotals = {
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  penaltyMinutes: number;
};

type LeagueSeasonStat = {
  seasonId: string;
  seasonName: string;
  leagueId: string;
  leagueName: string;
  teamName: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  penaltyMinutes: number;
};

type LeagueGroup = {
  leagueId: string;
  leagueName: string;
  seasons: LeagueSeasonStat[];
  expanded: boolean;
};

export default function CareerStatsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const { activeTheme } = useLeague();
  const [totals, setTotals] = React.useState<CareerTotals>({
    gamesPlayed: 0,
    goals: 0,
    assists: 0,
    points: 0,
    penaltyMinutes: 0,
  });
  const [leagueGroups, setLeagueGroups] = React.useState<LeagueGroup[]>([]);
  const [profile, setProfile] = React.useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadStats = React.useCallback(async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(profileData);

      // Fetch all player_season_stats for this user across all seasons/leagues
      const { data: statsData } = await supabase
        .from('player_season_stats')
        .select('season_id, goals, assists, points, games_played, penalty_minutes, team_id, team_name, season:seasons(id, name, league_id, league:leagues(id, name))')
        .eq('player_id', user.id)
        .order('season_id', { ascending: false });

      if (!statsData || statsData.length === 0) {
        // Fallback: try player_stats table aggregated
        const { data: gameStats } = await supabase
          .from('player_stats')
          .select('goals, assists, points, penalty_minutes, game_id')
          .eq('player_id', user.id);

        if (gameStats && gameStats.length > 0) {
          const t: CareerTotals = {
            gamesPlayed: gameStats.length,
            goals: gameStats.reduce((sum, s) => sum + (s.goals || 0), 0),
            assists: gameStats.reduce((sum, s) => sum + (s.assists || 0), 0),
            points: gameStats.reduce((sum, s) => sum + (s.points || 0), 0),
            penaltyMinutes: gameStats.reduce((sum, s) => sum + (s.penalty_minutes || 0), 0),
          };
          setTotals(t);
        }
        setLeagueGroups([]);
        return;
      }

      // Build per-season stats with league info
      const seasonStats: LeagueSeasonStat[] = (statsData as any[]).map((row) => {
        const season = Array.isArray(row.season) ? row.season[0] : row.season;
        const league = season ? (Array.isArray(season.league) ? season.league[0] : season.league) : null;
        return {
          seasonId: row.season_id,
          seasonName: season?.name ?? 'Unknown Season',
          leagueId: league?.id ?? '',
          leagueName: league?.name ?? 'Unknown League',
          teamName: row.team_name ?? 'Unknown Team',
          gamesPlayed: Number(row.games_played) || 0,
          goals: Number(row.goals) || 0,
          assists: Number(row.assists) || 0,
          points: Number(row.points) || 0,
          penaltyMinutes: Number(row.penalty_minutes) || 0,
        };
      });

      // Calculate career totals
      const t: CareerTotals = {
        gamesPlayed: seasonStats.reduce((sum, s) => sum + s.gamesPlayed, 0),
        goals: seasonStats.reduce((sum, s) => sum + s.goals, 0),
        assists: seasonStats.reduce((sum, s) => sum + s.assists, 0),
        points: seasonStats.reduce((sum, s) => sum + s.points, 0),
        penaltyMinutes: seasonStats.reduce((sum, s) => sum + s.penaltyMinutes, 0),
      };
      setTotals(t);

      // Group by league
      const groupMap = new Map<string, LeagueGroup>();
      for (const stat of seasonStats) {
        if (!groupMap.has(stat.leagueId)) {
          groupMap.set(stat.leagueId, {
            leagueId: stat.leagueId,
            leagueName: stat.leagueName,
            seasons: [],
            expanded: false,
          });
        }
        groupMap.get(stat.leagueId)!.seasons.push(stat);
      }
      setLeagueGroups(Array.from(groupMap.values()));
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const toggleLeague = (leagueId: string) => {
    setLeagueGroups((groups) =>
      groups.map((g) =>
        g.leagueId === leagueId ? { ...g, expanded: !g.expanded } : g,
      ),
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Career Stats</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <BrandAtmosphere intensity="low" />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Career Stats</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Player Identity */}
        <View style={styles.identityCard}>
          <LinearGradient
            colors={['rgba(79,216,255,0.12)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Avatar
            uri={profile?.avatar_url ?? null}
            name={profile?.full_name ?? 'Player'}
            size={64}
            borderColor={colors.primary}
          />
          <View style={styles.identityInfo}>
            <Text style={styles.playerName}>{profile?.full_name ?? 'Player'}</Text>
            <Text style={styles.playerSub}>Career Overview</Text>
          </View>
        </View>

        {/* Career Totals Hero */}
        <SectionHeader title="Career Totals" />
        <View style={styles.totalsCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(79,216,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.totalsRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.gamesPlayed}</Text>
              <Text style={styles.totalLabel}>GP</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.goals}</Text>
              <Text style={styles.totalLabel}>G</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.assists}</Text>
              <Text style={styles.totalLabel}>A</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={[styles.totalValue, { color: colors.brandGold }]}>{totals.points}</Text>
              <Text style={styles.totalLabel}>PTS</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{totals.penaltyMinutes}</Text>
              <Text style={styles.totalLabel}>PIM</Text>
            </View>
          </View>
        </View>

        {/* By League Breakdown */}
        {leagueGroups.length > 0 && (
          <>
            <SectionHeader title="By League" />
            {leagueGroups.map((group) => (
              <View key={group.leagueId} style={styles.leagueGroupCard}>
                <Pressable style={styles.leagueGroupHeader} onPress={() => toggleLeague(group.leagueId)}>
                  <View style={styles.leagueGroupInfo}>
                    <Text style={styles.leagueGroupName}>{group.leagueName}</Text>
                    <Text style={styles.leagueGroupMeta}>
                      {group.seasons.length} season{group.seasons.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name={group.expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>

                {group.expanded && (
                  <View style={styles.seasonsTable}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, styles.tableTeamCol]}>Season</Text>
                      <Text style={styles.tableHeaderCell}>GP</Text>
                      <Text style={styles.tableHeaderCell}>G</Text>
                      <Text style={styles.tableHeaderCell}>A</Text>
                      <Text style={styles.tableHeaderCell}>PTS</Text>
                      <Text style={styles.tableHeaderCell}>PIM</Text>
                    </View>
                    {group.seasons.map((season, index) => (
                      <View key={`${season.seasonId}-${index}`} style={styles.tableRow}>
                        <View style={styles.tableTeamCol}>
                          <Text style={styles.seasonName} numberOfLines={1}>{season.seasonName}</Text>
                          <Text style={styles.seasonTeam} numberOfLines={1}>{season.teamName}</Text>
                        </View>
                        <Text style={styles.tableCell}>{season.gamesPlayed}</Text>
                        <Text style={styles.tableCell}>{season.goals}</Text>
                        <Text style={styles.tableCell}>{season.assists}</Text>
                        <Text style={[styles.tableCell, styles.tableCellHighlight]}>{season.points}</Text>
                        <Text style={styles.tableCell}>{season.penaltyMinutes}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Empty State */}
        {totals.gamesPlayed === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="stats-chart-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No career stats yet</Text>
            <Text style={styles.emptySub}>
              Stats from your games will accumulate here as you play in BLH leagues.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 8 },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.bgSurface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    padding: 16,
    overflow: 'hidden',
  },
  identityInfo: { flex: 1 },
  playerName: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  playerSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },

  totalsCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassStrokeStrong,
    padding: 20,
    overflow: 'hidden',
    shadowColor: colors.brandRink,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: { alignItems: 'center', gap: 4 },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  leagueGroupCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    overflow: 'hidden',
    marginBottom: 4,
  },
  leagueGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  leagueGroupInfo: { flex: 1 },
  leagueGroupName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  leagueGroupMeta: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },

  seasonsTable: {
    borderTopWidth: 1,
    borderTopColor: colors.borderCard,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.bgInteractive,
  },
  tableHeaderCell: {
    flex: 0.7,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tableTeamCol: { flex: 2, paddingRight: 6 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderCard,
  },
  seasonName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  seasonTeam: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
  tableCell: {
    flex: 0.7,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tableCellHighlight: { fontWeight: '900', color: colors.primary },

  emptyCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
