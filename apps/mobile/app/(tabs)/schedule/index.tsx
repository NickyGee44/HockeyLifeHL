import React, { useState, useMemo } from 'react';
import { View, SectionList, RefreshControl, Pressable } from 'react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Text, GameCard, Badge, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { usePlayerUpcomingGames, usePlayerRecentGames, usePlayerTeams, useMyCheckins } from '@hockey-life/data';
import { useAuth } from '../../../src/lib/auth/provider';
import { supabase } from '../../../src/lib/supabase/client';
import { generateScheduleIcal } from '../../../src/lib/calendar/ical';
import { shareIcalFile } from '../../../src/lib/calendar/export';
import type { UpcomingGame, RecentGame, CheckinStatus } from '@hockey-life/data';

type GameItem = UpcomingGame | RecentGame;

const statusBadge: Record<CheckinStatus, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  confirmed: { label: 'IN', variant: 'success' },
  tentative: { label: 'MAYBE', variant: 'warning' },
  out: { label: 'OUT', variant: 'error' },
};

export default function MyScheduleScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'upcoming' | 'results'>('upcoming');
  const { data: upcoming, isLoading: upcomingLoading, refetch: refetchUpcoming } = usePlayerUpcomingGames(supabase, user?.id, 50);
  const { data: recent, isLoading: recentLoading, refetch: refetchRecent } = usePlayerRecentGames(supabase, user?.id, 50);
  const { data: playerTeams } = usePlayerTeams(supabase, user?.id);
  const [refreshing, setRefreshing] = useState(false);

  // Get the first team ID for checkins lookup
  const firstTeamId = useMemo(() => {
    if (!playerTeams || playerTeams.length === 0) return undefined;
    const pt = playerTeams[0];
    return ((pt as any).team_id ?? (pt as any).id) as string;
  }, [playerTeams]);

  const { data: myCheckins } = useMyCheckins(supabase, user?.id, firstTeamId);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUpcoming(), refetchRecent()]);
    setRefreshing(false);
  };

  const isLoading = tab === 'upcoming' ? upcomingLoading : recentLoading;
  const games = tab === 'upcoming' ? upcoming : recent;

  // Group games by date
  const sections = useMemo(() => {
    if (!games) return [];
    const grouped = new Map<string, GameItem[]>();
    for (const game of games) {
      const dateKey = format(parseISO(game.scheduled_at), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(game);
    }
    return Array.from(grouped.entries()).map(([date, data]) => ({
      title: format(parseISO(date), 'EEEE, MMMM d'),
      data,
    }));
  }, [games]);

  const handleExportAll = async () => {
    if (!upcoming || upcoming.length === 0) return;
    const icalContent = generateScheduleIcal(upcoming, 'My Hockey Schedule');
    await shareIcalFile(icalContent, 'hockey-schedule.ics');
  };

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
        <Text variant="h1">My Schedule</Text>
        {tab === 'upcoming' && upcoming && upcoming.length > 0 && (
          <Pressable onPress={handleExportAll} hitSlop={8}>
            <Ionicons name="download-outline" size={22} color="#D4AF37" />
          </Pressable>
        )}
      </View>

      {/* Tab toggle */}
      <View className="flex-row mx-5 mb-4 bg-neutral-900 rounded-xl p-1">
        <Pressable
          onPress={() => setTab('upcoming')}
          className={`flex-1 py-2 rounded-lg items-center ${tab === 'upcoming' ? 'bg-neutral-800' : ''}`}
        >
          <Text className={`text-sm font-medium ${tab === 'upcoming' ? 'text-gold-400' : 'text-neutral-500'}`}>
            Upcoming
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('results')}
          className={`flex-1 py-2 rounded-lg items-center ${tab === 'results' ? 'bg-neutral-800' : ''}`}
        >
          <Text className={`text-sm font-medium ${tab === 'results' ? 'text-gold-400' : 'text-neutral-500'}`}>
            Results
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View className="px-5 py-2 bg-neutral-950">
              <Text variant="label" className="text-gold-500">{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const checkinStatus = myCheckins?.[item.id] as CheckinStatus | undefined;
            const badge = checkinStatus ? statusBadge[checkinStatus] : null;

            return (
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
                  onPress={() => router.push(`/(tabs)/leagues/${item.league_id}/games/${item.id}` as any)}
                />
                {badge && (
                  <View className="mt-1 flex-row">
                    <Badge label={badge.label} variant={badge.variant} size="sm" />
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title={tab === 'upcoming' ? 'No upcoming games' : 'No results yet'}
              description={
                tab === 'upcoming'
                  ? "You don't have any upcoming games scheduled."
                  : "Your game results will appear here."
              }
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
