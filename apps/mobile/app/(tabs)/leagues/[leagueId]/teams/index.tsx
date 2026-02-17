import React, { useState, useMemo } from 'react';
import { View, FlatList, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, TeamLogo, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { useTeams, useDivisions } from '@hockey-life/data';
import { supabase } from '../../../../../src/lib/supabase/client';
import type { Team } from '@hockey-life/data';

export default function TeamsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: teams, isLoading } = useTeams(supabase, leagueId);
  const { data: divisions } = useDivisions(supabase, leagueId);
  const [selectedDivision, setSelectedDivision] = useState<string | undefined>();

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (!selectedDivision) return teams;
    return teams.filter((t: Team) => t.division?.id === selectedDivision);
  }, [teams, selectedDivision]);

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
          data={filteredTeams}
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
