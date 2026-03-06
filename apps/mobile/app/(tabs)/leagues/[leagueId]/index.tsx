import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, TeamLogo, Card, LoadingScreen } from '@hockey-life/ui-native';
import { useLeague, useCurrentSeason, usePlayerTeams } from '@hockey-life/data';
import { useAuth } from '../../../../src/lib/auth/provider';
import { supabase } from '../../../../src/lib/supabase/client';

const menuItems = [
  { id: 'standings', label: 'Standings', icon: 'podium' as const, route: 'standings' },
  { id: 'teams', label: 'Teams', icon: 'people' as const, route: 'teams' },
  { id: 'schedule', label: 'Schedule', icon: 'calendar' as const, route: 'schedule' },
  { id: 'scores', label: 'Scores', icon: 'football' as const, route: 'scores' },
  { id: 'stats', label: 'Stats', icon: 'stats-chart' as const, route: 'stats' },
  { id: 'news', label: 'News', icon: 'newspaper' as const, route: 'news' },
  { id: 'gallery', label: 'Gallery', icon: 'images' as const, route: 'gallery' },
];

export default function LeagueDetailScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { user } = useAuth();
  const { data: league, isLoading } = useLeague(supabase, leagueId);
  const { data: season } = useCurrentSeason(supabase, leagueId);
  const { data: playerTeams } = usePlayerTeams(supabase, user?.id);

  // Check if user is on a team in THIS league
  const isOnTeamInLeague = useMemo(() => {
    if (!playerTeams || !leagueId) return true; // Default to true (hide join) until loaded
    return playerTeams.some((pt: any) => {
      const lid = pt.team?.league_id ?? pt.league_id;
      return lid === leagueId;
    });
  }, [playerTeams, leagueId]);

  if (isLoading) return <LoadingScreen />;
  if (!league) return <LoadingScreen message="League not found" />;

  const allMenuItems = [
    ...menuItems,
    ...(!isOnTeamInLeague
      ? [{ id: 'join', label: 'Join Team', icon: 'person-add' as const, route: 'join' }]
      : []),
  ];

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-6">
        <Pressable onPress={() => router.back()} className="mb-4" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <View className="flex-row items-center">
          <TeamLogo
            uri={league.logo_url}
            teamName={league.name}
            size="xl"
            teamColor={league.primary_color}
          />
          <View className="flex-1 ml-4">
            <Text variant="h1">{league.name}</Text>
            {season && (
              <Text variant="caption" className="mt-1 text-gold-500">
                {season.name}
              </Text>
            )}
            {league.city && (
              <Text variant="caption" className="mt-0.5">
                {league.city}{league.state ? `, ${league.state}` : ''}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Menu grid */}
      <View className="px-5">
        <View className="flex-row flex-wrap gap-3">
          {allMenuItems.map((item) => (
            <Card
              key={item.id}
              variant="interactive"
              onPress={() =>
                router.push(`/(tabs)/leagues/${leagueId}/${item.route}` as any)
              }
              className="w-[48%] p-4 items-center"
            >
              <Ionicons name={item.icon} size={28} color="#D4AF37" />
              <Text variant="body" className="mt-2 text-neutral-200 font-medium">
                {item.label}
              </Text>
            </Card>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
