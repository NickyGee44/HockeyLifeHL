import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, TeamLogo, Avatar, Badge, LoadingScreen, SectionHeader, EmptyState } from '@hockey-life/ui-native';
import { useTeam, useTeamRoster, useCurrentSeason } from '@hockey-life/data';
import { supabase } from '../../../../../src/lib/supabase/client';
import type { Player } from '@hockey-life/data';

function getPositionLabel(position: Player['position']): string {
  const map: Record<string, string> = {
    C: 'Center', LW: 'Left Wing', RW: 'Right Wing', D: 'Defense', G: 'Goalie',
    Forward: 'Forward', Defense: 'Defense', Goalie: 'Goalie',
  };
  return position ? map[position] || position : '';
}

export default function TeamDetailScreen() {
  const { leagueId, teamId } = useLocalSearchParams<{ leagueId: string; teamId: string }>();
  const { data: team, isLoading } = useTeam(supabase, teamId);
  const { data: season } = useCurrentSeason(supabase, leagueId);
  const { data: roster } = useTeamRoster(supabase, teamId, season?.id);

  if (isLoading) return <LoadingScreen />;
  if (!team) return <LoadingScreen message="Team not found" />;

  const goalies = roster?.filter((p) => p.is_goalie) || [];
  const skaters = roster?.filter((p) => !p.is_goalie) || [];

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-6">
        <Pressable onPress={() => router.back()} className="mb-4" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <View className="flex-row items-center">
          <TeamLogo
            uri={team.logo_url || team.logo}
            teamName={team.name}
            size="xl"
            teamColor={team.primary_color || team.colors?.split(',')[0]}
          />
          <View className="flex-1 ml-4">
            <Text variant="h1">{team.name}</Text>
            {team.division && (
              <Text variant="caption" className="mt-1 text-gold-500">{team.division.name}</Text>
            )}
            <Text variant="caption" className="mt-0.5">
              {roster?.length || 0} players
            </Text>
          </View>
        </View>
      </View>

      {/* Roster */}
      <View className="px-5">
        {skaters.length > 0 && (
          <>
            <SectionHeader title="Skaters" />
            {skaters.map((player) => (
              <Pressable
                key={player.id}
                onPress={() => router.push(`/(tabs)/leagues/${leagueId}/players/${player.player_id}` as any)}
                className="flex-row items-center py-3 border-b border-neutral-800"
              >
                <Text variant="body" className="w-8 text-center text-neutral-500">
                  {player.jersey_number ?? '-'}
                </Text>
                <Avatar uri={player.profile?.avatar_url} name={player.profile?.full_name} size="sm" />
                <View className="flex-1 ml-3">
                  <Text variant="body" className="text-neutral-200">
                    {player.profile?.full_name || 'Unknown'}
                  </Text>
                  <Text variant="caption">{getPositionLabel(player.position)}</Text>
                </View>
                {player.leadership_role && (
                  <Badge
                    label={player.leadership_role === 'captain' ? 'C' : 'A'}
                    variant="gold"
                    size="sm"
                  />
                )}
              </Pressable>
            ))}
          </>
        )}

        {goalies.length > 0 && (
          <>
            <SectionHeader title="Goalies" className="mt-4" />
            {goalies.map((player) => (
              <Pressable
                key={player.id}
                onPress={() => router.push(`/(tabs)/leagues/${leagueId}/players/${player.player_id}` as any)}
                className="flex-row items-center py-3 border-b border-neutral-800"
              >
                <Text variant="body" className="w-8 text-center text-neutral-500">
                  {player.jersey_number ?? '-'}
                </Text>
                <Avatar uri={player.profile?.avatar_url} name={player.profile?.full_name} size="sm" />
                <View className="flex-1 ml-3">
                  <Text variant="body" className="text-neutral-200">
                    {player.profile?.full_name || 'Unknown'}
                  </Text>
                  <Text variant="caption">Goalie</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {(!roster || roster.length === 0) && (
          <EmptyState title="No roster" description="This team doesn't have any players yet." />
        )}
      </View>
    </ScrollView>
  );
}
