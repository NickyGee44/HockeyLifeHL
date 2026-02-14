import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { useStatsLeaders, useCurrentSeason } from '@hockey-life/data';
import { supabase } from '../../../../../src/lib/supabase/client';
import type { PlayerStatsWithAvatar } from '@hockey-life/data';

export default function LeagueStatsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: season } = useCurrentSeason(supabase, leagueId);
  const { data: leaders, isLoading } = useStatsLeaders(supabase, leagueId, season?.id, { limit: 30 });
  const [tab, setTab] = useState<'skaters' | 'goalies'>('skaters');

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Stats</Text>
      </View>

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
