import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, StatCard, Card, SectionHeader, Avatar, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { useCurrentPlayer, usePlayerCareerStats, usePlayerGameLog, usePlayerBadges, usePlayerLeagues, useCurrentSeason } from '@hockey-life/data';
import { useAuth } from '../../../src/lib/auth/provider';
import { supabase } from '../../../src/lib/supabase/client';

const BADGE_LABELS: Record<string, string> = {
  championship: 'Champion',
  top_scorer: 'Top Scorer',
  points_leader: 'Points Leader',
  top_goalie: 'Top Goalie',
  iron_man: 'Iron Man',
  most_assists: 'Playmaker',
  best_plus_minus: 'Best +/-',
  penalty_free: 'Penalty Free',
  team_mvp: 'Team MVP',
  shutout_king: 'Shutout King',
};

export default function MyStatsScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const { data: profile, isLoading } = useCurrentPlayer(supabase, userId);
  const { data: leagues } = usePlayerLeagues(supabase, userId);
  const firstLeagueId = leagues?.[0]?.id;
  const { data: season } = useCurrentSeason(supabase, firstLeagueId);
  const { data: gameLog, refetch: refetchLog } = usePlayerGameLog(supabase, userId, season?.id);
  const { data: careerStats } = usePlayerCareerStats(supabase, userId);
  const { data: badges } = usePlayerBadges(supabase, userId);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchLog();
    setRefreshing(false);
  };

  if (isLoading) return <LoadingScreen />;

  // Aggregate current season
  const current = gameLog?.reduce(
    (acc, g) => ({
      gp: acc.gp + 1,
      goals: acc.goals + g.goals,
      assists: acc.assists + g.assists,
      points: acc.points + g.points,
      pim: acc.pim + (g.penalty_minutes || 0),
      plusMinus: acc.plusMinus + g.plus_minus,
    }),
    { gp: 0, goals: 0, assists: 0, points: 0, pim: 0, plusMinus: 0 },
  ) || { gp: 0, goals: 0, assists: 0, points: 0, pim: 0, plusMinus: 0 };

  return (
    <ScrollView
      className="flex-1 bg-neutral-950"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
      }
    >
      {/* Header */}
      <View className="px-5 pt-16 pb-2">
        <Text variant="h1">My Stats</Text>
      </View>

      {/* Hero stat card */}
      <View className="px-5 mt-4 mb-6">
        <Card variant="elevated" className="p-6 items-center">
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size="lg" />
          <Text variant="h2" className="mt-3">{profile?.full_name || 'Player'}</Text>
          {season && (
            <Text variant="caption" className="text-gold-500 mt-1">{season.name}</Text>
          )}
          <Text className="text-5xl font-bold text-gold-400 mt-4">{current.points}</Text>
          <Text variant="label" className="mt-1">POINTS</Text>
        </Card>
      </View>

      {/* Stat grid */}
      <View className="px-5 mb-6">
        <View className="flex-row gap-2">
          <StatCard label="GP" value={current.gp} className="flex-1" />
          <StatCard label="G" value={current.goals} className="flex-1" />
          <StatCard label="A" value={current.assists} className="flex-1" />
          <StatCard label="PIM" value={current.pim} className="flex-1" />
          <StatCard
            label="+/-"
            value={current.plusMinus > 0 ? `+${current.plusMinus}` : String(current.plusMinus)}
            className="flex-1"
          />
        </View>
      </View>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <View className="px-5 mb-6">
          <SectionHeader title="Achievements" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
            {badges.map((badge) => (
              <Card key={badge.id} className="mr-3 p-3 items-center min-w-[80px]">
                <Ionicons name="medal" size={24} color="#D4AF37" />
                <Text variant="caption" className="mt-1 text-center text-gold-400">
                  {BADGE_LABELS[badge.badge_type] || badge.badge_type}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Career stats */}
      {careerStats && careerStats.length > 0 && (
        <View className="px-5 mb-6">
          <SectionHeader title="Career Stats" />
          <View className="mt-2">
            <View className="flex-row py-2 border-b border-neutral-800">
              <Text variant="label" className="flex-1">Team</Text>
              <Text variant="label" className="w-8 text-center">GP</Text>
              <Text variant="label" className="w-8 text-center">G</Text>
              <Text variant="label" className="w-8 text-center">A</Text>
              <Text variant="label" className="w-10 text-center">PTS</Text>
            </View>
            {careerStats.map((stat, i) => (
              <View key={i} className={`flex-row py-2.5 ${i % 2 !== 0 ? 'bg-neutral-900/50' : ''}`}>
                <Text variant="body" className="flex-1 text-neutral-300 text-sm" numberOfLines={1}>
                  {stat.team_name}
                </Text>
                <Text variant="body" className="w-8 text-center text-neutral-400 text-sm">{stat.games_played}</Text>
                <Text variant="body" className="w-8 text-center text-neutral-300 text-sm">{stat.goals}</Text>
                <Text variant="body" className="w-8 text-center text-neutral-300 text-sm">{stat.assists}</Text>
                <Text variant="body" className="w-10 text-center text-gold-400 font-semibold text-sm">{stat.points}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recent game log */}
      {gameLog && gameLog.length > 0 && (
        <View className="px-5">
          <SectionHeader title="Recent Games" />
          <View className="mt-2">
            <View className="flex-row py-2 border-b border-neutral-800">
              <Text variant="label" className="flex-1">Date</Text>
              <Text variant="label" className="w-6 text-center">R</Text>
              <Text variant="label" className="w-8 text-center">G</Text>
              <Text variant="label" className="w-8 text-center">A</Text>
              <Text variant="label" className="w-8 text-center">P</Text>
            </View>
            {gameLog.slice(0, 10).map((entry, i) => (
              <View key={entry.game_id} className={`flex-row py-2.5 ${i % 2 !== 0 ? 'bg-neutral-900/50' : ''}`}>
                <Text variant="caption" className="flex-1 text-neutral-300">
                  {entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                </Text>
                <Text
                  className={`w-6 text-center text-xs font-bold ${
                    entry.result === 'W' ? 'text-green-400' : entry.result === 'L' ? 'text-red-400' : 'text-neutral-400'
                  }`}
                >
                  {entry.result}
                </Text>
                <Text variant="body" className="w-8 text-center text-neutral-300 text-sm">{entry.goals}</Text>
                <Text variant="body" className="w-8 text-center text-neutral-300 text-sm">{entry.assists}</Text>
                <Text variant="body" className="w-8 text-center text-gold-400 text-sm font-semibold">{entry.points}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!gameLog?.length && !careerStats?.length && (
        <EmptyState
          title="No stats yet"
          description="Your stats will appear here after you play some games."
          className="mt-8"
        />
      )}
    </ScrollView>
  );
}
