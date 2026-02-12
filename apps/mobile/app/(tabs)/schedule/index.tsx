import React, { useState } from 'react';
import { View, SectionList, RefreshControl, Pressable } from 'react-native';
import { router } from 'expo-router';
import { format, parseISO, isSameDay } from 'date-fns';
import { Text, GameCard, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { usePlayerUpcomingGames, usePlayerRecentGames } from '@hockey-life/data';
import { useAuth } from '../../../src/lib/auth/provider';
import { supabase } from '../../../src/lib/supabase/client';
import type { UpcomingGame, RecentGame } from '@hockey-life/data';

type GameItem = UpcomingGame | RecentGame;

export default function MyScheduleScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'upcoming' | 'results'>('upcoming');
  const { data: upcoming, isLoading: upcomingLoading, refetch: refetchUpcoming } = usePlayerUpcomingGames(supabase, user?.id, 50);
  const { data: recent, isLoading: recentLoading, refetch: refetchRecent } = usePlayerRecentGames(supabase, user?.id, 50);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUpcoming(), refetchRecent()]);
    setRefreshing(false);
  };

  const isLoading = tab === 'upcoming' ? upcomingLoading : recentLoading;
  const games = tab === 'upcoming' ? upcoming : recent;

  // Group games by date
  const sections = React.useMemo(() => {
    if (!games) return [];
    const grouped = new Map<string, GameItem[]>();
    for (const game of games) {
      const dateKey = format(parseISO(game.scheduled_at), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(game);
    }
    return Array.from(grouped.entries()).map(([date, data]) => ({
      title: format(parseISO(date), 'EEEE, MMMM d'),
      data,
    }));
  }, [games]);

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-16 pb-4">
        <Text variant="h1">My Schedule</Text>
      </View>

      {/* Tab toggle */}
      <View className="flex-row mx-5 mb-4 bg-neutral-900 rounded-xl p-1">
        <Pressable
          onPress={() => setTab('upcoming')}
          className={`flex-1 py-2 rounded-lg items-center ${tab === 'upcoming' ? 'bg-neutral-800' : ''}`}
        >
          <Text className={`text-sm font-medium ${tab === 'upcoming' ? 'text-gold-400' : 'text-neutral-500'}`}>
            Upcoming
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('results')}
          className={`flex-1 py-2 rounded-lg items-center ${tab === 'results' ? 'bg-neutral-800' : ''}`}
        >
          <Text className={`text-sm font-medium ${tab === 'results' ? 'text-gold-400' : 'text-neutral-500'}`}>
            Results
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View className="px-5 py-2 bg-neutral-950">
              <Text variant="label" className="text-gold-500">{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="px-5 mb-3">
              <GameCard
                homeTeam={{
                  name: item.home_team?.name || 'TBD',
                  logo: item.home_team?.logo,
                  colors: item.home_team?.colors,
                  score: item.home_score,
                }}
                awayTeam={{
                  name: item.away_team?.name || 'TBD',
                  logo: item.away_team?.logo,
                  colors: item.away_team?.colors,
                  score: item.away_score,
                }}
                scheduledAt={item.scheduled_at}
                venue={item.venue}
                status={item.status}
                onPress={() => router.push(`/(tabs)/leagues/${item.league_id}/games/${item.id}` as any)}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              title={tab === 'upcoming' ? 'No upcoming games' : 'No results yet'}
              description={
                tab === 'upcoming'
                  ? "You don't have any upcoming games scheduled."
                  : "Your game results will appear here."
              }
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
