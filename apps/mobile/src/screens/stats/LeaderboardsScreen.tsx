import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Avatar from '../../components/Avatar';
import PillToggle from '../../components/PillToggle';
import SectionHeader from '../../components/SectionHeader';
import { useAuth } from '../../context/AuthContext';
import { useLeague } from '../../context/LeagueContext';
import { supabase } from '../../lib/supabase/client';
import { getStatsLeaders, getCurrentSeason, type PlayerStatRow } from '../../lib/supabase/data';
import colors from '../../theme/colors';

type StatCategory = 'Points' | 'Goals' | 'Assists' | 'PIM';
const categories: readonly StatCategory[] = ['Points', 'Goals', 'Assists', 'PIM'];

const STAT_MAP: Record<StatCategory, 'points' | 'goals' | 'assists'> = {
  Points: 'points',
  Goals: 'goals',
  Assists: 'assists',
  PIM: 'points', // We sort by PIM client-side
};

type LeaderRow = PlayerStatRow & { avatar_url: string | null; rank: number };

export default function LeaderboardsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const { activeLeague, activeTheme } = useLeague();
  const [category, setCategory] = React.useState<StatCategory>('Points');
  const [leaders, setLeaders] = React.useState<LeaderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userRank, setUserRank] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!activeLeague) {
      setLeaders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const statType = category === 'PIM' ? 'points' : STAT_MAP[category];

    getStatsLeaders(activeLeague.id, statType, 50)
      .then(async (rows) => {
        // Enrich with avatars
        const playerIds = rows.map((r) => r.player_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', playerIds);
        const avatarMap = new Map<string, string | null>(
          (profiles ?? []).map((p: any) => [p.id, p.avatar_url]),
        );

        let sorted = rows.map((r) => ({
          ...r,
          avatar_url: avatarMap.get(r.player_id) ?? null,
          rank: 0,
        }));

        // Sort by the selected category
        if (category === 'PIM') {
          sorted.sort((a, b) => (b.penalty_minutes ?? 0) - (a.penalty_minutes ?? 0));
        } else if (category === 'Goals') {
          sorted.sort((a, b) => b.goals - a.goals);
        } else if (category === 'Assists') {
          sorted.sort((a, b) => b.assists - a.assists);
        }
        // Points is already sorted by default

        // Assign ranks
        sorted = sorted.map((r, i) => ({ ...r, rank: i + 1 }));

        setLeaders(sorted);

        // Find user's rank
        if (user) {
          const myIndex = sorted.findIndex((r) => r.player_id === user.id);
          setUserRank(myIndex >= 0 ? myIndex + 1 : null);
        }
      })
      .finally(() => setLoading(false));
  }, [activeLeague?.id, category, user]);

  const getStatValue = (row: LeaderRow): number => {
    switch (category) {
      case 'Goals': return row.goals;
      case 'Assists': return row.assists;
      case 'PIM': return row.penalty_minutes ?? 0;
      default: return row.points;
    }
  };

  if (!activeLeague) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Leaderboards</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Select a league to view leaderboards</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeTheme.backgroundColor }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Leaderboards</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.filterWrap}>
        <PillToggle options={categories} selected={category} onChange={setCategory} />
      </View>

      {userRank && (
        <View style={styles.userRankBanner}>
          <Ionicons name="trophy" size={16} color={colors.brandGold} />
          <Text style={styles.userRankText}>
            Your rank: #{userRank} in {category}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={activeTheme.primaryColor} />
        </View>
      ) : leaders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No stats available yet</Text>
        </View>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item) => `${item.player_id}-${item.rank}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isCurrentUser = user?.id === item.player_id;
            const isTop3 = item.rank <= 3;
            return (
              <View
                style={[
                  styles.leaderRow,
                  isCurrentUser && styles.leaderRowHighlight,
                  isTop3 && styles.leaderRowTop3,
                ]}
              >
                <View style={styles.rankCol}>
                  <Text
                    style={[
                      styles.rankText,
                      isTop3 && { color: colors.brandGold },
                    ]}
                  >
                    {item.rank}
                  </Text>
                </View>
                <Avatar uri={item.avatar_url} name={item.player_name} size={36} />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {item.player_name}
                    {isCurrentUser ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {item.team_short_name} | {item.games_played} GP
                  </Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, isTop3 && { color: colors.brandGold }]}>
                    {getStatValue(item)}
                  </Text>
                  <Text style={styles.statLabel}>{category === 'PIM' ? 'PIM' : category.slice(0, 3).toUpperCase()}</Text>
                </View>
                <View style={styles.secondaryStats}>
                  {category !== 'Goals' && <Text style={styles.secondaryStat}>{item.goals}G</Text>}
                  {category !== 'Assists' && <Text style={styles.secondaryStat}>{item.assists}A</Text>}
                  {category !== 'Points' && category !== 'PIM' && (
                    <Text style={styles.secondaryStat}>{item.points}P</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
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
  emptyText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  filterWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  userRankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userRankText: { fontSize: 13, fontWeight: '800', color: colors.brandGold },

  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  leaderRowHighlight: {
    backgroundColor: 'rgba(79,216,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(79,216,255,0.2)',
    borderBottomWidth: 1,
  },
  leaderRowTop3: {
    backgroundColor: 'rgba(212,175,55,0.06)',
  },
  rankCol: { width: 28, alignItems: 'center' },
  rankText: { fontSize: 16, fontWeight: '900', color: colors.textSecondary },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  teamName: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
  statCol: { alignItems: 'center', minWidth: 36 },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  secondaryStats: { flexDirection: 'column', minWidth: 32 },
  secondaryStat: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
});
