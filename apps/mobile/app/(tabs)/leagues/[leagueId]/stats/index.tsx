import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { useStatsLeaders, useCurrentSeason, useSeasons, useDivisions } from '@hockey-life/data';
import { supabase } from '../../../../../src/lib/supabase/client';
import type { PlayerStatsWithAvatar } from '@hockey-life/data';

export default function LeagueStatsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: currentSeason } = useCurrentSeason(supabase, leagueId);
  const { data: seasons } = useSeasons(supabase, leagueId);
  const { data: divisions } = useDivisions(supabase, leagueId);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>();
  const [selectedDivision, setSelectedDivision] = useState<string | undefined>();
  const [tab, setTab] = useState<'skaters' | 'goalies'>('skaters');

  const activeSeasonId = selectedSeasonId || currentSeason?.id;

  const { data: leaders, isLoading } = useStatsLeaders(
    supabase,
    leagueId,
    activeSeasonId,
    { limit: 30, divisionId: selectedDivision },
  );

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-4 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Stats</Text>
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

      {/* Tab toggle */}
      <View className="flex-row mx-5 mb-4 bg-neutral-900 rounded-xl p-1">
        <Pressable
          onPress={() => setTab('skaters')}
          className={`flex-1 py-2 rounded-lg items-center ${tab === 'skaters' ? 'bg-neutral-800' : ''}`}
        >
          <Text className={`text-sm font-medium ${tab === 'skaters' ? 'text-gold-400' : 'text-neutral-500'}`}>
            Skaters
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setTab('goalies');
            router.push(`/(tabs)/leagues/${leagueId}/stats/goalies` as any);
          }}
          className={`flex-1 py-2 rounded-lg items-center ${tab === 'goalies' ? 'bg-neutral-800' : ''}`}
        >
          <Text className={`text-sm font-medium ${tab === 'goalies' ? 'text-gold-400' : 'text-neutral-500'}`}>
            Goalies
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : !leaders || leaders.length === 0 ? (
        <EmptyState title="No stats yet" description="Stats will appear after games are played." />
      ) : (
        <ScrollView>
          {/* Table header */}
          <View className="flex-row items-center px-5 py-2 border-b border-neutral-800">
            <Text variant="label" className="flex-1">Player</Text>
            <Text variant="label" className="w-8 text-center">GP</Text>
            <Text variant="label" className="w-8 text-center">G</Text>
            <Text variant="label" className="w-8 text-center">A</Text>
            <Text variant="label" className="w-10 text-center">PTS</Text>
            <Text variant="label" className="w-8 text-center">PIM</Text>
          </View>

          {leaders.map((player: PlayerStatsWithAvatar, index: number) => (
            <Pressable
              key={player.player_id}
              onPress={() => router.push(`/(tabs)/leagues/${leagueId}/players/${player.player_id}` as any)}
              className={`flex-row items-center px-5 py-3 ${index % 2 === 0 ? 'bg-neutral-950' : 'bg-neutral-900/50'}`}
            >
              <View className="flex-row items-center flex-1">
                <Text variant="caption" className="w-6 text-neutral-500">{index + 1}</Text>
                <Avatar uri={player.avatar_url} name={player.player_name} size="sm" />
                <View className="ml-2 flex-1">
                  <Text variant="body" className="text-neutral-200 text-sm" numberOfLines={1}>
                    {player.player_name}
                  </Text>
                  <Text variant="caption" className="text-xs">{player.team_name}</Text>
                </View>
              </View>
              <Text variant="body" className="w-8 text-center text-neutral-400 text-sm">{player.games_played}</Text>
              <Text variant="body" className="w-8 text-center text-neutral-300 text-sm">{player.goals}</Text>
              <Text variant="body" className="w-8 text-center text-neutral-300 text-sm">{player.assists}</Text>
              <Text variant="body" className="w-10 text-center text-gold-400 font-semibold text-sm">{player.points}</Text>
              <Text variant="body" className="w-8 text-center text-neutral-500 text-sm">{player.penalty_minutes}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
