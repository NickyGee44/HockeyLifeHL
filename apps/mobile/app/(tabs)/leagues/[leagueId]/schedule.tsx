import React, { useState } from 'react';
import { View, FlatList, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, GameCard, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { useSchedule, useCurrentSeason, useSeasons, useDivisions } from '@hockey-life/data';
import { supabase } from '../../../../src/lib/supabase/client';
import type { ScheduleGame } from '@hockey-life/data';

export default function LeagueScheduleScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: currentSeason } = useCurrentSeason(supabase, leagueId);
  const { data: seasons } = useSeasons(supabase, leagueId);
  const { data: divisions } = useDivisions(supabase, leagueId);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>();
  const [selectedDivision, setSelectedDivision] = useState<string | undefined>();

  const activeSeasonId = selectedSeasonId || currentSeason?.id;

  const { data: games, isLoading } = useSchedule(
    supabase,
    leagueId,
    activeSeasonId,
    { divisionId: selectedDivision },
  );

  const renderGame = ({ item }: { item: ScheduleGame }) => (
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
      <View className="px-5 pt-4 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Schedule</Text>
      </View>

      {/* Season selector */}
      {seasons && seasons.length > 1 && (
        <View className="px-5 mb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {seasons.map((season: any) => (
              <Pressable
                key={season.id}
                onPress={() => setSelectedSeasonId(season.id === currentSeason?.id ? undefined : season.id)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  (activeSeasonId === season.id) ? 'bg-gold-500' : 'bg-neutral-800'
                }`}
              >
                <Text className={`text-sm font-medium ${
                  (activeSeasonId === season.id) ? 'text-neutral-950' : 'text-neutral-300'
                }`}>
                  {season.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Division filter */}
      {divisions && divisions.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-4">
          <Pressable
            onPress={() => setSelectedDivision(undefined)}
            className={`px-4 py-2 rounded-full mr-2 ${!selectedDivision ? 'bg-gold-500' : 'bg-neutral-800'}`}
          >
            <Text className={`text-sm font-medium ${!selectedDivision ? 'text-neutral-950' : 'text-neutral-300'}`}>
              All
            </Text>
          </Pressable>
          {divisions.map((div: any) => (
            <Pressable
              key={div.id}
              onPress={() => setSelectedDivision(div.id)}
              className={`px-4 py-2 rounded-full mr-2 ${selectedDivision === div.id ? 'bg-gold-500' : 'bg-neutral-800'}`}
            >
              <Text className={`text-sm font-medium ${selectedDivision === div.id ? 'text-neutral-950' : 'text-neutral-300'}`}>
                {div.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={games || []}
          renderItem={renderGame}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState title="No games scheduled" description="The schedule will appear once games are created." />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
