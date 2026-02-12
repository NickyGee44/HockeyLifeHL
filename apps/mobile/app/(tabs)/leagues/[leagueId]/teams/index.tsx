import React from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, TeamLogo, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { useTeams } from '@hockey-life/data';
import { supabase } from '../../../../../src/lib/supabase/client';
import type { Team } from '@hockey-life/data';

export default function TeamsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: teams, isLoading } = useTeams(supabase, leagueId);

  const renderTeam = ({ item }: { item: Team }) => (
    <Card
      variant="interactive"
      onPress={() => router.push(`/(tabs)/leagues/${leagueId}/teams/${item.id}` as any)}
      className="mx-5 mb-3 p-4 flex-row items-center"
    >
      <TeamLogo
        uri={item.logo_url || item.logo}
        teamName={item.name}
        size="md"
        teamColor={item.primary_color || item.colors?.split(',')[0]}
      />
      <View className="flex-1 ml-3">
        <Text variant="body" className="text-neutral-200 font-medium">
          {item.name}
        </Text>
        {item.division && (
          <Text variant="caption" className="mt-0.5">
            {item.division.name}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#525252" />
    </Card>
  );

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Teams</Text>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={teams || []}
          renderItem={renderTeam}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState title="No teams" description="Teams will appear once they're created." />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
