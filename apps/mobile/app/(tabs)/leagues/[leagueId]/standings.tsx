import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, TeamLogo, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { useStandings, useCurrentSeason, useDivisions } from '@hockey-life/data';
import { supabase } from '../../../../src/lib/supabase/client';
import type { TeamStanding } from '@hockey-life/data';

export default function StandingsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: season } = useCurrentSeason(supabase, leagueId);
  const { data: divisions } = useDivisions(supabase, leagueId);
  const [selectedDivision, setSelectedDivision] = useState<string | undefined>();

  const { data: standings, isLoading } = useStandings(
    supabase,
    leagueId,
    season?.id,
    selectedDivision,
  );

  return (
    <View className="flex-1 bg-neutral-950">
      {/* Header */}
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Standings</Text>
      </View>

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
          {divisions.map((div) => (
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
      ) : !standings || standings.length === 0 ? (
        <EmptyState title="No standings yet" description="Standings will appear once games are played." />
      ) : (
        <ScrollView className="flex-1">
          {/* Table header */}
          <View className="flex-row items-center px-5 py-2 border-b border-neutral-800">
            <Text variant="label" className="flex-1">Team</Text>
            <Text variant="label" className="w-8 text-center">GP</Text>
            <Text variant="label" className="w-8 text-center">W</Text>
            <Text variant="label" className="w-8 text-center">L</Text>
            <Text variant="label" className="w-8 text-center">T</Text>
            <Text variant="label" className="w-10 text-center">PTS</Text>
          </View>

          {/* Team rows */}
          {standings.map((team: TeamStanding, index: number) => (
            <View
              key={team.team_id}
              className={`flex-row items-center px-5 py-3 ${index % 2 === 0 ? 'bg-neutral-950' : 'bg-neutral-900/50'}`}
            >
              <View className="flex-row items-center flex-1">
                <Text variant="caption" className="w-6 text-neutral-500">
                  {index + 1}
                </Text>
                <TeamLogo uri={team.team_logo} teamName={team.team_name} size="sm" />
                <Text variant="body" className="ml-2 flex-1 text-neutral-200" numberOfLines={1}>
                  {team.team_name}
                </Text>
              </View>
              <Text variant="body" className="w-8 text-center text-neutral-400">{team.games_played}</Text>
              <Text variant="body" className="w-8 text-center text-neutral-300">{team.wins}</Text>
              <Text variant="body" className="w-8 text-center text-neutral-400">{team.losses}</Text>
              <Text variant="body" className="w-8 text-center text-neutral-400">{team.ties}</Text>
              <Text variant="body" className="w-10 text-center text-gold-400 font-semibold">{team.points}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
