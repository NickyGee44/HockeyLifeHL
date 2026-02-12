import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { useGoalieLeaders, useCurrentSeason } from '@hockey-life/data';
import { supabase } from '../../../../../src/lib/supabase/client';
import type { GoalieStats } from '@hockey-life/data';

export default function GoalieStatsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: season } = useCurrentSeason(supabase, leagueId);
  const { data: goalies, isLoading } = useGoalieLeaders(supabase, leagueId, season?.id);

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Goalie Stats</Text>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : !goalies || goalies.length === 0 ? (
        <EmptyState title="No goalie stats" description="Stats will appear after games are played." />
      ) : (
        <ScrollView>
          <View className="flex-row items-center px-5 py-2 border-b border-neutral-800">
            <Text variant="label" className="flex-1">Goalie</Text>
            <Text variant="label" className="w-8 text-center">GP</Text>
            <Text variant="label" className="w-8 text-center">W</Text>
            <Text variant="label" className="w-8 text-center">L</Text>
            <Text variant="label" className="w-12 text-center">SV%</Text>
            <Text variant="label" className="w-10 text-center">GAA</Text>
          </View>

          {goalies.map((goalie: GoalieStats, index: number) => (
            <Pressable
              key={goalie.player_id}
              onPress={() => router.push(`/(tabs)/leagues/${leagueId}/players/${goalie.player_id}` as any)}
              className={`flex-row items-center px-5 py-3 ${index % 2 === 0 ? 'bg-neutral-950' : 'bg-neutral-900/50'}`}
            >
              <View className="flex-row items-center flex-1">
                <Text variant="caption" className="w-6 text-neutral-500">{index + 1}</Text>
                <Avatar uri={goalie.avatar_url} name={goalie.player_name} size="sm" />
                <View className="ml-2 flex-1">
                  <Text variant="body" className="text-neutral-200 text-sm" numberOfLines={1}>
                    {goalie.player_name}
                  </Text>
                  <Text variant="caption" className="text-xs">{goalie.team_name}</Text>
                </View>
              </View>
              <Text variant="body" className="w-8 text-center text-neutral-400 text-sm">{goalie.games_played}</Text>
              <Text variant="body" className="w-8 text-center text-neutral-300 text-sm">{goalie.wins}</Text>
              <Text variant="body" className="w-8 text-center text-neutral-400 text-sm">{goalie.losses}</Text>
              <Text variant="body" className="w-12 text-center text-gold-400 font-semibold text-sm">
                {(goalie.save_percentage * 100).toFixed(1)}
              </Text>
              <Text variant="body" className="w-10 text-center text-neutral-300 text-sm">
                {goalie.goals_against_average.toFixed(2)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
