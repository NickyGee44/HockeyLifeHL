import React from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, GameCard, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { useRecentGames } from '@hockey-life/data';
import { supabase } from '../../../../src/lib/supabase/client';
import type { RecentGame } from '@hockey-life/data';

export default function ScoresScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: games, isLoading } = useRecentGames(supabase, leagueId, 30);

  const renderGame = ({ item }: { item: RecentGame }) => (
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
        onPress={() => router.push(`/(tabs)/leagues/${leagueId}/games/${item.id}` as any)}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Scores</Text>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={games || []}
          renderItem={renderGame}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState title="No scores yet" description="Results will appear after games are completed." />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
